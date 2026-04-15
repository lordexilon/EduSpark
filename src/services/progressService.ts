// services/progressService.ts
// Servicio para calcular y actualizar el progreso de los estudiantes en los cursos

import { supabase } from '@/lib/supabase';

/**
 * Helper para obtener la clave del día según el timeframe
 */
function getDayKey(date: Date, timeframe: 'monthly' | 'weekly'): string {
  if (timeframe === 'weekly') {
    const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
    return days[date.getDay()];
  } else {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
}

/**
 * Calcula el progreso del curso basado en:
 * - Unidades completadas (unit_progress)
 * - Sesiones visitadas (session_access)
 * - Quizzes/Trivias completados (assessment_attempts)
 */
export const progressService = {
  /**
   * Calcula el progreso total de un estudiante en un curso
   */
  async calculateCourseProgress(studentId: string, courseId: number): Promise<number> {
    try {
      // 1. Obtener todas las unidades del curso
      const { data: units, error: unitsError } = await supabase
        .from('course_units')
        .select('id')
        .eq('course_id', courseId);

      if (unitsError) throw unitsError;
      const totalUnits = units?.length || 0;

      // 2. Obtener todas las sesiones del curso
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('course_id', courseId);

      if (sessionsError) throw sessionsError;
      const totalSessions = sessions?.length || 0;

      // 3. Obtener todos los quizzes/trivias del curso
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('id')
        .eq('course_id', courseId)
        .in('assessment_type', ['quiz', 'trivia']);

      if (assessmentsError) throw assessmentsError;
      const totalAssessments = assessments?.length || 0;

      // 4. Obtener todas las tareas (assignments) del curso
      const { data: courseAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('course_id', courseId);

      if (assignmentsError) throw assignmentsError;
      const totalAssignments = courseAssignments?.length || 0;

      // 5. Obtener todas las flashcards del curso
      const { data: flashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (flashcardsError) {
        console.warn('Error al obtener flashcards:', flashcardsError);
      }
      const totalFlashcards = flashcards?.length || 0;

      // Si no hay contenido, el progreso es 0
      const totalItems = totalUnits + totalSessions + totalAssessments + totalAssignments + totalFlashcards;
      if (totalItems === 0) return 0;

      let completedItems = 0;

      // 4. Contar unidades completadas (unit_progress usa student_id directamente)
      if (totalUnits > 0) {
        const { data: unitProgress, error: unitProgressError } = await supabase
          .from('unit_progress')
          .select('unit_id')
          .eq('student_id', studentId)
          .eq('course_id', courseId)
          .eq('is_completed', true);

        if (!unitProgressError && unitProgress) {
          completedItems += unitProgress.length;
        } else if (unitProgressError) {
          console.warn('Error al obtener unit_progress:', unitProgressError);
        }
      }

      // 5. Contar sesiones completadas (SOLO is_completed = true)
      if (totalSessions > 0) {
        const { data: sessionProgressData, error: sessionProgressError } = await supabase
          .from('session_progress')
          .select('session_id')
          .eq('student_id', studentId)
          .eq('course_id', courseId)
          .eq('is_completed', true); // SOLO sesiones marcadas como completadas

        if (!sessionProgressError && sessionProgressData && sessionProgressData.length > 0) {
          const completedSet = new Set(
            sessionProgressData
              .map((progress: any) => progress.session_id)
              .filter(Boolean)
          );
          const completedSessions = completedSet.size;
          completedItems += Math.min(completedSessions, totalSessions);
        }
      }

      // 7. Contar quizzes/trivias completados
      if (totalAssessments > 0) {
        const assessmentIds = (assessments || []).map(a => a.id);
        const { data: completedAssessments, error: completedError } = await supabase
          .from('assessment_attempts')
          .select('assessment_id')
          .eq('student_id', studentId)
          .in('assessment_id', assessmentIds)
          .in('status', ['submitted', 'graded']);

        if (!completedError && completedAssessments) {
          const uniqueCompleted = new Set(completedAssessments.map(a => a.assessment_id));
          completedItems += uniqueCompleted.size;
        }
      }

      // 8. Contar tareas (assignments) entregadas y calificadas
      if (totalAssignments > 0) {
        const assignmentIds = (courseAssignments || []).map(a => a.id);
        const { data: completedAssignments, error: assignmentsCompletedError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds)
          .not('grade', 'is', null); // Solo contar las que ya tienen calificación

        if (!assignmentsCompletedError && completedAssignments) {
          const uniqueCompleted = new Set(completedAssignments.map(a => a.assignment_id));
          completedItems += uniqueCompleted.size;
        }
      }

      // 9. Contar flashcards dominadas (mastery_level >= 4)
      if (totalFlashcards > 0) {
        const flashcardIds = (flashcards || []).map(f => f.id);
        const { data: flashcardProgress, error: flashcardProgressError } = await supabase
          .from('flashcard_progress')
          .select('flashcard_id')
          .eq('student_id', studentId)
          .in('flashcard_id', flashcardIds)
          .gte('mastery_level', 4); // Dominadas (nivel 4 o 5)

        if (!flashcardProgressError && flashcardProgress) {
          const uniqueMastered = new Set(flashcardProgress.map(p => p.flashcard_id));
          completedItems += uniqueMastered.size;
        }
      }

      // Calcular porcentaje
      const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      return Math.round(percentage * 100) / 100; // Redondear a 2 decimales
    } catch (error) {
      console.error('Error calculando progreso del curso:', error);
      return 0;
    }
  },

  /**
   * Actualiza el progreso del curso en la tabla course_enrollments
   */
  async updateCourseProgress(studentId: string, courseId: number): Promise<void> {
    try {
      const progress = await this.calculateCourseProgress(studentId, courseId);

      // Actualizar el enrollment
      const { error } = await supabase
        .from('course_enrollments')
        .update({
          completion_percentage: progress,
          last_access_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      if (error) throw error;

      // Si el progreso es 100%, marcar como completado
      if (progress >= 100) {
        await supabase
          .from('course_enrollments')
          .update({
            completed_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('student_id', studentId)
          .eq('course_id', courseId);
      }
    } catch (error) {
      console.error('Error actualizando progreso del curso:', error);
      throw error;
    }
  },

  /**
   * Obtiene (o crea) el registro de progreso de una sesión para el estudiante actual
   */
  async getSessionProgress(studentId: string, sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('session_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error obteniendo session_progress:', error);
      return null;
    }
  },

  /**
   * Registra el acceso del estudiante a una sesión (crea/actualiza session_progress)
   */
  async trackSessionAccess(
    studentId: string,
    sessionId: string,
    courseId: number,
    unitId?: string,
    options?: {
      totalActivities?: number;
      activitiesCompleted?: number;
      timeSpentMinutes?: number;
    }
  ) {
    try {
      // Verificar que la sesión exista antes de intentar guardar progreso
      const { data: sessionExists, error: sessionCheckError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!sessionExists) {
        // Si no existe, no hacemos nada (evita error 409)
        return null;
      }

      const existing = await this.getSessionProgress(studentId, sessionId);
      const now = new Date().toISOString();

      const payload: Record<string, any> = {
        student_id: studentId,
        session_id: sessionId,
        course_id: courseId,
        unit_id: unitId ?? null,
        first_accessed_at: existing?.first_accessed_at ?? now,
        last_accessed_at: now,
      };

      if (typeof options?.totalActivities === 'number') {
        payload.total_activities =
          existing?.total_activities && existing.total_activities > options.totalActivities
            ? existing.total_activities
            : options.totalActivities;
      } else if (existing?.total_activities) {
        payload.total_activities = existing.total_activities;
      }

      if (typeof options?.activitiesCompleted === 'number') {
        payload.activities_completed = options.activitiesCompleted;
      } else if (existing?.activities_completed !== undefined) {
        payload.activities_completed = existing.activities_completed;
      }

      if (typeof options?.timeSpentMinutes === 'number') {
        const base = existing?.time_spent_minutes ?? 0;
        payload.time_spent_minutes = Math.max(0, base + options.timeSpentMinutes);
      }

      const { data, error } = await supabase
        .from('session_progress')
        .upsert(payload, { onConflict: 'student_id,session_id' })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error registrando acceso a la sesión:', error);
      return null;
    }
  },

  /**
   * Marca una sesión como completada (actualiza session_progress y progreso del curso)
   */
  async completeSession(
    studentId: string,
    sessionId: string,
    courseId: number,
    unitId?: string,
    options?: {
      totalActivities?: number;
      timeSpentMinutes?: number;
    }
  ) {
    try {
      // Verificar que la sesión exista antes de intentar guardar progreso
      // Esto evita errores 409 si la sesión fue eliminada o el ID es inválido
      const { data: sessionExists, error: sessionCheckError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionCheckError) {
        console.error('Error verificando existencia de sesión:', sessionCheckError);
        // Continuar bajo riesgo o lanzar error
      }

      if (!sessionExists) {
        console.warn(`Intento de completar sesión inexistente: ${sessionId}`);
        return null; // Salir silenciosamente para no romper la UI
      }

      const existing = await this.getSessionProgress(studentId, sessionId);
      const now = new Date().toISOString();

      const totalActivities =
        typeof options?.totalActivities === 'number'
          ? options.totalActivities
          : existing?.total_activities ?? 0;

      const payload: Record<string, any> = {
        student_id: studentId,
        session_id: sessionId,
        course_id: courseId,
        unit_id: unitId ?? null,
        is_completed: true,
        completion_percentage: 100,
        activities_completed: totalActivities || existing?.activities_completed || 0,
        total_activities: totalActivities || existing?.total_activities || 0,
        completed_at: now,
        last_accessed_at: now,
        first_accessed_at: existing?.first_accessed_at ?? now,
      };

      if (typeof options?.timeSpentMinutes === 'number' && options.timeSpentMinutes > 0) {
        const baseMinutes = existing?.time_spent_minutes ?? 0;
        payload.time_spent_minutes = Math.max(0, baseMinutes + options.timeSpentMinutes);
      }

      const { data, error } = await supabase
        .from('session_progress')
        .upsert(payload, { onConflict: 'student_id,session_id' })
        .select()
        .single();

      if (error) throw error;

      await this.updateCourseProgress(studentId, courseId);

      return data;
    } catch (error) {
      console.error('Error completando la sesión:', error);
      throw error;
    }
  },

  /**
   * Marca una sesión como visitada (actualiza el progreso)
   */
  async markSessionVisited(studentId: string, sessionId: string): Promise<void> {
    try {
      // Obtener el course_id de la sesión
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('course_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.warn('No se encontró la sesión');
        return;
      }

      await this.trackSessionAccess(studentId, sessionId, session.course_id);

      // Actualizar el progreso del curso
      await this.updateCourseProgress(studentId, session.course_id);
    } catch (error) {
      console.error('Error marcando sesión como visitada:', error);
    }
  },

  /**
   * Actualiza el progreso cuando se completa un quiz/trivia
   */
  async onAssessmentCompleted(studentId: string, assessmentId: string): Promise<void> {
    try {
      // Obtener el course_id del assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('course_id, session_id')
        .eq('id', assessmentId)
        .single();

      if (assessmentError || !assessment) {
        console.warn('No se encontró el assessment');
        return;
      }

      // Actualizar el progreso del curso
      await this.updateCourseProgress(studentId, assessment.course_id);
    } catch (error) {
      console.error('Error actualizando progreso tras completar assessment:', error);
    }
  },

  /**
   * Obtiene las horas de aprendizaje del estudiante agrupadas por día
   * @param studentId ID del estudiante
   * @param timeframe 'monthly' o 'weekly'
   * @returns Array de objetos con { day, hours }
   */
  async getLearningHours(studentId: string, timeframe: 'monthly' | 'weekly' = 'monthly'): Promise<Array<{ day: string; hours: number }>> {
    try {
      const now = new Date();
      let startDate: Date;

      if (timeframe === 'weekly') {
        // Últimos 7 días (desde el lunes de esta semana)
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Último mes (30 días)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }

      // Obtener datos de múltiples fuentes (prioridad: course_enrollments > session_progress)
      // Usar select('*') como en academicService para obtener todas las columnas disponibles
      let enrollmentsResult: any = { error: null, data: null };
      try {
        // Obtener enrollments con información de cursos para validar fechas
        enrollmentsResult = await supabase
          .from('course_enrollments')
          .select('*, courses(id, title, start_date, end_date)')
          .eq('student_id', studentId);

        if (enrollmentsResult.error) {
          console.warn('Error obteniendo enrollments:', enrollmentsResult.error);
        } else if (enrollmentsResult.data) {
          // Filtrar solo cursos habilitados según fechas
          const now = new Date();
          enrollmentsResult.data = enrollmentsResult.data.filter((enrollment: any) => {
            const course = enrollment.courses;
            if (!course) return false;

            // Si el curso tiene fechas, validar que estemos dentro del rango
            if (course.start_date && course.end_date) {
              const startDate = new Date(course.start_date);
              const endDate = new Date(course.end_date);
              return now >= startDate && now <= endDate;
            }

            // Si no tiene fechas, permitir (comportamiento por defecto)
            return true;
          });
        }
      } catch (err) {
        console.warn('Error obteniendo enrollments:', err);
      }

      // Obtener session_progress
      const sessionProgressResult = await supabase
        .from('session_progress')
        .select('time_spent_minutes, last_accessed_at, updated_at, first_accessed_at')
        .eq('student_id', studentId)
        .gte('time_spent_minutes', 0);

      // Agrupar por día
      const hoursByDay = new Map<string, number>();

      // Procesar course_enrollments PRIMERO (fuente principal)
      if (!enrollmentsResult.error && enrollmentsResult.data && enrollmentsResult.data.length > 0) {
        console.log('📊 Horas de aprendizaje - Enrollments encontrados:', enrollmentsResult.data.length);
        enrollmentsResult.data.forEach((enrollment: any) => {
          // Intentar obtener time_spent_minutes de cualquier campo posible
          const totalMinutes = enrollment.time_spent_minutes || enrollment.time_spent || 0;
          console.log('📊 Enrollment datos completos:', enrollment);
          console.log('📊 Campos disponibles:', Object.keys(enrollment));

          const completion = enrollment.completion_percentage || 0;

          // Determinar minutos a usar
          let minutesToUse = totalMinutes;

          if (totalMinutes === 0 && completion > 0) {
            // Si no hay tiempo registrado pero hay progreso, estimar tiempo basado en el progreso
            // Estimación: asumir que un curso típico requiere 15 horas de estudio
            // Si tiene 50% de progreso, estimar proporcionalmente
            const estimatedCourseHours = 15; // Horas estimadas para completar el curso
            minutesToUse = Math.round((completion / 100) * estimatedCourseHours * 60);
            console.log('📊 Estimando tiempo basado en progreso:', completion + '% = ~' + Math.round(minutesToUse / 60) + ' horas');
          }

          if (minutesToUse === 0) {
            // Sin tiempo real ni estimado, no hay nada que mostrar
            return;
          }

          // Usar cualquier campo de fecha disponible
          const dateStr = enrollment.last_access_at || enrollment.last_accessed_at ||
            enrollment.updated_at || enrollment.enrolled_at || enrollment.enrollment_date ||
            enrollment.created_at;
          if (!dateStr) {
            console.log('📊 Enrollment sin fecha disponible');
            return;
          }

          const date = new Date(dateStr);
          console.log('📊 Fecha encontrada:', dateStr, '->', date, 'startDate:', startDate, 'está en rango:', date >= startDate);

          if (date < startDate) {
            console.log('📊 Fecha fuera del rango de timeframe');
            return;
          }

          // Asignar el tiempo al día de última actividad
          const dayKey = getDayKey(date, timeframe);
          const hours = minutesToUse / 60;
          console.log('📊 Agregando horas:', hours, 'al día:', dayKey);
          const current = hoursByDay.get(dayKey) || 0;
          hoursByDay.set(dayKey, current + hours);
        });
      }

      // Procesar session_progress como fuente adicional (si no hay datos en enrollments o para complementar)
      // Filtrar solo sesiones de cursos habilitados
      if (!sessionProgressResult.error && sessionProgressResult.data) {
        console.log('📊 Horas de aprendizaje - session_progress encontrados:', sessionProgressResult.data.length);

        // Obtener información de sesiones y cursos para validar fechas
        const sessionIds = [...new Set(sessionProgressResult.data.map((sp: any) => sp.session_id).filter(Boolean))];

        if (sessionIds.length > 0) {
          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, starts_at, ends_at, course_id, courses(id, start_date, end_date)')
            .in('id', sessionIds);

          const { data: coursesData } = await supabase
            .from('courses')
            .select('id, start_date, end_date')
            .in('id', [...new Set(sessionProgressResult.data.map((sp: any) => sp.course_id).filter(Boolean))]);

          const courseMap = new Map();
          if (coursesData) {
            coursesData.forEach(course => {
              courseMap.set(course.id, course);
            });
          }

          const sessionMap = new Map();
          if (sessionsData) {
            sessionsData.forEach(session => {
              sessionMap.set(session.id, session);
            });
          }

          const now = new Date();
          sessionProgressResult.data.forEach((progress: any) => {
            // Validar que la sesión esté habilitada
            const session = sessionMap.get(progress.session_id);
            if (session) {
              let isAvailable = false;

              // Si la sesión tiene fechas, validar contra ellas
              if (session.starts_at && session.ends_at) {
                const startsAt = new Date(session.starts_at);
                const endsAt = new Date(session.ends_at);
                isAvailable = now >= startsAt && now <= endsAt;
              } else {
                // Si no tiene fechas, validar contra fechas del curso
                const course = courseMap.get(session.course_id);
                if (course && course.start_date && course.end_date) {
                  const courseStart = new Date(course.start_date);
                  const courseEnd = new Date(course.end_date);
                  isAvailable = now >= courseStart && now <= courseEnd;
                } else {
                  // Si no hay fechas, considerar disponible
                  isAvailable = true;
                }
              }

              if (!isAvailable) {
                return; // Saltar esta sesión si no está habilitada
              }
            }

            const dateStr = progress.last_accessed_at || progress.updated_at || progress.first_accessed_at;
            if (!dateStr) return;
            const date = new Date(dateStr);
            if (date < startDate) return;

            const dayKey = getDayKey(date, timeframe);
            const hours = (progress.time_spent_minutes || 0) / 60;
            const current = hoursByDay.get(dayKey) || 0;
            hoursByDay.set(dayKey, current + hours);
          });
        }
      }

      // Convertir a array y ordenar
      const result = Array.from(hoursByDay.entries())
        .map(([day, hours]) => ({ day, hours: Math.round(hours * 10) / 10 }))
        .sort((a, b) => {
          if (timeframe === 'weekly') {
            const dayOrder = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
            return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          } else {
            // Para mensual, mantener orden cronológico
            return 0;
          }
        });

      return result;
    } catch (error) {
      console.error('Error obteniendo horas de aprendizaje:', error);
      return [];
    }
  },


  /**
   * Obtiene el tiempo total invertido por categoría (curso o tipo de actividad)
   */
  async getLearningHoursByCategory(studentId: string): Promise<Array<{ category: string; hours: number; minutes: number }>> {
    try {
      const now = new Date();

      // Obtener datos de course_enrollments (fuente principal)
      // Incluir información de fechas del curso para filtrar
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('*, courses(id, title, start_date, end_date)')
        .eq('student_id', studentId);

      if (enrollmentsError) {
        console.error('Error obteniendo horas por categoría:', enrollmentsError);
      }

      // Agrupar por curso desde enrollments, filtrando solo cursos habilitados
      const hoursByCourse = new Map<string, number>();

      if (enrollments && enrollments.length > 0) {
        enrollments.forEach((enrollment: any) => {
          const course = enrollment.courses;
          if (!course) return;

          // Validar que el curso esté habilitado según fechas
          if (course.start_date && course.end_date) {
            const startDate = new Date(course.start_date);
            const endDate = new Date(course.end_date);
            if (now < startDate || now > endDate) {
              return; // Saltar cursos no habilitados
            }
          }

          const courseTitle = course.title || 'Sin categoría';
          // Intentar obtener time_spent_minutes, si no existe, estimar basado en completion_percentage
          let minutes = enrollment.time_spent_minutes || enrollment.time_spent || 0;

          // Si no hay tiempo pero hay progreso, estimar
          if (minutes === 0 && enrollment.completion_percentage > 0) {
            const estimatedCourseHours = 15; // Mismo valor que en getLearningHours
            minutes = Math.round((enrollment.completion_percentage / 100) * estimatedCourseHours * 60);
          }

          if (minutes > 0) {
            const current = hoursByCourse.get(courseTitle) || 0;
            hoursByCourse.set(courseTitle, current + minutes);
          }
        });
      }

      // Si no hay datos en enrollments, intentar con session_progress
      if (hoursByCourse.size === 0) {
        const { data: sessionProgress, error: sessionError } = await supabase
          .from('session_progress')
          .select('time_spent_minutes, course_id, session_id')
          .eq('student_id', studentId)
          .gte('time_spent_minutes', 0);

        if (!sessionError && sessionProgress && sessionProgress.length > 0) {
          // Obtener información de los cursos y sesiones para validar fechas
          const courseIds = [...new Set(sessionProgress.map((sp: any) => sp.course_id).filter(Boolean))];
          const sessionIds = [...new Set(sessionProgress.map((sp: any) => sp.session_id).filter(Boolean))];

          const { data: courses } = await supabase
            .from('courses')
            .select('id, title, start_date, end_date')
            .in('id', courseIds);

          const { data: sessions } = await supabase
            .from('sessions')
            .select('id, starts_at, ends_at, course_id')
            .in('id', sessionIds);

          const courseMap = new Map();
          if (courses) {
            courses.forEach(course => {
              courseMap.set(course.id, course);
            });
          }

          const sessionMap = new Map();
          if (sessions) {
            sessions.forEach(session => {
              sessionMap.set(session.id, session);
            });
          }

          sessionProgress.forEach((progress: any) => {
            // Validar que la sesión esté habilitada
            const session = sessionMap.get(progress.session_id);
            const course = courseMap.get(progress.course_id);

            if (session && course) {
              let isAvailable = false;

              // Si la sesión tiene fechas, validar contra ellas
              if (session.starts_at && session.ends_at) {
                const startsAt = new Date(session.starts_at);
                const endsAt = new Date(session.ends_at);
                isAvailable = now >= startsAt && now <= endsAt;
              } else {
                // Si no tiene fechas, validar contra fechas del curso
                if (course.start_date && course.end_date) {
                  const courseStart = new Date(course.start_date);
                  const courseEnd = new Date(course.end_date);
                  isAvailable = now >= courseStart && now <= courseEnd;
                } else {
                  // Si no hay fechas, considerar disponible
                  isAvailable = true;
                }
              }

              if (!isAvailable) {
                return; // Saltar esta sesión si no está habilitada
              }
            }

            const courseTitle = course?.title || 'Sin categoría';
            const minutes = progress.time_spent_minutes || 0;
            const current = hoursByCourse.get(courseTitle) || 0;
            hoursByCourse.set(courseTitle, current + minutes);
          });
        }
      }

      // Convertir a array y ordenar por horas (descendente)
      const result = Array.from(hoursByCourse.entries())
        .map(([category, totalMinutes]) => {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return { category, hours, minutes };
        })
        .sort((a, b) => {
          const totalA = a.hours * 60 + a.minutes;
          const totalB = b.hours * 60 + b.minutes;
          return totalB - totalA;
        })
        .slice(0, 3); // Top 3

      return result;
    } catch (error) {
      console.error('Error obteniendo horas por categoría:', error);
      return [];
    }
  }
};

