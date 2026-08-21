// services/tutorTrackingService.ts
// Servicio para persistir interacciones del Tutor IA en la base de datos

import { supabase } from '@/lib/supabase';
import { saveGeneralKnowledgeResponse } from './tutorFeedbackService';

export interface TutorInteraction {
  id?: string;
  conversation_id?: string;
  student_id: string;
  course_id: number | string;
  question: string;
  answer?: string;
  tokens_used?: number;
  cost?: number;
  model?: string;
  response_time_ms?: number;
  satisfaction_rating?: number;
  created_at?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
}

/**
 * Registra una interacción del tutor en la base de datos
 */
export async function trackTutorInteraction(
  studentId: string,
  courseId: string | number,
  question: string,
  answer: string,
  tokens: TokenUsage,
  responseTime: number,
  conversationId?: string,
  ragConfidence?: number,
  responseSource?: 'RAG' | 'GENERAL' | 'HYBRID'
): Promise<TutorInteraction> {
  try {
    // Convertir courseId a número si es string (courses.id es INTEGER)
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    const { data, error } = await supabase
      .from('tutor_interactions')
      .insert({
        student_id: studentId,
        course_id: courseIdNum,
        question,
        answer,
        tokens_used: tokens.totalTokens,
        cost: tokens.cost,
        model: tokens.model,
        response_time_ms: responseTime,
        conversation_id: conversationId,
      })
      .select()
      .single();

    if (error) {
      console.warn('⚠️ Error tracking tutor interaction (no se interrumpe el flujo):', error);
      // Retornar un objeto parcial en lugar de lanzar error
      return {
        student_id: studentId,
        course_id: courseIdNum,
        question,
        answer,
        tokens_used: tokens.totalTokens,
        cost: tokens.cost,
        model: tokens.model,
        response_time_ms: responseTime,
        conversation_id: conversationId,
      } as TutorInteraction;
    }

    console.log('✅ Tutor interaction tracked:', {
      id: data.id,
      studentId,
      courseId,
      tokensUsed: tokens.totalTokens,
      cost: tokens.cost,
    });

    // NUEVO: Guardar para retroalimentación si es conocimiento general
    if (responseSource === 'GENERAL' || (ragConfidence !== undefined && ragConfidence < 0.5)) {
      // Guardar de forma asíncrona (no bloquear flujo principal)
      saveGeneralKnowledgeResponse(
        studentId,
        courseIdNum,
        question,
        answer,
        tokens,
        ragConfidence || 0.3,
        data.id
      ).catch((error) => {
        console.warn('⚠️ Error saving feedback (no crítico):', error);
      });
    }

    return data;
  } catch (error) {
    console.warn('⚠️ Failed to track tutor interaction (no se interrumpe el flujo):', error);
    // No lanzar error para no interrumpir el flujo del usuario
    // Retornar un objeto parcial en lugar de lanzar error
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    return {
      student_id: studentId,
      course_id: courseIdNum,
      question,
      answer,
      tokens_used: tokens.totalTokens,
      cost: tokens.cost,
      model: tokens.model,
      response_time_ms: responseTime,
      conversation_id: conversationId,
    } as TutorInteraction;
  }
}

/**
 * Actualiza la calificación automática de una interacción
 */
export async function updateTutorInteractionRating(
  interactionId: string,
  satisfactionRating: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tutor_interactions')
      .update({ satisfaction_rating: satisfactionRating })
      .eq('id', interactionId);

    if (error) {
      console.warn('⚠️ Error actualizando satisfaction_rating:', error);
      return false;
    }

    console.log('✅ Satisfaction rating actualizado:', {
      interactionId,
      satisfactionRating,
    });

    return true;
  } catch (error) {
    console.error('Error in updateTutorInteractionRating:', error);
    return false;
  }
}

/**
 * Obtiene las interacciones de un estudiante en un curso
 */
export async function getStudentInteractions(
  studentId: string,
  courseId: string | number,
  limit: number = 50
): Promise<TutorInteraction[]> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    const { data, error } = await supabase
      .from('tutor_interactions')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseIdNum)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student interactions:', error);
    return [];
  }
}

/**
 * Obtiene todas las interacciones de un curso (para docentes)
 */
export async function getCourseInteractions(
  courseId: string | number,
  limit: number = 100
): Promise<TutorInteraction[]> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    const { data, error } = await supabase
      .from('tutor_interactions')
      .select('*')
      .eq('course_id', courseIdNum)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching course interactions:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas básicas de interacciones
 */
export async function getInteractionStats(
  courseId?: string | number,
  studentId?: string
): Promise<{
  totalInteractions: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  uniqueStudents: number;
}> {
  try {
    let query = supabase
      .from('tutor_interactions')
      .select('tokens_used, cost, response_time_ms, student_id');

    if (courseId) {
      const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
      query = query.eq('course_id', courseIdNum);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const interactions = data || [];
    const uniqueStudents = new Set(interactions.map((i: any) => i.student_id)).size;

    const stats = {
      totalInteractions: interactions.length,
      totalTokens: interactions.reduce((sum: number, i: any) => sum + (i.tokens_used || 0), 0),
      totalCost: interactions.reduce((sum: number, i: any) => sum + (parseFloat(i.cost) || 0), 0),
      averageResponseTime:
        interactions.length > 0
          ? interactions.reduce((sum: number, i: any) => sum + (i.response_time_ms || 0), 0) /
            interactions.length
          : 0,
      uniqueStudents,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching interaction stats:', error);
    return {
      totalInteractions: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      uniqueStudents: 0,
    };
  }
}
