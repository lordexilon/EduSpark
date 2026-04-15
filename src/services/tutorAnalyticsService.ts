// services/tutorAnalyticsService.ts
// Servicio para análisis de datos y métricas del Tutor IA

import { supabase } from '@/lib/supabase';
import { getStudentRatingStats, getCourseRatingStats } from './tutorRatingService';

export interface AnalyticsFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  studentIds?: string[];
  activityStatus?: 'all' | 'active' | 'inactive' | 'attention';
}

export interface StudentMetrics {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalInteractions: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  lastInteractionDate: string | null;
  topicsCovered: string[];
  performanceImprovement: number | null;
  // Métricas de ratings
  totalRatings: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
  averageRating: number; // Porcentaje de thumbs up (0-100)
}

export interface CourseMetrics {
  courseId: string;
  courseTitle: string;
  totalStudents: number;
  activeStudents: number; // Estudiantes que han usado el tutor
  participationRate: number; // Tasa de participación (0-100)
  totalInteractions: number;
  totalTokens: number;
  totalCost: number;
  averageInteractionsPerStudent: number;
  topTopics: Array<{ topic: string; count: number }>;
  studentsNeedingAttention: string[]; // IDs de estudiantes
  // Métricas de ratings
  totalRatings: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
  averageRating: number; // Porcentaje de thumbs up (0-100)
}

export interface TopicAnalysis {
  topic: string;
  interactionCount: number;
  uniqueStudents: number;
  averageTokens: number;
  averageCost: number;
}

/**
 * Obtiene métricas de todos los estudiantes de un curso
 */
export async function getStudentMetrics(
  courseId: string | number,
  filters?: AnalyticsFilters
): Promise<StudentMetrics[]> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    console.log('📊 getStudentMetrics: Obteniendo métricas para curso:', courseIdNum, 'con filtros:', filters);

    // Construir consulta de interacciones con filtros
    let query = supabase
      .from('tutor_interactions')
      .select('student_id, tokens_used, cost, response_time_ms, created_at, question')
      .eq('course_id', courseIdNum);

    // Aplicar filtro de fecha desde
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }

    // Aplicar filtro de fecha hasta
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    // Aplicar filtro de estudiantes específicos
    if (filters?.studentIds && filters.studentIds.length > 0) {
      query = query.in('student_id', filters.studentIds);
    }

    query = query.order('created_at', { ascending: false });

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('❌ getStudentMetrics: Error obteniendo interacciones:', interactionsError);
      throw interactionsError;
    }

    console.log('📊 getStudentMetrics: Interacciones encontradas:', interactions?.length || 0);

    // Obtener métricas agregadas
    const { data: performanceData, error: performanceError } = await supabase
      .from('student_tutor_performance')
      .select('student_id, total_interactions, total_tokens_used, total_cost, topics_covered, performance_improvement')
      .eq('course_id', courseIdNum);

    if (performanceError) {
      console.error('❌ getStudentMetrics: Error obteniendo performance:', performanceError);
      throw performanceError;
    }

    console.log('📊 getStudentMetrics: Datos de performance encontrados:', performanceData?.length || 0);

    // Obtener información de estudiantes
    const studentIds = [...new Set(interactions?.map((i) => i.student_id) || [])];
    if (studentIds.length === 0) return [];

    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', studentIds);

    if (studentsError) throw studentsError;

    // Agregar datos por estudiante
    const metricsMap = new Map<string, StudentMetrics>();

    // Inicializar métricas para cada estudiante
    students?.forEach((student) => {
      metricsMap.set(student.id, {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentEmail: student.email,
        totalInteractions: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        lastInteractionDate: null,
        topicsCovered: [],
        performanceImprovement: null,
      });
    });

    console.log('📊 getStudentMetrics: Estudiantes únicos encontrados:', students?.length || 0);

    // Procesar interacciones
    const studentInteractions = new Map<string, any[]>();
    interactions?.forEach((interaction) => {
      if (!studentInteractions.has(interaction.student_id)) {
        studentInteractions.set(interaction.student_id, []);
      }
      studentInteractions.get(interaction.student_id)?.push(interaction);
    });

    // Calcular métricas
    studentInteractions.forEach((studentInteractionsList, studentId) => {
      const metrics = metricsMap.get(studentId);
      if (!metrics) return;

      metrics.totalInteractions = studentInteractionsList.length;
      metrics.totalTokens = studentInteractionsList.reduce(
        (sum, i) => sum + (i.tokens_used || 0),
        0
      );
      metrics.totalCost = studentInteractionsList.reduce(
        (sum, i) => sum + (parseFloat(i.cost) || 0),
        0
      );
      metrics.averageResponseTime =
        studentInteractionsList.length > 0
          ? studentInteractionsList.reduce(
            (sum, i) => sum + (i.response_time_ms || 0),
            0
          ) / studentInteractionsList.length
          : 0;

      const lastInteraction = studentInteractionsList[0];
      if (lastInteraction?.created_at) {
        metrics.lastInteractionDate = lastInteraction.created_at;
      }
    });

    // Agregar datos de performance
    performanceData?.forEach((perf) => {
      const metrics = metricsMap.get(perf.student_id);
      if (metrics) {
        if (perf.topics_covered && perf.topics_covered.length > 0) {
          metrics.topicsCovered = perf.topics_covered;
        }
        if (perf.performance_improvement !== null) {
          metrics.performanceImprovement = parseFloat(perf.performance_improvement);
        }
      }
    });

    // Obtener estadísticas de ratings para cada estudiante
    const resultPromises = Array.from(metricsMap.values()).map(async (metrics) => {
      try {
        const ratingStats = await getStudentRatingStats(metrics.studentId);
        if (ratingStats) {
          metrics.totalRatings = ratingStats.total_ratings;
          metrics.thumbsUpCount = ratingStats.thumbs_up_count;
          metrics.thumbsDownCount = ratingStats.thumbs_down_count;
          metrics.averageRating = ratingStats.average_rating;
        }
      } catch (error) {
        console.error(`Error getting rating stats for student ${metrics.studentId}:`, error);
      }
      return metrics;
    });

    const result = await Promise.all(resultPromises);
    console.log('✅ getStudentMetrics: Métricas calculadas para', result.length, 'estudiantes');
    return result;
  } catch (error) {
    console.error('❌ getStudentMetrics: Error fetching student metrics:', error);
    return [];
  }
}

