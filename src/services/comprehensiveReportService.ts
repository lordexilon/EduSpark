// services/comprehensiveReportService.ts
// Servicio unificado que combina progreso académico y analíticas del Tutor IA

import { supabase } from '@/lib/supabase';
import { progressService } from './progressService';
import { getStudentMetrics, getCourseMetrics, StudentMetrics } from './tutorAnalyticsService';
import { courseEnrollmentService } from './academicService';
import { unitService, sessionService } from './teacherCourses';
import { quizService } from './quizService';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface AcademicProgress {
  completionPercentage: number;
  completedUnits: number;
  totalUnits: number;
  completedSessions: number;
  totalSessions: number;
  completedQuizzes: number;
  totalQuizzes: number;
  completedFlashcards: number; // ⭐ NUEVO
  totalFlashcards: number; // ⭐ NUEVO
  timeSpentMinutes: number;
}

export interface TutorMetrics {
  totalInteractions: number;
  totalTokens: number;
  totalCost: number;
  lastInteractionDate: string | null;
  topicsCovered: string[];
  performanceImprovement: number | null;
  averageResponseTime: number;
}

export interface StudentInsights {
  tutorUsageVsProgress: 'high-usage-high-progress' | 'high-usage-low-progress' | 'low-usage-high-progress' | 'low-usage-low-progress';
  recommendedActions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  efficiency: number; // Progreso por interacción
}

export interface ComprehensiveStudentData {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  academicProgress: AcademicProgress;
  tutorMetrics: TutorMetrics;
  insights: StudentInsights;
}

export interface CorrelationAnalysis {
  positiveCorrelation: number; // % de estudiantes con correlación positiva
  negativeCorrelation: number; // % de estudiantes con correlación negativa
  averageProgress: number;
  averageTutorUsage: number;
  efficiencyScore: number; // Eficiencia promedio del tutor
}

export interface AggregatedMetrics {
  totalStudents: number;
  averageProgress: number;
  averageTutorInteractions: number;
  studentsWithPositiveCorrelation: number;
  studentsNeedingAttention: number;
  totalCost: number;
  totalTokens: number;
}

