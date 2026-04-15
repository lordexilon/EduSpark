// services/feedbackProcessingService.ts
// Servicio para procesar respuestas de conocimiento general y convertirlas en chunks RAG

import { supabase } from '@/lib/supabase';
import {
  getPendingFeedbackResponses,
  markFeedbackResponsesProcessed,
  type GeneralKnowledgeResponse,
} from './tutorFeedbackService';

// Importar función de generación de embeddings desde workers
import { generateEmbedding } from '@/workers/file-processing-worker/geminiService';

/**
 * Divide una respuesta en chunks apropiados para RAG
 */
function splitIntoChunks(text: string, maxChars: number = 2000): string[] {
  const chunks: string[] = [];
  
  // Dividir por párrafos primero
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Si agregar este párrafo excedería el límite, guardar chunk actual
    if (currentChunk.length > 0 && currentChunk.length + paragraph.length > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Agregar último chunk si no está vacío
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Si no se dividió (texto muy corto), devolver como un solo chunk
  if (chunks.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }
  
  return chunks;
}

/**
 * Calcula un score de calidad para una respuesta
 */
function calculateQualityScore(response: GeneralKnowledgeResponse): number {
  let score = 0.5; // Score base
  
  // Puntuación por longitud (respuestas más largas suelen ser mejores)
  const answerLength = response.answer.length;
  if (answerLength >= 200 && answerLength <= 2000) {
    score += 0.2;
  } else if (answerLength > 2000) {
    score += 0.1; // Muy largas pueden ser peores
  } else {
    score -= 0.1; // Muy cortas son peores
  }
  
  // Puntuación por confianza RAG (si fue baja, puede ser útil agregar)
  if (response.rag_confidence !== undefined && response.rag_confidence < 0.5) {
    score += 0.2; // Más útil si RAG no encontró nada
  }
  
  // Puntuación por estructura (párrafos, puntos, etc.)
  const paragraphCount = response.answer.split(/\n\n+/).length;
  if (paragraphCount >= 2) {
    score += 0.1;
  }
  
  // Limitar entre 0 y 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Verifica si una respuesta es similar a otra (básico, usando longitud y palabras clave)
 * TODO: Implementar deduplicación más sofisticada usando embeddings
 */
function isDuplicate(
  response1: GeneralKnowledgeResponse,
  response2: GeneralKnowledgeResponse
): boolean {
  // Comparación básica: misma pregunta o respuesta muy similar
  const question1 = response1.question.toLowerCase().trim();
  const question2 = response2.question.toLowerCase().trim();
  
  // Si las preguntas son idénticas, es duplicado
  if (question1 === question2) {
    return true;
  }
  
  // Si las respuestas son muy similares (>90% de palabras comunes)
  const words1 = new Set(response1.answer.toLowerCase().split(/\s+/));
  const words2 = new Set(response2.answer.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const similarity = intersection.size / union.size;
  
  return similarity > 0.9;
}

/**
 * Filtra respuestas duplicadas
 */
function deduplicateResponses(
  responses: GeneralKnowledgeResponse[]
): GeneralKnowledgeResponse[] {
  const unique: GeneralKnowledgeResponse[] = [];
  
  for (const response of responses) {
    const isDup = unique.some((existing) => isDuplicate(response, existing));
    if (!isDup) {
      unique.push(response);
    }
  }
  
  return unique;
}

/**
 * Procesa respuestas pendientes y las convierte en chunks RAG
 */
export async function processPendingFeedbackResponses(
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
    const pendingResponses = await getPendingFeedbackResponses(courseId, limit);
    
    if (pendingResponses.length === 0) {
      console.log('✅ No hay respuestas pendientes para procesar');
      return { processed: 0, chunksCreated: 0, errors: 0 };
    }
    
    console.log(`📋 Encontradas ${pendingResponses.length} respuestas pendientes`);
    
    // 2. Deduplicar respuestas
    const uniqueResponses = deduplicateResponses(pendingResponses);
    console.log(`🔍 Después de deduplicación: ${uniqueResponses.length} respuestas únicas`);
    
    // 3. Filtrar por calidad mínima y calcular scores
    const processedResponses: GeneralKnowledgeResponse[] = [];
    const qualityScores: number[] = [];
    
    for (const response of uniqueResponses) {
      const qualityScore = calculateQualityScore(response);
      
      // Solo procesar si calidad >= 0.4
      if (qualityScore >= 0.4) {
        processedResponses.push(response);
        qualityScores.push(qualityScore);
      }
    }
    
    console.log(`✅ ${processedResponses.length} respuestas pasan el filtro de calidad`);
    
    if (processedResponses.length === 0) {
      // Marcar todas como rechazadas
      await markFeedbackResponsesProcessed(
        pendingResponses.map((r) => r.id!),
        pendingResponses.map(() => 0)
      );
      return { processed: pendingResponses.length, chunksCreated: 0, errors: 0 };
    }
    
    // 4. Procesar cada respuesta: dividir en chunks y generar embeddings
    let totalChunksCreated = 0;
    const processedIds: string[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < processedResponses.length; i++) {
      const response = processedResponses[i];
      
      try {
        // Dividir respuesta en chunks
        const chunks = splitIntoChunks(response.answer);
        
        // Generar embeddings y guardar chunks
        for (let j = 0; j < chunks.length; j++) {
          const chunk = chunks[j];
          
          try {
            // Generar embedding
            const embedding = await generateEmbedding(chunk);
            
            // Guardar chunk en course_content_chunks
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
                  interaction_id: response.created_by_interaction_id,
                  quality_score: qualityScores[i],
                  chunk_index: j,
                  total_chunks: chunks.length,
                  created_from: 'feedback_loop',
                  processed_at: new Date().toISOString(),
                },
              });
            
            if (insertError) {
              console.error(`❌ Error insertando chunk ${j + 1}/${chunks.length}:`, insertError);
              errors.push(response.id!);
              break; // Salir del loop de chunks para esta respuesta
            }
            
            totalChunksCreated++;
            
            // Pequeño delay para no sobrecargar la API
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (chunkError) {
            console.error(`❌ Error procesando chunk ${j + 1}/${chunks.length}:`, chunkError);
            errors.push(response.id!);
            break;
          }
        }
        
        // Si todos los chunks se guardaron exitosamente, marcar como procesado
        if (!errors.includes(response.id!)) {
          processedIds.push(response.id!);
        }
      } catch (responseError) {
        console.error(`❌ Error procesando respuesta ${response.id}:`, responseError);
        errors.push(response.id!);
      }
    }
    
    // 5. Marcar respuestas como procesadas
    if (processedIds.length > 0) {
      const scores = processedIds.map(
        (id) => qualityScores[processedResponses.findIndex((r) => r.id === id)]
      );
      await markFeedbackResponsesProcessed(processedIds, scores);
      console.log(`✅ ${processedIds.length} respuestas marcadas como procesadas`);
    }
    
    // 6. Marcar errores como rechazadas (opcional)
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} respuestas tuvieron errores`);
      // TODO: Opcionalmente marcar como rejected
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

/**
 * Ejecuta procesamiento batch completo (para usar en cron job)
 */
export async function runFeedbackBatchProcessing(
  courseId?: number
): Promise<{
  processed: number;
  chunksCreated: number;
  errors: number;
}> {
  console.log('🚀 Ejecutando procesamiento batch de retroalimentación...');
  
  // Procesar en lotes de 50 para no sobrecargar
  let totalProcessed = 0;
  let totalChunksCreated = 0;
  let totalErrors = 0;
  
  let batchResult = await processPendingFeedbackResponses(courseId, 50);
  
  while (batchResult.processed > 0) {
    totalProcessed += batchResult.processed;
    totalChunksCreated += batchResult.chunksCreated;
    totalErrors += batchResult.errors;
    
    // Si procesó menos de 50, no hay más para procesar
    if (batchResult.processed < 50) {
      break;
    }
    
    // Procesar siguiente lote
    batchResult = await processPendingFeedbackResponses(courseId, 50);
  }
  
  console.log(
    `✅ Procesamiento batch completado: ${totalProcessed} procesadas, ${totalChunksCreated} chunks creados, ${totalErrors} errores`
  );
  
  return {
    processed: totalProcessed,
    chunksCreated: totalChunksCreated,
    errors: totalErrors,
  };
}
