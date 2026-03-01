// services/flashcardService.ts
// Servicio para gestión de flashcards interactivas

import { supabase } from '@/lib/supabase';

export interface AnswerOption {
  label: string; // A, B, C, D, etc.
  text: string; // Texto de la opción
  image_url?: string; // URL de imagen opcional para la opción
}

export interface Flashcard {
  id: string;
  course_id: number;
  unit_id?: string;
  session_id?: string;
  front_text?: string;
  front_image_url?: string;
  back_text: string;
  back_image_url?: string;
  title?: string;
  tags?: string[];
  difficulty_level: number;
  points_value: number;
  created_by: string;
  is_active: boolean;
  is_public: boolean;
  // Opciones múltiples
  is_multiple_choice?: boolean;
  answer_options?: AnswerOption[]; // Array de opciones de respuesta
  correct_answer_index?: number; // Índice (0-based) de la respuesta correcta
  // Campos de disponibilidad por fecha
  available_from?: string; // Fecha desde la cual está disponible
  available_until?: string; // Fecha hasta la cual está disponible
  image_prompt?: string; // Sugerencia visual para generación de imagen
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  id: string;
  student_id: string;
  flashcard_id: string;
  mastery_level: number; // 0-5
  times_studied: number;
  times_correct: number;
  times_incorrect: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  last_studied_at?: string;
  next_review_at?: string;
  last_correct_at?: string;
  mastered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardWithProgress extends Flashcard {
  progress?: FlashcardProgress;
}

/**
 * Subir imagen a Supabase Storage
 * Usa el bucket 'course-media' que es el mismo que se usa para otros medios de cursos
 */
export async function uploadFlashcardImage(
  file: File,
  courseId: number,
  flashcardId?: string
): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = flashcardId
      ? `${flashcardId}-${Date.now()}.${fileExt}`
      : `temp-${Date.now()}.${fileExt}`;
    const filePath = `flashcards/${courseId}/${fileName}`;

    // Usar el bucket 'course-media' que es el estándar para medios de cursos
    const { data, error } = await supabase.storage
      .from('course-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      // Proporcionar mensaje de error más claro
      if (error.message?.includes('Bucket not found')) {
        throw new Error('El bucket "course-media" no está configurado. Por favor, contacta al administrador para crear el bucket en Supabase Storage.');
      }
      throw error;
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('course-media').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading flashcard image:', error);
    throw error;
  }
}

/**
 * Crear nueva flashcard
 */
export async function createFlashcard(
  flashcard: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>
): Promise<Flashcard> {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .insert([flashcard])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating flashcard:', error);
    throw error;
  }
}

/**
 * Actualizar flashcard
 */
export async function updateFlashcard(
  id: string,
  updates: Partial<Flashcard>
): Promise<Flashcard> {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating flashcard:', error);
    throw error;
  }
}

/**
 * Eliminar flashcard
 */
export async function deleteFlashcard(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('flashcards').delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    throw error;
  }
}

/**
 * Obtener flashcards por curso
 */
/**
 * Obtener flashcards de una sesión específica
 */
export async function getFlashcardsBySession(sessionId: string): Promise<Flashcard[]> {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching flashcards by session:', error);
    throw error;
  }
}

export async function getFlashcardsByCourse(
  courseId: number
): Promise<Flashcard[]> {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching flashcards by course:', error);
    return [];
  }
}

/**
 * Obtener flashcards por unidad
 */
export async function getFlashcardsByUnit(
  unitId: string
): Promise<Flashcard[]> {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching flashcards by unit:', error);
    return [];
  }
}

/**
 * Obtener flashcards con progreso del estudiante
 */
export async function getFlashcardsWithProgress(
  courseId: number,
  studentId: string
): Promise<FlashcardWithProgress[]> {
  try {
    // Primero obtener flashcards
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (flashcardsError) throw flashcardsError;

    if (!flashcards || flashcards.length === 0) return [];

    // Luego obtener progreso
    const flashcardIds = flashcards.map((f) => f.id);
    const { data: progressData, error: progressError } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('student_id', studentId)
      .in('flashcard_id', flashcardIds);

    if (progressError) {
      console.warn('Error fetching progress:', progressError);
    }

    // Crear mapa de progreso
    const progressMap = new Map<string, FlashcardProgress>();
    progressData?.forEach((p) => {
      progressMap.set(p.flashcard_id, p);
    });

    // Combinar datos
    return flashcards.map((flashcard) => ({
      ...flashcard,
      progress: progressMap.get(flashcard.id),
    }));
  } catch (error) {
    console.error('Error fetching flashcards with progress:', error);
    return [];
  }
}