export interface CourseComprehensiveReport {
  courseId: number;
  courseTitle: string;
  students: ComprehensiveStudentData[];
  aggregated: AggregatedMetrics;
  correlation: CorrelationAnalysis;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Calcula el progreso académico de un estudiante
 */
async function getAcademicProgress(
  studentId: string,
  courseId: number
): Promise<AcademicProgress> {
  try {
    // Obtener totales del curso
    const [units, sessions, quizzes] = await Promise.all([
      unitService.getCourseUnits(courseId),
      sessionService.getCourseSessions(courseId),
      quizService.getCourseAssessments(courseId, ['quiz', 'trivia'])
    ]);

    // Obtener flashcards del curso ⭐ NUEVO
    const { getFlashcardsByCourse } = await import('./flashcardService');
    const flashcards = await getFlashcardsByCourse(courseId);

    const totalUnits = units.length;
    const totalSessions = sessions.length;
    const totalQuizzes = quizzes.length;
    const totalFlashcards = flashcards.length; // ⭐ NUEVO

    // Obtener completados
    const [completedUnits, completedSessions, completedQuizzes, completedFlashcards, enrollment] = await Promise.all([
      // Unidades completadas
      supabase
        .from('unit_progress')
        .select('unit_id', { count: 'exact' })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('is_completed', true)
        .then(({ count }) => count || 0),

      // Sesiones completadas
      supabase
        .from('session_progress')
        .select('session_id', { count: 'exact' })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('is_completed', true)
        .then(({ count }) => count || 0),

      // Quizzes completados
      (async () => {
        const quizIds = quizzes.map(q => q.id);
        if (quizIds.length === 0) return 0;

        const { data } = await supabase
          .from('assessment_attempts')
          .select('assessment_id')
          .eq('student_id', studentId)
          .in('assessment_id', quizIds)
          .in('status', ['submitted', 'graded']);

        return new Set(data?.map(a => a.assessment_id) || []).size;
      })(),

      // Flashcards dominadas (mastery_level >= 4) ⭐ NUEVO
      (async () => {
        if (flashcards.length === 0) return 0;

        const flashcardIds = flashcards.map(f => f.id);
        const { data } = await supabase
          .from('flashcard_progress')
          .select('flashcard_id')
          .eq('student_id', studentId)
          .in('flashcard_id', flashcardIds)
          .gte('mastery_level', 4); // Dominadas

        return new Set(data?.map(p => p.flashcard_id) || []).size;
      })(),

      // Enrollment para tiempo invertido
      courseEnrollmentService.getStudentEnrollments(studentId)
        .then(enrollments => enrollments.find(e => e.course_id === courseId))
        .catch(() => null)
    ]);

    // Calcular porcentaje de completitud
    const completionPercentage = enrollment?.completion_percentage || 0;

    return {
      completionPercentage,
      completedUnits,
      totalUnits,
      completedSessions,
      totalSessions,
      completedFlashcards, // ⭐ NUEVO
      totalFlashcards, // ⭐ NUEVO
      completedQuizzes,
      totalQuizzes,
      timeSpentMinutes: enrollment?.time_spent_minutes || 0
    };
  } catch (error) {
    console.error('Error obteniendo progreso académico:', error);
    return {
      completionPercentage: 0,
      completedUnits: 0,
      totalUnits: 0,
      completedSessions: 0,
      totalSessions: 0,
      completedQuizzes: 0,
      totalQuizzes: 0,
      timeSpentMinutes: 0
    };
  }
}

/**
 * Obtiene métricas del Tutor IA para un estudiante
 */
async function getTutorMetricsForStudent(
  studentId: string,
  courseId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<TutorMetrics> {
  try {
    const courseIdNum = typeof courseId === 'string' ? parseInt(String(courseId), 10) : courseId;

    // Construir query base
    let query = supabase
      .from('tutor_interactions')
      .select('tokens_used, cost, response_time_ms, created_at, question')
      .eq('student_id', studentId)
      .eq('course_id', courseIdNum);

    // Aplicar filtros de fecha si se proporcionan
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      // Agregar un día completo para incluir todo el día final
      const dateToEnd = new Date(dateTo);
      dateToEnd.setHours(23, 59, 59, 999);
      query = query.lte('created_at', dateToEnd.toISOString());
    }

    const { data: interactions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo interacciones del tutor:', error);
      return {
        totalInteractions: 0,
        totalTokens: 0,
        totalCost: 0,
        lastInteractionDate: null,
        topicsCovered: [],
        performanceImprovement: null,
        averageResponseTime: 0
      };
    }

    const totalInteractions = interactions?.length || 0;
    const totalTokens = interactions?.reduce((sum, i) => sum + (i.tokens_used || 0), 0) || 0;
    const totalCost = interactions?.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0) || 0;
    const averageResponseTime = totalInteractions > 0
      ? interactions!.reduce((sum, i) => sum + (i.response_time_ms || 0), 0) / totalInteractions
      : 0;
    const lastInteractionDate = interactions && interactions.length > 0
      ? interactions[0].created_at
      : null;

    // Obtener temas cubiertos y mejora de desempeño
    const { data: performance, error: performanceError } = await supabase
      .from('student_tutor_performance')
      .select('topics_covered, performance_improvement')
      .eq('student_id', studentId)
      .eq('course_id', courseIdNum)
      .maybeSingle(); // Usar maybeSingle() en lugar de single() para manejar 0 filas

    // Si hay error o no hay datos, usar valores por defecto
    const topicsCovered = performance?.topics_covered || [];
    const performanceImprovement = performance?.performance_improvement
      ? parseFloat(performance.performance_improvement)
      : null;

    return {
      totalInteractions,
      totalTokens,
      totalCost,
      lastInteractionDate,
      topicsCovered,
      performanceImprovement,
      averageResponseTime
    };
  } catch (error) {
    console.error('Error obteniendo métricas del tutor:', error);
    return {
      totalInteractions: 0,
      totalTokens: 0,
      totalCost: 0,
      lastInteractionDate: null,
      topicsCovered: [],
      performanceImprovement: null,
      averageResponseTime: 0
    };
  }
}

/**
 * Calcula insights basados en progreso académico y uso del tutor
 */
