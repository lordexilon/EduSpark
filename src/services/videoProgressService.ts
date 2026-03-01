// services/videoProgressService.ts
// Servicio para tracking del progreso de visualización de videos

import { supabase } from '@/lib/supabase';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface VideoProgress {
  id: string;
  student_id: string;
  material_id: string;
  course_id: string;
  unit_id?: string;
  watched_seconds: number;
  total_seconds: number;
  completion_percentage: number;
  last_position: number;
  is_completed: boolean;
  started_at: string;
  last_watched_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  watchedSeconds: number;
  totalSeconds: number;
  lastPosition: number;
}

// =====================================================
// SERVICIO PRINCIPAL
// =====================================================

export class VideoProgressService {
  /**
   * Actualiza el progreso de visualización de un video
   */
  async updateProgress(
    studentId: string,
    materialId: string,
    progress: ProgressUpdate
  ): Promise<VideoProgress> {
    const { watchedSeconds, totalSeconds, lastPosition } = progress;
    
    const completionPercentage = totalSeconds > 0 
      ? Math.min(100, (watchedSeconds / totalSeconds) * 100)
      : 0;
    
    // Considerar completado al 90% o más
    const isCompleted = completionPercentage >= 90;
    
    // Obtener course_id y unit_id del material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('course_id, unit_id')
      .eq('id', materialId)
      .single();
    
    if (materialError || !material) {
      throw new Error('Material no encontrado');
    }
    
    // Verificar si ya existe un registro de progreso
    const { data: existingProgress } = await supabase
      .from('video_viewing_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('material_id', materialId)
      .maybeSingle();
    
    const updateData: any = {
      watched_seconds: watchedSeconds,
      total_seconds: totalSeconds,
      completion_percentage: completionPercentage,
      last_position: lastPosition,
      is_completed: isCompleted,
      last_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Si se completó y no estaba completado antes, marcar fecha de completado
    if (isCompleted && (!existingProgress || !existingProgress.is_completed)) {
      updateData.completed_at = new Date().toISOString();
    }
    
    // Si no existe, crear nuevo registro
    if (!existingProgress) {
      updateData.student_id = studentId;
      updateData.material_id = materialId;
      updateData.course_id = material.course_id;
      updateData.unit_id = material.unit_id;
      updateData.started_at = new Date().toISOString();
      updateData.created_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('video_viewing_progress')
        .insert(updateData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Actualizar registro existente
      const { data, error } = await supabase
        .from('video_viewing_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }
  
  /**
   * Obtiene el progreso de un estudiante para un material específico
   */
  async getProgress(
    studentId: string,
    materialId: string
  ): Promise<VideoProgress | null> {
    const { data, error } = await supabase
      .from('video_viewing_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('material_id', materialId)
      .maybeSingle();
    
    if (error) {
      console.error('Error obteniendo progreso:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Obtiene el progreso de todos los videos de una unidad
   */
  async getUnitProgress(
    studentId: string,
    unitId: string
  ): Promise<VideoProgress[]> {
    const { data, error } = await supabase
      .from('video_viewing_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('unit_id', unitId)
      .order('last_watched_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo progreso de unidad:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Obtiene el progreso de todos los videos de un curso
   */
  async getCourseProgress(
    studentId: string,
    courseId: string
  ): Promise<VideoProgress[]> {
    const { data, error } = await supabase
      .from('video_viewing_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .order('last_watched_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo progreso de curso:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Obtiene estadísticas de progreso de videos para un estudiante en un curso
   */
  async getProgressStats(
    studentId: string,
    courseId: string
  ): Promise<{
    totalVideos: number;
    completedVideos: number;
    inProgressVideos: number;
    notStartedVideos: number;
    averageCompletion: number;
  }> {
    // Obtener todos los materiales de video del curso
    const { data: videoMaterials } = await supabase
      .from('materials')
      .select('id')
      .eq('course_id', courseId)
      .eq('kind', 'video');
    
    const totalVideos = videoMaterials?.length || 0;
    
    // Obtener progreso de todos los videos
    const progress = await this.getCourseProgress(studentId, courseId);
    
    const completedVideos = progress.filter(p => p.is_completed).length;
    const inProgressVideos = progress.filter(p => !p.is_completed && p.watched_seconds > 0).length;
    const notStartedVideos = totalVideos - progress.length;
    
    const averageCompletion = progress.length > 0
      ? progress.reduce((sum, p) => sum + Number(p.completion_percentage), 0) / progress.length
      : 0;
    
    return {
      totalVideos,
      completedVideos,
      inProgressVideos,
      notStartedVideos,
      averageCompletion: Math.round(averageCompletion * 100) / 100,
    };
  }

  /**
   * Marca un video como completado manualmente y actualiza el tiempo de estudio
   */
  async markAsCompleted(
    studentId: string,
    materialId: string
  ): Promise<VideoProgress> {
    // Obtener información del material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('course_id, unit_id, video_duration')
      .eq('id', materialId)
      .single();
    
    if (materialError || !material) {
      throw new Error('Material no encontrado');
    }

    // Calcular tiempo de estudio en minutos (usar video_duration si está disponible)
    // Si no hay duración guardada, intentar obtenerla del material o usar un valor por defecto
    let videoDurationMinutes = 0;
    if (material.video_duration) {
      videoDurationMinutes = Math.ceil(material.video_duration / 60);
    } else {
      // Si no hay duración guardada, no podemos calcular el tiempo de estudio
      // El video se marcará como completado pero sin agregar tiempo
      console.warn('No se encontró video_duration para el material. El video se marcará como completado pero no se agregará tiempo de estudio.');
    }

    // Obtener o crear progreso
    const existingProgress = await this.getProgress(studentId, materialId);
    
    const now = new Date().toISOString();
    const updateData: any = {
      student_id: studentId,
      material_id: materialId,
      course_id: material.course_id,
      unit_id: material.unit_id,
      is_completed: true,
      completion_percentage: 100,
      completed_at: now,
      last_watched_at: now,
      updated_at: now,
    };

    // Si existe progreso previo, mantener watched_seconds y total_seconds
    if (existingProgress) {
      updateData.watched_seconds = existingProgress.total_seconds || material.video_duration || 0;
      updateData.total_seconds = existingProgress.total_seconds || material.video_duration || 0;
      updateData.last_position = existingProgress.total_seconds || material.video_duration || 0;
      
      const { data, error } = await supabase
        .from('video_viewing_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar tiempo de estudio en el enrollment
      if (videoDurationMinutes > 0) {
        await this.updateEnrollmentStudyTime(studentId, material.course_id, videoDurationMinutes);
      }
      
      return data;
    } else {
      // Crear nuevo registro
      const videoDuration = material.video_duration || 0;
      updateData.watched_seconds = videoDuration;
      updateData.total_seconds = videoDuration;
      updateData.last_position = videoDuration;
      updateData.started_at = now;
      updateData.created_at = now;
      
      const { data, error } = await supabase
        .from('video_viewing_progress')
        .insert(updateData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar tiempo de estudio en el enrollment
      if (videoDurationMinutes > 0) {
        await this.updateEnrollmentStudyTime(studentId, material.course_id, videoDurationMinutes);
      }
      
      return data;
    }
  }

  /**
   * Actualiza el tiempo de estudio en el enrollment del curso
   */
  private async updateEnrollmentStudyTime(
    studentId: string,
    courseId: number | string,
    minutesToAdd: number
  ): Promise<void> {
    try {
      // Obtener el enrollment actual
      const { data: enrollment, error: fetchError } = await supabase
        .from('course_enrollments')
        .select('id, time_spent_minutes')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error obteniendo enrollment:', fetchError);
        return;
      }

      if (enrollment) {
        // Actualizar tiempo de estudio
        const currentMinutes = enrollment.time_spent_minutes || 0;
        const newMinutes = currentMinutes + minutesToAdd;
        
        const { error: updateError } = await supabase
          .from('course_enrollments')
          .update({ 
            time_spent_minutes: newMinutes,
            last_accessed_at: new Date().toISOString()
          })
          .eq('id', enrollment.id);
        
        if (updateError) {
          console.error('Error actualizando tiempo de estudio:', updateError);
        }
      } else {
        // Si no existe enrollment, crear uno básico
        const { error: createError } = await supabase
          .from('course_enrollments')
          .insert({
            student_id: studentId,
            course_id: courseId,
            time_spent_minutes: minutesToAdd,
            last_accessed_at: new Date().toISOString(),
            enrolled_at: new Date().toISOString()
          });
        
        if (createError) {
          console.error('Error creando enrollment:', createError);
        }
      }
    } catch (error) {
      console.error('Error actualizando tiempo de estudio:', error);
    }
  }
}

