// services/tutorRatingService.ts
// Servicio para manejar calificaciones (ratings) de mensajes del tutor

import { supabase } from '@/lib/supabase';

export interface TutorMessageRating {
  id?: string;
  message_id: string;
  student_id: string;
  rating: boolean; // true = thumbs up (👍), false = thumbs down (👎)
  created_at?: string;
  updated_at?: string;
}

export interface RatingStats {
  total_ratings: number;
  thumbs_up_count: number;
  thumbs_down_count: number;
  average_rating: number; // Porcentaje de thumbs up
}

/**
 * Califica un mensaje del tutor (pulgar arriba o abajo)
 * Si ya existe un rating, lo actualiza
 */
export async function rateMessage(
  messageId: string,
  studentId: string,
  rating: boolean
): Promise<TutorMessageRating | null> {
  try {
    // Validar que messageId sea un UUID válido antes de insertar
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      console.warn('rateMessage: messageId no es un UUID válido, no se puede guardar el rating:', messageId);
      return null; // No lanzar error, simplemente retornar null si no es UUID válido
    }

    // Usar upsert para insertar o actualizar
    const { data, error } = await supabase
      .from('tutor_message_ratings')
      .upsert(
        {
          message_id: messageId,
          student_id: studentId,
          rating,
        },
        {
          onConflict: 'message_id,student_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error rating message:', error);
      return null;
    }

    console.log('✅ Message rated:', {
      messageId,
      studentId,
      rating: rating ? 'thumbs up' : 'thumbs down',
    });

    return data;
  } catch (error) {
    console.error('Error in rateMessage:', error);
    return null;
  }
}

/**
 * Obtiene el rating actual de un estudiante para un mensaje específico
 */
export async function getMessageRating(
  messageId: string,
  studentId: string
): Promise<boolean | null> {
  try {
    // Validar que messageId sea un UUID válido antes de consultar
    // Los IDs temporales basados en timestamps no son UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      // El mensaje aún no tiene un UUID real (es un ID temporal)
      return null;
    }

    const { data, error } = await supabase
      .from('tutor_message_ratings')
      .select('rating')
      .eq('message_id', messageId)
      .eq('student_id', studentId)
      .single();

    if (error) {
      // Si no existe, retornar null (no calificado aún)
      if (error.code === 'PGRST116') {
        return null;
      }
      // Error 22P02 significa que el UUID no es válido (pero ya lo validamos arriba)
      if (error.code === '22P02') {
        return null;
      }
      console.error('Error getting message rating:', error);
      return null;
    }

    return data?.rating ?? null;
  } catch (error) {
    console.error('Error in getMessageRating:', error);
    return null;
  }
}

/**
 * Obtiene estadísticas de ratings para un mensaje específico
 */
export async function getRatingStats(messageId: string): Promise<RatingStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_message_rating_stats', {
      p_message_id: messageId,
    });

    if (error) {
      console.error('Error getting rating stats:', error);
      // Fallback: calcular manualmente si la función RPC no existe
      return await getRatingStatsFallback(messageId);
    }

    if (!data || data.length === 0) {
      return {
        total_ratings: 0,
        thumbs_up_count: 0,
        thumbs_down_count: 0,
        average_rating: 0,
      };
    }

    const stats = data[0];
    return {
      total_ratings: Number(stats.total_ratings) || 0,
      thumbs_up_count: Number(stats.thumbs_up_count) || 0,
      thumbs_down_count: Number(stats.thumbs_down_count) || 0,
      average_rating: Number(stats.average_rating) || 0,
    };
  } catch (error) {
    console.error('Error in getRatingStats:', error);
    return await getRatingStatsFallback(messageId);
  }
}

/**
 * Fallback: calcular estadísticas manualmente si la función RPC no existe
 */
async function getRatingStatsFallback(messageId: string): Promise<RatingStats | null> {
  try {
    const { data, error } = await supabase
      .from('tutor_message_ratings')
      .select('rating')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error in getRatingStatsFallback:', error);
      return null;
    }

    const ratings = data || [];
    const totalRatings = ratings.length;
    const thumbsUpCount = ratings.filter((r) => r.rating === true).length;
    const thumbsDownCount = ratings.filter((r) => r.rating === false).length;
    const averageRating = totalRatings > 0 ? (thumbsUpCount / totalRatings) * 100 : 0;

    return {
      total_ratings: totalRatings,
      thumbs_up_count: thumbsUpCount,
      thumbs_down_count: thumbsDownCount,
      average_rating: averageRating,
    };
  } catch (error) {
    console.error('Error in getRatingStatsFallback:', error);
    return null;
  }
}

