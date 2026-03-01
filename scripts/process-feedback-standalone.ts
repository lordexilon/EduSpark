#!/usr/bin/env node
/**
 * Script STANDALONE para procesar respuestas de conocimiento general
 * Versión que funciona en Node.js sin depender de Vite
 * 
 * Uso:
 *   npm run process-feedback
 *   O: npx tsx scripts/process-feedback-standalone.ts
 * 
 * Opciones:
 *   --course-id <id>  - Procesar solo un curso específico
 *   --limit <number>  - Límite de respuestas a procesar (default: 50)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configurar Supabase (usando process.env en lugar de import.meta.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co';

// Preferir service_role key para scripts batch (bypass RLS)
// Si no está disponible, usar anon key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

if (!supabaseUrl) {
  console.error('❌ Error: Falta variable de entorno VITE_SUPABASE_URL');
  process.exit(1);
}

// Usar service_role key si está disponible, sino usar anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (supabaseServiceKey) {
  console.log('🔑 Usando SERVICE_ROLE_KEY (bypass RLS)');
} else {
  console.log('⚠️  Usando ANON_KEY (sujeto a RLS - puede no encontrar todas las respuestas)');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Función para generar embedding (copiada de geminiService)
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY debe estar configurado');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const embedding = result?.embedding?.values;

  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('No se pudo generar embedding - respuesta inválida');
  }

  return embedding;
}

// Tipos
interface GeneralKnowledgeResponse {
  id: string;
  student_id: string;
  course_id: number;
  question: string;
  answer: string;
  tokens_used?: number;
  cost?: number;
  model?: string;
  rag_confidence?: number;
  status?: string;
  quality_score?: number;
  created_at?: string;
}

// Funciones auxiliares
function splitIntoChunks(text: string, maxChars: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length > 0 && currentChunk.length + paragraph.length > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return chunks;
}

function calculateQualityScore(response: GeneralKnowledgeResponse): number {
  let score = 0.5;
  const answerLength = response.answer.length;
  
  if (answerLength >= 200 && answerLength <= 2000) {
    score += 0.2;
  } else if (answerLength > 2000) {
    score += 0.1;
  } else {
    score -= 0.1;
  }

  if (response.rag_confidence !== undefined && response.rag_confidence < 0.5) {
    score += 0.2;
  }

  const paragraphCount = response.answer.split(/\n\n+/).length;
  if (paragraphCount >= 2) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

function isDuplicate(response1: GeneralKnowledgeResponse, response2: GeneralKnowledgeResponse): boolean {
  const question1 = response1.question.toLowerCase().trim();
  const question2 = response2.question.toLowerCase().trim();
  
  if (question1 === question2) return true;
  
  const words1 = new Set(response1.answer.toLowerCase().split(/\s+/));
  const words2 = new Set(response2.answer.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const similarity = intersection.size / union.size;
  
  return similarity > 0.9;
}

function deduplicateResponses(responses: GeneralKnowledgeResponse[]): GeneralKnowledgeResponse[] {
  const unique: GeneralKnowledgeResponse[] = [];
  
  for (const response of responses) {
    const isDup = unique.some((existing) => isDuplicate(response, existing));
    if (!isDup) {
      unique.push(response);
    }
  }
  
  return unique;
}

// Función principal de procesamiento
async function processPendingFeedbackResponses(
  courseId?: number,
  limit: number = 50
): Promise<{
  processed: number;
  chunksCreated: number;
  errors: number;
}> {
  try {
    console.log('🔄 Iniciando procesamiento de retroalimentación...');
    
    // 1. Obtener respuestas pendientes
    let query = supabase
      .from('tutor_general_knowledge_responses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: pendingResponses, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error obteniendo respuestas:', fetchError);
      throw new Error(`Error obteniendo respuestas pendientes: ${fetchError.message}`);
    }

    console.log(`🔍 Debug: Respuestas encontradas: ${pendingResponses?.length || 0}`);

    if (!pendingResponses || pendingResponses.length === 0) {
      console.log('✅ No hay respuestas pendientes para procesar');
      return { processed: 0, chunksCreated: 0, errors: 0 };
    }

    console.log(`📋 Encontradas ${pendingResponses.length} respuestas pendientes`);

    // 2. Deduplicar
    const uniqueResponses = deduplicateResponses(pendingResponses as GeneralKnowledgeResponse[]);
    console.log(`🔍 Después de deduplicación: ${uniqueResponses.length} respuestas únicas`);

    // 3. Filtrar por calidad
    const processedResponses: GeneralKnowledgeResponse[] = [];
    const qualityScores: number[] = [];

    for (const response of uniqueResponses) {
      const qualityScore = calculateQualityScore(response);
      if (qualityScore >= 0.4) {
        processedResponses.push(response);
        qualityScores.push(qualityScore);
      }
    }

    console.log(`✅ ${processedResponses.length} respuestas pasan el filtro de calidad`);

    if (processedResponses.length === 0) {
      // Marcar todas como rechazadas
      const ids = pendingResponses.map((r: any) => r.id);
      await supabase
        .from('tutor_general_knowledge_responses')
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .in('id', ids);
      return { processed: pendingResponses.length, chunksCreated: 0, errors: 0 };
    }

    // 4. Procesar cada respuesta
    let totalChunksCreated = 0;
    const processedIds: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < processedResponses.length; i++) {
      const response = processedResponses[i];

      try {
        const chunks = splitIntoChunks(response.answer);

        for (let j = 0; j < chunks.length; j++) {
          const chunk = chunks[j];

          try {
            const embedding = await generateEmbedding(chunk);

            const { error: insertError } = await supabase
              .from('course_content_chunks')
              .insert({
                course_id: response.course_id,
                content: chunk,
                embedding: embedding,
                metadata: {
                  source: 'tutor_general_knowledge',
                  original_question: response.question,
                  original_response_id: response.id,
                  interaction_id: response.id,
                  quality_score: qualityScores[i],
                  chunk_index: j,
                  total_chunks: chunks.length,
                  created_from: 'feedback_loop',
                  processed_at: new Date().toISOString(),
                },
              });

            if (insertError) {
              console.error(`❌ Error insertando chunk ${j + 1}/${chunks.length}:`, insertError);
              errors.push(response.id);
              break;
            }

            totalChunksCreated++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (chunkError) {
            console.error(`❌ Error procesando chunk ${j + 1}/${chunks.length}:`, chunkError);
            errors.push(response.id);
            break;
          }
        }

        if (!errors.includes(response.id)) {
          processedIds.push(response.id);
        }
      } catch (responseError) {
        console.error(`❌ Error procesando respuesta ${response.id}:`, responseError);
        errors.push(response.id);
      }
    }

    // 5. Marcar como procesadas
    if (processedIds.length > 0) {
      const scores = processedIds.map(
        (id) => qualityScores[processedResponses.findIndex((r) => r.id === id)]
      );
      
      for (let i = 0; i < processedIds.length; i++) {
        await supabase
          .from('tutor_general_knowledge_responses')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString(),
            quality_score: scores[i],
          })
          .eq('id', processedIds[i]);
      }
      console.log(`✅ ${processedIds.length} respuestas marcadas como procesadas`);
    }

    console.log(
      `✅ Procesamiento completado: ${processedIds.length} procesadas, ${totalChunksCreated} chunks creados, ${errors.length} errores`
    );

    return {
      processed: processedIds.length,
      chunksCreated: totalChunksCreated,
      errors: errors.length,
    };
  } catch (error) {
    console.error('❌ Error en procesamiento batch:', error);
    throw error;
  }
}

// Función para procesamiento batch completo
async function runFeedbackBatchProcessing(
  courseId?: number
): Promise<{
  processed: number;
  chunksCreated: number;
  errors: number;
}> {
  let totalProcessed = 0;
  let totalChunksCreated = 0;
  let totalErrors = 0;

  let batchResult = await processPendingFeedbackResponses(courseId, 50);

  while (batchResult.processed > 0) {
    totalProcessed += batchResult.processed;
    totalChunksCreated += batchResult.chunksCreated;
    totalErrors += batchResult.errors;

    if (batchResult.processed < 50) {
      break;
    }

    batchResult = await processPendingFeedbackResponses(courseId, 50);
  }

  return {
    processed: totalProcessed,
    chunksCreated: totalChunksCreated,
    errors: totalErrors,
  };
}

// Parsear argumentos
const args = process.argv.slice(2);
let courseId: number | undefined;
let limit: number = 50;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--course-id' && args[i + 1]) {
    courseId = parseInt(args[i + 1], 10);
    if (isNaN(courseId)) {
      console.error('❌ Error: --course-id debe ser un número válido');
      process.exit(1);
    }
  }
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    if (isNaN(limit) || limit < 1) {
      console.error('❌ Error: --limit debe ser un número mayor a 0');
      process.exit(1);
    }
  }
}

// Ejecutar
async function main() {
  try {
    console.log('🚀 Iniciando procesamiento batch de retroalimentación...');
    console.log('='.repeat(60));
    
    if (courseId) {
      console.log(`📚 Procesando solo curso ID: ${courseId}`);
    } else {
      console.log('📚 Procesando todos los cursos');
    }
    console.log(`📊 Límite por lote: ${limit}`);
    console.log('');

    const result = await runFeedbackBatchProcessing(courseId);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Procesamiento completado:');
    console.log(`   📝 Respuestas procesadas: ${result.processed}`);
    console.log(`   📦 Chunks creados: ${result.chunksCreated}`);
    console.log(`   ⚠️  Errores: ${result.errors}`);
    console.log('');

    if (result.processed > 0) {
      console.log(`🎉 ¡Excelente! Se procesaron ${result.processed} respuestas y se crearon ${result.chunksCreated} chunks RAG.`);
    } else {
      console.log('ℹ️  No había respuestas pendientes para procesar.');
    }

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error en procesamiento:', error);
    console.error('');

    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }

    process.exit(1);
  }
}

main();