/**
 * Obtener flashcards que necesitan revisión (Spaced Repetition)
 * Incluye flashcards nuevas (sin progreso) si no hay suficientes para revisar
 */
export async function getFlashcardsToReview(
  studentId: string,
  courseId?: number
): Promise<FlashcardWithProgress[]> {
  try {
    // Primero obtener flashcards que necesitan revisión (con progreso)
    // Nota: El filtro en campos de join anidado puede causar que flashcard sea null
    let progressQuery = supabase
      .from('flashcard_progress')
      .select(
        `
        *,
        flashcard:flashcards!inner(*)
      `
      )
      .eq('student_id', studentId)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true });

    if (courseId) {
      // Usar !inner en el join y filtrar directamente en el campo anidado
      progressQuery = progressQuery.eq('flashcard.course_id', courseId);
    }

    const { data: progressData, error: progressError } = await progressQuery;

    if (progressError) throw progressError;

    // Filtrar registros donde flashcard es null (puede ocurrir con RLS o datos inconsistentes)
    const validProgressData = progressData?.filter(item => item.flashcard !== null) || [];

    const flashcardsToReview: FlashcardWithProgress[] =
      validProgressData.map((item) => ({
        ...(item.flashcard as Flashcard),
        progress: item as FlashcardProgress,
      }));

    // Si hay menos de 5 flashcards para revisar, agregar flashcards nuevas (sin progreso)
    if (flashcardsToReview.length < 5 && courseId) {
      // Obtener todas las flashcards del curso
      const { data: allFlashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (flashcardsError) {
        console.warn('Error fetching all flashcards:', flashcardsError);
      } else if (allFlashcards) {
        // Obtener IDs de flashcards que ya tienen progreso
        const { data: existingProgress, error: existingError } = await supabase
          .from('flashcard_progress')
          .select('flashcard_id')
          .eq('student_id', studentId)
          .in(
            'flashcard_id',
            allFlashcards.map((f) => f.id)
          );

        if (!existingError && existingProgress) {
          const existingIds = new Set(
            existingProgress.map((p) => p.flashcard_id)
          );

          // Agregar flashcards nuevas (sin progreso)
          const newFlashcards = allFlashcards
            .filter((f) => !existingIds.has(f.id))
            .slice(0, 5 - flashcardsToReview.length)
            .map((f) => ({
              ...f,
              progress: undefined,
            }));

          flashcardsToReview.push(...newFlashcards);
        }
      }
    }

    return flashcardsToReview;
  } catch (error) {
    console.error('Error fetching flashcards to review:', error);
    return [];
  }
}

/**
 * Registrar estudio de flashcard (con Spaced Repetition)
 */