/**
 * Obtiene métricas generales del curso
 */
export async function getCourseMetrics(
  courseId: string | number,
  filters?: AnalyticsFilters
): Promise<CourseMetrics | null> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    console.log('📊 getCourseMetrics: Obteniendo métricas del curso:', courseIdNum, 'con filtros:', filters);

    // Obtener información del curso
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseIdNum)
      .single();

    if (courseError || !course) {
      console.error('❌ getCourseMetrics: Error obteniendo curso:', courseError);
      throw courseError;
    }

    console.log('📊 getCourseMetrics: Curso encontrado:', course.title);

    // Obtener estudiantes inscritos
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseIdNum);

    if (enrollmentsError) {
      console.error('❌ getCourseMetrics: Error obteniendo inscripciones:', enrollmentsError);
      throw enrollmentsError;
    }

    const totalStudents = new Set(enrollments?.map((e) => e.student_id) || []).size;
    console.log('📊 getCourseMetrics: Total estudiantes inscritos:', totalStudents);

    // Construir consulta de interacciones con filtros
    let query = supabase
      .from('tutor_interactions')
      .select('student_id, tokens_used, cost, question')
      .eq('course_id', courseIdNum);

    // Aplicar filtro de fecha desde
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }

    // Aplicar filtro de fecha hasta
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    // Aplicar filtro de estudiantes específicos
    if (filters?.studentIds && filters.studentIds.length > 0) {
      query = query.in('student_id', filters.studentIds);
    }

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('❌ getCourseMetrics: Error obteniendo interacciones:', interactionsError);
      throw interactionsError;
    }

    console.log('📊 getCourseMetrics: Total interacciones encontradas:', interactions?.length || 0);

    const activeStudents = new Set(interactions?.map((i) => i.student_id) || []).size;
    const totalInteractions = interactions?.length || 0;
    const totalTokens = interactions?.reduce((sum, i) => sum + (i.tokens_used || 0), 0) || 0;
    const totalCost =
      interactions?.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0) || 0;

    // Validación de consistencia de datos
    if (activeStudents > totalStudents) {
      console.warn(
        `Inconsistencia detectada: estudiantes activos (${activeStudents}) > total estudiantes (${totalStudents})`
      );
      // Corregir: no puede haber más activos que totales
      // Esto puede ocurrir si hay estudiantes que ya no están inscritos pero tienen interacciones
    }

    // Análisis de temas (extraer temas de las preguntas)
    const topicCounts = new Map<string, number>();
    interactions?.forEach((interaction) => {
      // Extraer palabras clave de la pregunta (simplificado)
      const words = interaction.question.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 4) {
          // Solo palabras de más de 4 caracteres
          topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
        }
      });
    });

    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Identificar estudiantes que necesitan atención
    // (estudiantes con muchas interacciones pero bajo desempeño, o sin interacciones)
    const { data: performanceData } = await supabase
      .from('student_tutor_performance')
      .select('student_id, total_interactions, performance_improvement')
      .eq('course_id', courseIdNum);

    const studentsNeedingAttention: string[] = [];
    const studentInteractionCounts = new Map<string, number>();
    interactions?.forEach((i) => {
      studentInteractionCounts.set(i.student_id, (studentInteractionCounts.get(i.student_id) || 0) + 1);
    });

    // Estudiantes con muchas interacciones pero bajo desempeño
    performanceData?.forEach((perf) => {
      if (
        perf.total_interactions > 10 &&
        perf.performance_improvement !== null &&
        parseFloat(perf.performance_improvement) < 0
      ) {
        studentsNeedingAttention.push(perf.student_id);
      }
    });

    // Estudiantes sin interacciones
    enrollments?.forEach((enrollment) => {
      if (!studentInteractionCounts.has(enrollment.student_id)) {
        studentsNeedingAttention.push(enrollment.student_id);
      }
    });

    // Calcular tasa de participación con validación
    const participationRate =
      totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;

    // Validar rango de participación (0-100)
    const validatedParticipationRate = Math.max(0, Math.min(100, participationRate));

    // Obtener estadísticas de ratings para el curso
    let ratingStats = {
      total_ratings: 0,
      thumbs_up_count: 0,
      thumbs_down_count: 0,
      average_rating: 0,
    };

    try {
      const courseRatingStats = await getCourseRatingStats(courseIdNum);
      if (courseRatingStats) {
        ratingStats = courseRatingStats;
      }
    } catch (error) {
      console.error('Error getting course rating stats:', error);
    }

    const result = {
      courseId: String(course.id),
      courseTitle: course.title,
      totalStudents,
      activeStudents,
      participationRate: validatedParticipationRate,
      totalInteractions,
      totalTokens,
      totalCost,
      averageInteractionsPerStudent:
        activeStudents > 0 ? totalInteractions / activeStudents : 0,
      topTopics,
      studentsNeedingAttention: [...new Set(studentsNeedingAttention)],
      // Agregar métricas de ratings
      totalRatings: ratingStats.total_ratings,
      thumbsUpCount: ratingStats.thumbs_up_count,
      thumbsDownCount: ratingStats.thumbs_down_count,
      averageRating: ratingStats.average_rating,
    };

    console.log('✅ getCourseMetrics: Métricas calculadas:', {
      courseTitle: result.courseTitle,
      totalStudents: result.totalStudents,
      activeStudents: result.activeStudents,
      participationRate: result.participationRate.toFixed(2) + '%',
      totalInteractions: result.totalInteractions,
      totalCost: result.totalCost.toFixed(4),
    });

    return result;
  } catch (error) {
    console.error('❌ getCourseMetrics: Error fetching course metrics:', error);
    return null;
  }
}