function calculateInsights(
  academicProgress: AcademicProgress,
  tutorMetrics: TutorMetrics,
  averageProgress?: number,
  averageTutorUsage?: number
): StudentInsights {
  const progress = academicProgress.completionPercentage;
  const tutorUsage = tutorMetrics.totalInteractions;

  const avgProgress = averageProgress || 50;
  const avgUsage = averageTutorUsage || 5;

  // Determinar tipo de correlación
  let tutorUsageVsProgress: StudentInsights['tutorUsageVsProgress'];
  if (progress > avgProgress && tutorUsage > avgUsage) {
    tutorUsageVsProgress = 'high-usage-high-progress';
  } else if (progress < avgProgress && tutorUsage > avgUsage) {
    tutorUsageVsProgress = 'high-usage-low-progress';
  } else if (progress > avgProgress && tutorUsage <= avgUsage) {
    tutorUsageVsProgress = 'low-usage-high-progress';
  } else {
    tutorUsageVsProgress = 'low-usage-low-progress';
  }

  // Calcular eficiencia: Score de 0 a 100
  // Definición: 100% de eficiencia si se obtiene al menos 2% de progreso por interacción
  const rawEfficiency = tutorUsage > 0 ? (progress / tutorUsage) : 0;
  const efficiency = Math.min(100, rawEfficiency * 50); // 2% per interaction * 50 = 100%

  // Determinar nivel de riesgo
  let riskLevel: 'low' | 'medium' | 'high';
  if (progress < 50 && tutorUsage > 20) {
    riskLevel = 'high';
  } else if (progress < 50 || tutorUsage === 0) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Generar recomendaciones
  const recommendedActions: string[] = [];

  if (tutorUsageVsProgress === 'high-usage-low-progress') {
    recommendedActions.push('Revisar calidad de las consultas al tutor');
    recommendedActions.push('Considerar tutoría adicional o material de apoyo');
  } else if (tutorUsageVsProgress === 'low-usage-high-progress') {
    recommendedActions.push('Compartir estrategias de estudio con otros estudiantes');
  } else if (tutorUsageVsProgress === 'low-usage-low-progress') {
    recommendedActions.push('Fomentar uso del tutor para mejorar comprensión');
    recommendedActions.push('Revisar dificultades específicas del estudiante');
  } else if (tutorUsageVsProgress === 'high-usage-high-progress') {
    recommendedActions.push('Mantener estrategia actual');
  }

  if (academicProgress.completedUnits < academicProgress.totalUnits) {
    recommendedActions.push(`Completar ${academicProgress.totalUnits - academicProgress.completedUnits} unidad(es) restante(s)`);
  }

  if (academicProgress.completedQuizzes < academicProgress.totalQuizzes) {
    recommendedActions.push(`Realizar ${academicProgress.totalQuizzes - academicProgress.completedQuizzes} quiz(zes) pendiente(s)`);
  }

  return {
    tutorUsageVsProgress,
    recommendedActions,
    riskLevel,
    efficiency
  };
}

/**
 * Analiza correlación entre progreso y uso del tutor
 */
function analyzeCorrelation(
  students: ComprehensiveStudentData[]
): CorrelationAnalysis {
  if (students.length === 0) {
    return {
      positiveCorrelation: 0,
      negativeCorrelation: 0,
      averageProgress: 0,
      averageTutorUsage: 0,
      efficiencyScore: 0
    };
  }

  const totalStudents = students.length;
  let positiveCount = 0;
  let negativeCount = 0;
  let totalProgress = 0;
  let totalTutorUsage = 0;
  let totalEfficiency = 0;

  students.forEach(student => {
    const { academicProgress, tutorMetrics, insights } = student;

    totalProgress += academicProgress.completionPercentage;
    totalTutorUsage += tutorMetrics.totalInteractions;
    totalEfficiency += insights.efficiency;

    if (insights.tutorUsageVsProgress === 'high-usage-high-progress') {
      positiveCount++;
    } else if (insights.tutorUsageVsProgress === 'high-usage-low-progress') {
      negativeCount++;
    }
  });

  return {
    positiveCorrelation: (positiveCount / totalStudents) * 100,
    negativeCorrelation: (negativeCount / totalStudents) * 100,
    averageProgress: totalProgress / totalStudents,
    averageTutorUsage: totalTutorUsage / totalStudents,
    efficiencyScore: totalEfficiency / totalStudents
  };
}

/**
 * Calcula métricas agregadas del curso
 */