export async function recordFlashcardStudy(
  studentId: string,
  flashcardId: string,
  quality: number // 0-5 (0=muy difícil, 5=fácil)
): Promise<FlashcardProgress> {
  try {
    // Obtener progreso actual
    const { data: currentProgress, error: fetchError } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('flashcard_id', flashcardId)
      .maybeSingle();

    // Calcular nuevos valores con algoritmo SM-2
    const currentEase = currentProgress?.ease_factor || 2.5;
    const currentInterval = currentProgress?.interval_days || 1;
    const currentRepetitions = currentProgress?.repetitions || 0;

    // Llamar a función SQL para calcular próxima revisión
    const { data: calculated, error: calcError } = await supabase.rpc(
      'calculate_next_review',
      {
        p_quality: quality,
        p_current_ease: currentEase,
        p_current_interval: currentInterval,
        p_current_repetitions: currentRepetitions,
      }
    );

    if (calcError) throw calcError;

    const newValues = calculated?.[0];
    if (!newValues) throw new Error('No se pudo calcular próxima revisión');

    // Determinar nuevo mastery_level
    let newMasteryLevel = quality;
    if (quality >= 4 && currentProgress?.mastery_level < 4) {
      // Primera vez que alcanza nivel 4 o superior
      newMasteryLevel = quality;
    } else if (quality < 3) {
      // Respuesta incorrecta, reducir nivel
      newMasteryLevel = Math.max(0, (currentProgress?.mastery_level || 0) - 1);
    } else {
      // Mantener o mejorar nivel
      newMasteryLevel = Math.max(
        currentProgress?.mastery_level || 0,
        quality
      );
    }

    // Actualizar o crear progreso
    const updateData = {
      mastery_level: newMasteryLevel,
      times_studied: (currentProgress?.times_studied || 0) + 1,
      times_correct:
        (currentProgress?.times_correct || 0) + (quality >= 3 ? 1 : 0),
      times_incorrect:
        (currentProgress?.times_incorrect || 0) + (quality < 3 ? 1 : 0),
      ease_factor: newValues.new_ease,
      interval_days: newValues.new_interval,
      repetitions: newValues.new_repetitions,
      last_studied_at: new Date().toISOString(),
      next_review_at: newValues.next_review_date,
      last_correct_at: quality >= 3 ? new Date().toISOString() : null,
      mastered_at:
        newMasteryLevel >= 5 && !currentProgress?.mastered_at
          ? new Date().toISOString()
          : currentProgress?.mastered_at,
      updated_at: new Date().toISOString(),
    };

    if (currentProgress) {
      // Actualizar existente
      const { data, error } = await supabase
        .from('flashcard_progress')
        .update(updateData)
        .eq('id', currentProgress.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Crear nuevo
      const { data, error } = await supabase
        .from('flashcard_progress')
        .insert([
          {
            student_id: studentId,
            flashcard_id: flashcardId,
            ...updateData,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error recording flashcard study:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de progreso de flashcards
 */
export async function getFlashcardProgressStats(
  studentId: string,
  courseId?: number
): Promise<{
  total: number;
  mastered: number; // mastery_level >= 4
  learning: number; // mastery_level 1-3
  new: number; // mastery_level = 0
  dueToday: number; // next_review_at <= hoy
  masteryPercentage: number;
}> {
  try {
    let query = supabase
      .from('flashcard_progress')
      .select(
        `
        mastery_level,
        next_review_at,
        flashcard:flashcards!inner(course_id, is_active)
      `
      )
      .eq('student_id', studentId)
      .eq('flashcard.is_active', true);

    if (courseId) {
      query = query.eq('flashcard.course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    const stats = {
      total: data?.length || 0,
      mastered: 0,
      learning: 0,
      new: 0,
      dueToday: 0,
      masteryPercentage: 0,
    };

    data?.forEach((item) => {
      const level = item.mastery_level || 0;
      if (level >= 4) stats.mastered++;
      else if (level >= 1) stats.learning++;
      else stats.new++;

      if (item.next_review_at && item.next_review_at <= today) {
        stats.dueToday++;
      }
    });

    // Obtener total de flashcards activas en el curso
    let totalQuery = supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (courseId) {
      totalQuery = totalQuery.eq('course_id', courseId);
    }

    const { count: totalFlashcards } = await totalQuery;

    if (totalFlashcards && totalFlashcards > 0) {
      stats.masteryPercentage = (stats.mastered / totalFlashcards) * 100;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching flashcard progress stats:', error);
    return {
      total: 0,
      mastered: 0,
      learning: 0,
      new: 0,
      dueToday: 0,
      masteryPercentage: 0,
    };
  }
}

/**
 * Calcular porcentaje de dominio de flashcards (para progreso del curso)
 */
export async function getFlashcardMasteryPercentage(
  studentId: string,
  courseId: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc(
      'calculate_flashcard_mastery_percentage',
      {
        p_student_id: studentId,
        p_course_id: courseId,
      }
    );

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating flashcard mastery percentage:', error);
    return 0;
  }
}

/**
 * Calcular puntos de flashcards dominadas (para calificaciones)
 */
export async function getFlashcardPoints(
  studentId: string,
  courseId: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_flashcard_points', {
      p_student_id: studentId,
      p_course_id: courseId,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating flashcard points:', error);
    return 0;
  }
}

