// services/tutorFeedbackService.ts
// Servicio para gestionar respuestas de conocimiento general para retroalimentación RAG

import { supabase } from '@/lib/supabase';

export interface GeneralKnowledgeResponse {
  id?: string;
  student_id: string;
  course_id: number;
  question: string;
  answer: string;
  tokens_used?: number;
  cost?: number;
  model?: string;
  rag_confidence?: number;
  status?: 'pending' | 'processing' | 'processed' | 'rejected' | 'deprecated';
  quality_score?: number;
  usage_count?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  processed_at?: string;
  created_by_interaction_id?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
}

/**
 * Guarda una respuesta de conocimiento general para retroalimentación
 * Se llama cuando una pregunta se responde usando conocimiento general de Gemini
 */
export async function saveGeneralKnowledgeResponse(
  studentId: string,
  courseId: number,
  question: string,
  answer: string,
  tokens: TokenUsage,
  ragConfidence: number,
  interactionId?: string
): Promise<GeneralKnowledgeResponse | null> {
  try {
    // Validar que la respuesta tenga contenido válido
    if (!question || !answer || question.trim().length === 0 || answer.trim().length === 0) {
      console.warn('⚠️ Respuesta vacía, no se guarda para retroalimentación');
      return null;
    }

    // Validar longitud mínima/máxima
    if (answer.length < 50) {
      console.warn('⚠️ Respuesta muy corta, no se guarda para retroalimentación');
      return null;
    }

    if (answer.length > 10000) {
      console.warn('⚠️ Respuesta muy larga, truncando para retroalimentación');
      answer = answer.substring(0, 10000);
    }

    const { data, error } = await supabase
      .from('tutor_general_knowledge_responses')
      .insert({
        student_id: studentId,
        course_id: courseId,
        question: question.trim(),
        answer: answer.trim(),
        tokens_used: tokens.totalTokens,
        cost: tokens.cost,
        model: tokens.model,
        rag_confidence: ragConfidence,
        status: 'pending',
        created_by_interaction_id: interactionId,
      })
      .select()
      .single();

    if (error) {
      console.warn('⚠️ Error saving general knowledge response (no se interrumpe el flujo):', error);
      return null;
    }

    console.log('✅ General knowledge response saved for feedback:', {
      id: data.id,
      courseId,
      questionLength: question.length,
      answerLength: answer.length,
    });

    return data;
  } catch (error) {
    console.warn('⚠️ Failed to save general knowledge response (no se interrumpe el flujo):', error);
    return null;
  }
}

/**
 * Obtiene respuestas pendientes de procesamiento
 */
export async function getPendingFeedbackResponses(
  courseId?: number,
  limit: number = 100
): Promise<GeneralKnowledgeResponse[]> {
  try {
    let query = supabase
      .from('tutor_general_knowledge_responses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending feedback responses:', error);
    return [];
  }
}

/**
 * Marca respuestas como procesadas
 */
export async function markFeedbackResponsesProcessed(
  responseIds: string[],
  qualityScores?: number[]
): Promise<number> {
  try {
    if (responseIds.length === 0) return 0;

    // Usar función de base de datos para actualizar
    const { data, error } = await supabase.rpc('mark_feedback_responses_processed', {
      p_response_ids: responseIds,
      p_quality_scores: qualityScores || null,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error marking feedback responses as processed:', error);
    // Fallback: actualizar directamente
    try {
      const { error: updateError } = await supabase
        .from('tutor_general_knowledge_responses')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .in('id', responseIds);

      if (updateError) throw updateError;
      return responseIds.length;
    } catch (fallbackError) {
      console.error('Error in fallback update:', fallbackError);
      return 0;
    }
  }
}

/**
 * Obtiene estadísticas de retroalimentación
 */
export async function getFeedbackStats(
  courseId?: number
): Promise<{
  total: number;
  pending: number;
  processed: number;
  rejected: number;
  avgQualityScore: number;
}> {
  try {
    let query = supabase
      .from('tutor_general_knowledge_responses')
      .select('status, quality_score');

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const responses = data || [];
    const stats = {
      total: responses.length,
      pending: responses.filter((r: any) => r.status === 'pending').length,
      processed: responses.filter((r: any) => r.status === 'processed').length,
      rejected: responses.filter((r: any) => r.status === 'rejected').length,
      avgQualityScore: 0,
    };

    const processedResponses = responses.filter(
      (r: any) => r.status === 'processed' && r.quality_score
    );
    if (processedResponses.length > 0) {
      stats.avgQualityScore =
        processedResponses.reduce(
          (sum: number, r: any) => sum + (r.quality_score || 0),
          0
        ) / processedResponses.length;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    return {
      total: 0,
      pending: 0,
      processed: 0,
      rejected: 0,
      avgQualityScore: 0,
    };
  }
}

/**
 * Rechaza una respuesta (no se procesará)
 */
export async function rejectFeedbackResponse(responseId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tutor_general_knowledge_responses')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rejecting feedback response:', error);
    return false;
  }
}