/**
 * Obtiene análisis de temas más consultados
 */
export async function getTopicAnalysis(courseId: string | number): Promise<TopicAnalysis[]> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    const { data: interactions, error } = await supabase
      .from('tutor_interactions')
      .select('question, tokens_used, cost, student_id')
      .eq('course_id', courseIdNum);

    if (error) throw error;

    // Agrupar por temas (simplificado - en producción usar NLP)
    const topicMap = new Map<string, { interactions: any[]; students: Set<string> }>();

    interactions?.forEach((interaction) => {
      // Extraer tema principal de la pregunta (simplificado)
      const words = interaction.question.toLowerCase().split(/\s+/);
      const mainTopic = words.find((w) => w.length > 5) || 'general';

      if (!topicMap.has(mainTopic)) {
        topicMap.set(mainTopic, { interactions: [], students: new Set() });
      }

      const topicData = topicMap.get(mainTopic)!;
      topicData.interactions.push(interaction);
      topicData.students.add(interaction.student_id);
    });

    return Array.from(topicMap.entries()).map(([topic, data]) => ({
      topic,
      interactionCount: data.interactions.length,
      uniqueStudents: data.students.size,
      averageTokens:
        data.interactions.reduce((sum, i) => sum + (i.tokens_used || 0), 0) /
        data.interactions.length,
      averageCost:
        data.interactions.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0) /
        data.interactions.length,
    }));
  } catch (error) {
    console.error('Error fetching topic analysis:', error);
    return [];
  }
}

/**
 * Obtiene estudiantes que necesitan atención
 */
export async function getStudentsNeedingAttention(
  courseId: string | number
): Promise<Array<{ studentId: string; reason: string; priority: 'high' | 'medium' | 'low' }>> {
  try {
    const metrics = await getStudentMetrics(courseId);
    const courseMetrics = await getCourseMetrics(courseId);

    if (!courseMetrics) return [];

    const studentsNeedingAttention: Array<{
      studentId: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    metrics.forEach((student) => {
      // Sin interacciones
      if (student.totalInteractions === 0) {
        studentsNeedingAttention.push({
          studentId: student.studentId,
          reason: 'No ha usado el tutor',
          priority: 'medium',
        });
      }
      // Muchas interacciones pero bajo desempeño
      else if (
        student.totalInteractions > 15 &&
        student.performanceImprovement !== null &&
        student.performanceImprovement < 0
      ) {
        studentsNeedingAttention.push({
          studentId: student.studentId,
          reason: 'Muchas consultas pero bajo desempeño',
          priority: 'high',
        });
      }
      // Sin actividad reciente
      else if (student.lastInteractionDate) {
        const daysSinceLastInteraction =
          (Date.now() - new Date(student.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastInteraction > 7 && student.totalInteractions > 0) {
          studentsNeedingAttention.push({
            studentId: student.studentId,
            reason: 'Sin actividad reciente',
            priority: 'low',
          });
        }
      }
    });

    return studentsNeedingAttention;
  } catch (error) {
    console.error('Error fetching students needing attention:', error);
    return [];
  }
}

