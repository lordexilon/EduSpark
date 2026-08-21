// services/tutorRatingService.ts
// Servicio para gestionar las calificaciones de los estudiantes hacia el tutor IA

import { supabase } from '../lib/supabase-shared';
import type { PedagogicalSettings } from '../types/pedagogical';

export interface TutorRating {
  id?: string;
  conversation_id: string;
  student_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

export interface RatingValidationResult {
  isValid: boolean;
  error?: string;
}

export const tutorRatingService = {
  /**
   * Valida si una calificación es permitida según la configuración pedagógica del curso
   */
  validateRating(rating: number, settings: PedagogicalSettings): RatingValidationResult {
    // Nota: Asumimos que settings incluye las columnas de escala que añadimos a la DB
    // Si los tipos de TypeScript no están actualizados, usaremos casting para evitar errores de compilación
    const min = (settings as any).rating_scale_min ?? 1;
    const max = (settings as any).rating_scale_max ?? 5;

    if (rating < min || rating > max) {
      return {
        isValid: false,
        error: `La calificación debe estar entre ${min} y ${max}.`,
      };
    }

    return { isValid: true };
  },

  /**
   * Registra una nueva calificación en la tabla tutor_ratings
   */
  async submitRating(
    ratingData: TutorRating,
    settings: PedagogicalSettings
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validar la calificación contra la escala del curso
      const validation = this.validateRating(ratingData.rating, settings);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // 2. Insertar en la base de datos
      const { error } = await supabase.from('tutor_ratings').insert({
        conversation_id: ratingData.conversation_id,
        student_id: ratingData.student_id,
        rating: ratingData.rating,
        comment: ratingData.comment,
      });

      if (error) {
        console.error('Error insertando tutor_rating:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error en tutorRatingService.submitRating:', error);
      return { success: false, error: 'Error interno al procesar la calificación.' };
    }
  },

  /**
   * Obtiene el promedio de calificaciones para un curso (útil para dashboards)
   */
  async getCourseAverageRating(courseId: number): Promise<number> {
    try {
      // Necesitamos hacer un join o buscar los ratings asociados a conversaciones de este curso
      // Para simplificar, si la tabla tutor_ratings tuviera course_id sería directo.
      // Como no la tiene, primero buscamos las conversaciones del curso.

      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('course_id', courseId);

      if (convError || !conversations || conversations.length === 0) return 0;

      const conversationIds = conversations.map((c) => c.id);

      const { data: ratings, error: ratError } = await supabase
        .from('tutor_ratings')
        .select('rating')
        .in('conversation_id', conversationIds);

      if (ratError || !ratings || ratings.length === 0) return 0;

      const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
      return parseFloat((sum / ratings.length).toFixed(2));
    } catch (error) {
      console.error('Error obteniendo promedio de ratings:', error);
      return 0;
    }
  },
};
