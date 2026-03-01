// Edge Function para procesar retroalimentación del tutor automáticamente
// Se puede ejecutar manualmente, programar con cron, o llamar desde servicios externos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessResult {
  processed: number;
  chunksCreated: number;
  errors: number;
}

/**
 * Genera embedding usando Gemini API
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
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
    throw new Error("No se pudo generar embedding - respuesta inválida");
  }

  return embedding;
}

/**
 * Divide texto en chunks
 */
function splitIntoChunks(text: string, maxChars: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length > 0 && currentChunk.length + paragraph.length > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
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

/**
 * Calcula score de calidad
 */
function calculateQualityScore(response: any): number {
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

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!geminiApiKey) {
      throw new Error("Falta variable de entorno: GEMINI_API_KEY");
    }

    // Crear cliente de Supabase con service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener parámetros opcionales
    const url = new URL(req.url);
    const courseId = url.searchParams.get("course_id");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    console.log("🔄 Procesando retroalimentación...", { courseId, limit });

    // 1. Obtener respuestas pendientes
    let query = supabase
      .from("tutor_general_knowledge_responses")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (courseId) {
      query = query.eq("course_id", parseInt(courseId, 10));
    }

    const { data: pendingResponses, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Error obteniendo respuestas: ${fetchError.message}`);
    }

    if (!pendingResponses || pendingResponses.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          chunksCreated: 0,
          errors: 0,
          message: "No hay respuestas pendientes",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Encontradas ${pendingResponses.length} respuestas pendientes`);

    // 2. Filtrar por calidad y procesar
    let totalChunksCreated = 0;
    const processedIds: string[] = [];
    const errors: string[] = [];

    for (const response of pendingResponses) {
      try {
        const qualityScore = calculateQualityScore(response);
        if (qualityScore < 0.4) {
          // Marcar como rechazada si calidad es muy baja
          await supabase
            .from("tutor_general_knowledge_responses")
            .update({ status: "rejected", processed_at: new Date().toISOString() })
            .eq("id", response.id);
          continue;
        }

        const chunks = splitIntoChunks(response.answer);
        let chunksSuccess = true;

        for (let j = 0; j < chunks.length; j++) {
          const chunk = chunks[j];
          try {
            const embedding = await generateEmbedding(chunk, geminiApiKey);

            const { error: insertError } = await supabase.from("course_content_chunks").insert({
              course_id: response.course_id,
              content: chunk,
              embedding: embedding,
              metadata: {
                source: "tutor_general_knowledge",
                original_question: response.question,
                original_response_id: response.id,
                quality_score: qualityScore,
                chunk_index: j,
                total_chunks: chunks.length,
                created_from: "feedback_loop",
                processed_at: new Date().toISOString(),
              },
            });

            if (insertError) {
              console.error(`Error insertando chunk:`, insertError);
              chunksSuccess = false;
              break;
            }

            totalChunksCreated++;
          } catch (chunkError) {
            console.error(`Error procesando chunk:`, chunkError);
            chunksSuccess = false;
            break;
          }
        }

        if (chunksSuccess) {
          await supabase
            .from("tutor_general_knowledge_responses")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
              quality_score: qualityScore,
            })
            .eq("id", response.id);
          processedIds.push(response.id);
        } else {
          errors.push(response.id);
        }
      } catch (responseError) {
        console.error(`Error procesando respuesta:`, responseError);
        errors.push(response.id);
      }
    }

    const result: ProcessResult = {
      processed: processedIds.length,
      chunksCreated: totalChunksCreated,
      errors: errors.length,
    };

    console.log("✅ Procesamiento completado:", result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        message: `Procesadas ${result.processed} respuestas, creados ${result.chunksCreated} chunks`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error en procesamiento:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