function calculateAggregatedMetrics(
  students: ComprehensiveStudentData[]
): AggregatedMetrics {
  if (students.length === 0) {
    return {
      totalStudents: 0,
      averageProgress: 0,
      averageTutorInteractions: 0,
      studentsWithPositiveCorrelation: 0,
      studentsNeedingAttention: 0,
      totalCost: 0,
      totalTokens: 0
    };
  }

  const totalStudents = students.length;
  let totalProgress = 0;
  let totalInteractions = 0;
  let positiveCorrelation = 0;
  let needingAttention = 0;
  let totalCost = 0;
  let totalTokens = 0;

  students.forEach(student => {
    totalProgress += student.academicProgress.completionPercentage;
    totalInteractions += student.tutorMetrics.totalInteractions;
    totalCost += student.tutorMetrics.totalCost;
    totalTokens += student.tutorMetrics.totalTokens;

    if (student.insights.tutorUsageVsProgress === 'high-usage-high-progress') {
      positiveCorrelation++;
    }

    if (student.insights.riskLevel === 'high' || student.insights.riskLevel === 'medium') {
      needingAttention++;
    }
  });

  return {
    totalStudents,
    averageProgress: totalProgress / totalStudents,
    averageTutorInteractions: totalInteractions / totalStudents,
    studentsWithPositiveCorrelation: positiveCorrelation,
    studentsNeedingAttention: needingAttention,
    totalCost,
    totalTokens
  };
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export const comprehensiveReportService = {
  /**
   * Obtiene informe completo de un estudiante
   */
  async getStudentComprehensiveReport(
    studentId: string,
    courseId: number,
    averageProgress?: number,
    averageTutorUsage?: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ComprehensiveStudentData | null> {
    try {
      // Obtener nombre del estudiante
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', studentId)
        .maybeSingle();

      if (studentError || !studentData) {
        console.error('Error obteniendo datos del estudiante:', studentError);
        return null;
      }

      const studentName = `${studentData.first_name} ${studentData.last_name}`;

      // Obtener progreso académico y métricas del tutor en paralelo
      const [academicProgress, tutorMetrics] = await Promise.all([
        getAcademicProgress(studentId, courseId),
        getTutorMetricsForStudent(studentId, courseId, dateFrom, dateTo)
      ]);

      // Calcular insights
      const insights = calculateInsights(
        academicProgress,
        tutorMetrics,
        averageProgress,
        averageTutorUsage
      );

      return {
        studentId,
        studentName,
        studentEmail: studentData.email,
        academicProgress,
        tutorMetrics,
        insights
      };
    } catch (error) {
      console.error('Error obteniendo informe comprehensivo del estudiante:', error);
      return null;
    }
  },

  /**
   * Obtiene informe completo del curso
   */
  async getCourseComprehensiveReport(
    courseId: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<CourseComprehensiveReport | null> {
    try {
      // Obtener información del curso
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        console.error('Error obteniendo curso:', courseError);
        return null;
      }

      // Obtener estudiantes inscritos
      const enrollments = await courseEnrollmentService.getCourseStudents(courseId);
      const activeEnrollments = enrollments.filter(e => e.status === 'active');

      if (activeEnrollments.length === 0) {
        return {
          courseId,
          courseTitle: course.title,
          students: [],
          aggregated: {
            totalStudents: 0,
            averageProgress: 0,
            averageTutorInteractions: 0,
            studentsWithPositiveCorrelation: 0,
            studentsNeedingAttention: 0,
            totalCost: 0,
            totalTokens: 0
          },
          correlation: {
            positiveCorrelation: 0,
            negativeCorrelation: 0,
            averageProgress: 0,
            averageTutorUsage: 0,
            efficiencyScore: 0
          }
        };
      }

      // Obtener métricas del curso para calcular promedios
      const courseMetrics = await getCourseMetrics(courseId);
      const averageProgress = courseMetrics
        ? enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / enrollments.length
        : 50;
      const averageTutorUsage = courseMetrics?.averageInteractionsPerStudent || 5;

      // Obtener informe de cada estudiante
      const studentReports = await Promise.all(
        activeEnrollments.map(enrollment =>
          this.getStudentComprehensiveReport(
            enrollment.student_id,
            courseId,
            averageProgress,
            averageTutorUsage,
            dateFrom,
            dateTo
          )
        )
      );

      // Filtrar nulos
      const students = studentReports.filter(
        (s): s is ComprehensiveStudentData => s !== null
      );

      // Calcular métricas agregadas
      const aggregated = calculateAggregatedMetrics(students);

      // Análisis de correlación
      const correlation = analyzeCorrelation(students);

      return {
        courseId,
        courseTitle: course.title,
        students,
        aggregated,
        correlation
      };
    } catch (error) {
      console.error('Error obteniendo informe comprehensivo del curso:', error);
      return null;
    }
  },

  /**
   * Analiza correlación entre progreso y uso del tutor
   */
  async analyzeCorrelation(courseId: number): Promise<CorrelationAnalysis> {
    const report = await this.getCourseComprehensiveReport(courseId);
    return report?.correlation || {
      positiveCorrelation: 0,
      negativeCorrelation: 0,
      averageProgress: 0,
      averageTutorUsage: 0,
      efficiencyScore: 0
    };
  },

  /**
   * Dispara manualmente la generación de reportes semanales (vía Edge Function)
   */
  async triggerWeeklyReportGeneration(): Promise<{ message: string; details?: any } | null> {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-weekly-reports', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error disparando generación de reportes semanales:', error);
      return null;
    }
  }
};