/**
 * Elimina el rating de un mensaje (permite "descalificar")
 */
export async function removeRating(
  messageId: string,
  studentId: string
): Promise<boolean> {
  try {
    // Validar que messageId sea un UUID válido antes de eliminar
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      console.warn('removeRating: messageId no es un UUID válido, no se puede eliminar el rating:', messageId);
      return false; // Retornar false si no es UUID válido
    }

    const { error } = await supabase
      .from('tutor_message_ratings')
      .delete()
      .eq('message_id', messageId)
      .eq('student_id', studentId);

    if (error) {
      console.error('Error removing rating:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeRating:', error);
    return false;
  }
}

/**
 * Obtiene todos los ratings de un estudiante
 */
export async function getStudentRatings(
  studentId: string,
  limit: number = 100
): Promise<TutorMessageRating[]> {
  try {
    const { data, error } = await supabase
      .from('tutor_message_ratings')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting student ratings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStudentRatings:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de ratings para un estudiante
 */
export async function getStudentRatingStats(studentId: string): Promise<RatingStats | null> {
  try {
    const { data, error } = await supabase
      .from('tutor_message_ratings')
      .select('rating')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error getting student rating stats:', error);
      return null;
    }

    const ratings = data || [];
    const totalRatings = ratings.length;
    const thumbsUpCount = ratings.filter((r) => r.rating === true).length;
    const thumbsDownCount = ratings.filter((r) => r.rating === false).length;
    const averageRating = totalRatings > 0 ? (thumbsUpCount / totalRatings) * 100 : 0;

    return {
      total_ratings: totalRatings,
      thumbs_up_count: thumbsUpCount,
      thumbs_down_count: thumbsDownCount,
      average_rating: averageRating,
    };
  } catch (error) {
    console.error('Error in getStudentRatingStats:', error);
    return null;
  }
}

/**
 * Obtiene estadísticas de ratings para un curso (a través de los mensajes del tutor)
 */
export async function getCourseRatingStats(courseId: string | number): Promise<RatingStats | null> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    // Obtener mensajes del tutor para este curso a través de las conversaciones
    const { data: conversations, error: conversationsError } = await supabase
      .from('tutor_conversations')
      .select('id')
      .eq('course_id', courseIdNum);

    if (conversationsError) {
      console.error('Error getting conversations for course:', conversationsError);
      return null;
    }

    if (!conversations || conversations.length === 0) {
      return {
        total_ratings: 0,
        thumbs_up_count: 0,
        thumbs_down_count: 0,
        average_rating: 0,
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Obtener mensajes del tutor para estas conversaciones
    const { data: messages, error: messagesError } = await supabase
      .from('tutor_messages')
      .select('id')
      .in('conversation_id', conversationIds)
      .eq('role', 'assistant');

    if (messagesError) {
      console.error('Error getting messages for course:', messagesError);
      return null;
    }

    if (!messages || messages.length === 0) {
      return {
        total_ratings: 0,
        thumbs_up_count: 0,
        thumbs_down_count: 0,
        average_rating: 0,
      };
    }

    const messageIds = messages.map((m) => m.id);

    // Obtener ratings para estos mensajes
    const { data: ratings, error: ratingsError } = await supabase
      .from('tutor_message_ratings')
      .select('rating')
      .in('message_id', messageIds);

    if (ratingsError) {
      console.error('Error getting ratings for course:', ratingsError);
      return null;
    }

    const ratingsList = ratings || [];
    const totalRatings = ratingsList.length;
    const thumbsUpCount = ratingsList.filter((r) => r.rating === true).length;
    const thumbsDownCount = ratingsList.filter((r) => r.rating === false).length;
    const averageRating = totalRatings > 0 ? (thumbsUpCount / totalRatings) * 100 : 0;

    return {
      total_ratings: totalRatings,
      thumbs_up_count: thumbsUpCount,
      thumbs_down_count: thumbsDownCount,
      average_rating: averageRating,
    };
  } catch (error) {
    console.error('Error in getCourseRatingStats:', error);
    return null;
  }
}

