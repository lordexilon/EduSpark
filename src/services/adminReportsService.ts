// services/adminReportsService.ts
// Servicio para reportes administrativos globales (solo para admin)

import { supabase } from '../lib/supabase';
import { comprehensiveReportService, CourseComprehensiveReport } from './comprehensiveReportService';
import { costService } from './costService';
import { aiUsageService } from './aiUsageService';
import { costService } from './costService';
import { aiUsageService } from './aiUsageService';

export interface InstitutionReport {
  institutionId: number;
  institutionName: string;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  averageProgress: number;
  totalTutorInteractions: number;
  totalCost: number; // Costo del tutor
  totalTokens: number;
  processingCost: number; // Costos de procesamiento
  aiUsageCost: number; // Costos de uso de IA
  totalAllCosts: number; // Total combinado
  courses: CourseReport[];
}

export interface CareerReport {
  careerId: number;
  careerName: string;
  institutionId: number;
  institutionName: string;
  totalCourses: number;
  totalStudents: number;
  averageProgress: number;
  totalTutorInteractions: number;
  totalCost: number;
  totalTokens: number;
  courses: CourseReport[];
}

export interface CourseReport {
  courseId: number;
  courseTitle: string;
  careerId?: number;
  careerName?: string;
  institutionId: number;
  institutionName: string;
  totalStudents: number;
  averageProgress: number;
  totalTutorInteractions: number;
  totalCost: number;
  totalTokens: number;
  comprehensiveReport?: CourseComprehensiveReport;
}

export interface GlobalMetrics {
  totalInstitutions: number;
  totalCareers: number;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  averageProgress: number;
  totalTutorInteractions: number;
  totalCost: number; // Costo total del tutor (tutor_interactions)
  totalTokens: number;
  // Costos adicionales
  processingCost: number; // Costos de procesamiento de archivos
  aiUsageCost: number; // Costos de uso de IA (Gemini API)
  totalAllCosts: number; // Suma de todos los costos
}

/**
 * Obtiene la institución del usuario (para admin-campus y coordinator)
 */
async function getUserInstitutionId(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('user_institutions')
      .select('institution_id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (error || !data) {
      console.warn('No se encontró institución para el usuario:', userId);
      return null;
    }

    return data.institution_id;
  } catch (error) {
    console.error('Error obteniendo institución del usuario:', error);
    return null;
  }
}

/**
 * Obtiene todos los cursos filtrados por institución si es necesario
 */
async function getCoursesByInstitution(institutionId?: number | null) {
  try {
    if (!institutionId) return [];
    
    // Primero intentar por institution_id directo
    let query = supabase
      .from('courses')
      .select('id, title, institution_id, teacher_id')
      .eq('institution_id', institutionId);

    const { data: coursesByInstitution, error: error1 } = await query;
    
    if (error1) {
      console.warn(`Error obteniendo cursos por institution_id para ${institutionId}:`, error1);
    }
    
    // También buscar por teacher_id -> user_institutions
    // Obtener usuarios de la institución
    const { data: institutionUsers } = await supabase
      .from('user_institutions')
      .select('user_id')
      .eq('institution_id', institutionId);
    
    const userIds = institutionUsers?.map(u => u.user_id) || [];
    
    let coursesByTeacher: any[] = [];
    if (userIds.length > 0) {
      const { data: coursesByTeacherData, error: error2 } = await supabase
        .from('courses')
        .select('id, title, institution_id, teacher_id')
        .in('teacher_id', userIds);
      
      if (!error2 && coursesByTeacherData) {
        coursesByTeacher = coursesByTeacherData;
      }
    }
    
    // Combinar y eliminar duplicados
    const allCourses = [...(coursesByInstitution || []), ...coursesByTeacher];
    const uniqueCourses = Array.from(
      new Map(allCourses.map(c => [c.id, c])).values()
    );
    
    console.log(`[Institución ${institutionId}] Cursos encontrados: ${uniqueCourses.length} (por institution_id: ${coursesByInstitution?.length || 0}, por teacher: ${coursesByTeacher.length})`);
    
    return uniqueCourses;
  } catch (error) {
    console.error('Error en getCoursesByInstitution:', error);
    return [];
  }
}

export const adminReportsService = {
  /**
   * Obtiene la institución del usuario actual
   */
  async getUserInstitutionId(userId: string): Promise<number | null> {
    return getUserInstitutionId(userId);
  },

  /**
   * Obtiene reporte de todas las instituciones
   */
  async getAllInstitutionsReports(
    dateFrom?: string,
    dateTo?: string
  ): Promise<InstitutionReport[]> {
    try {
      // Obtener todas las instituciones
      const { data: institutions, error: institutionsError } = await supabase
        .from('institutions')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (institutionsError) throw institutionsError;
      if (!institutions || institutions.length === 0) return [];

      // Obtener reportes por institución
      const institutionReports = await Promise.all(
        institutions.map(async (institution) => {
          const courses = await getCoursesByInstitution(institution.id);
          
          // Declarar courseIds aquí para que esté disponible en todo el scope
          const courseIds = courses.map(c => c.id);
          
          // Obtener estudiantes de la institución
          // Intentar con course_enrollments primero, luego con enrollments
          let totalStudents = 0;
          
          if (courseIds.length > 0) {
            // Intentar course_enrollments
            const { data: enrollments1 } = await supabase
              .from('course_enrollments')
              .select('student_id, course_id')
              .in('course_id', courseIds);
            
            if (enrollments1 && enrollments1.length > 0) {
              totalStudents = new Set(enrollments1.map(e => e.student_id)).size;
            } else {
              // Intentar enrollments (tabla alternativa)
              const { data: enrollments2 } = await supabase
                .from('enrollments')
                .select('student_id, course_id')
                .in('course_id', courseIds);
              
              if (enrollments2 && enrollments2.length > 0) {
                totalStudents = new Set(enrollments2.map(e => e.student_id)).size;
              }
            }
          } else {
            // Si no hay cursos, buscar estudiantes directamente por user_institutions
            // (estudiantes que pertenecen a la institución)
            const { data: institutionUsers } = await supabase
              .from('user_institutions')
              .select('user_id')
              .eq('institution_id', institution.id);
            
            const userIds = institutionUsers?.map(u => u.user_id) || [];
            
            // Buscar usuarios con rol de estudiante
            if (userIds.length > 0) {
              const { data: students, error: studentsError } = await supabase
                .from('users')
                .select('id, role_id')
                .in('id', userIds);
              
              // Buscar el role_id de "student"
              const { data: studentRole } = await supabase
                .from('roles')
                .select('id')
                .eq('name', 'student')
                .single();
              
              if (students && studentRole) {
                totalStudents = students.filter(s => s.role_id === studentRole.id).length;
              }
            }
          }
          
          console.log(`[${institution.name}] Estudiantes: ${totalStudents}, Cursos: ${courses.length}`);

          // Obtener profesores de la institución
          const { data: teachers } = await supabase
            .from('courses')
            .select('teacher_id')
            .eq('institution_id', institution.id);

          const totalTeachers = new Set(teachers?.map(t => t.teacher_id) || []).size;

          // Obtener reportes de cursos
          const courseReports = await Promise.all(
            courses.map(async (course) => {
              const report = await comprehensiveReportService.getCourseComprehensiveReport(
                course.id,
                dateFrom,
                dateTo
              );

              return {
                courseId: course.id,
                courseTitle: course.title,
                institutionId: institution.id,
                institutionName: institution.name,
                totalStudents: report?.aggregated.totalStudents || 0,
                averageProgress: report?.aggregated.averageProgress || 0,
                totalTutorInteractions: report?.aggregated.averageTutorInteractions * (report?.aggregated.totalStudents || 0) || 0,
                totalCost: report?.aggregated.totalCost || 0,
                totalTokens: report?.aggregated.totalTokens || 0,
                comprehensiveReport: report || undefined
              } as CourseReport;
            })
          );

          // Calcular métricas agregadas
          const totalCourses = courses.length;
          const totalTutorInteractions = courseReports.reduce((sum, c) => sum + c.totalTutorInteractions, 0);
          const totalCost = courseReports.reduce((sum, c) => sum + c.totalCost, 0);
          const totalTokens = courseReports.reduce((sum, c) => sum + c.totalTokens, 0);
          const averageProgress = courseReports.length > 0
            ? courseReports.reduce((sum, c) => sum + c.averageProgress, 0) / courseReports.length
            : 0;

          // Obtener costos del tutor directamente desde tutor_interactions
          // Buscar por course_id Y por user_id (a través de user_institutions)
          // Reutilizar courseIds ya declarado arriba (línea 185)
          const { data: institutionUsers } = await supabase
            .from('user_institutions')
            .select('user_id')
            .eq('institution_id', institution.id);
          
          const userIds = institutionUsers?.map(u => u.user_id) || [];
          
          let tutorCost = 0; // Empezar desde 0 y sumar todo
          
          try {
            // Buscar costos por course_id
            if (courseIds.length > 0) {
              const { data: tutorInteractionsByCourse, error: tutorError } = await supabase
                .from('tutor_interactions')
                .select('cost, course_id, student_id')
                .in('course_id', courseIds);

              if (!tutorError && tutorInteractionsByCourse) {
                tutorCost = tutorInteractionsByCourse.reduce((sum, interaction) => {
                  const cost = parseFloat(interaction.cost) || 0;
                  return sum + cost;
                }, 0);
                console.log(`[${institution.name}] Tutor cost by course: ${tutorCost}, interactions: ${tutorInteractionsByCourse.length}`);
              }
            }
            
            // Buscar costos por user_id (estudiantes de la institución) que NO estén en nuestros cursos
            if (userIds.length > 0) {
              const { data: tutorInteractionsByUser, error: tutorError2 } = await supabase
                .from('tutor_interactions')
                .select('cost, course_id, student_id')
                .in('student_id', userIds);

              if (!tutorError2 && tutorInteractionsByUser) {
                // Solo sumar los que NO están ya contados por course_id
                const courseIdsSet = new Set(courseIds);
                const costByUser = tutorInteractionsByUser.reduce((sum, interaction) => {
                  // Si tiene course_id y está en nuestros cursos, ya fue contado arriba
                  if (interaction.course_id && courseIdsSet.has(interaction.course_id)) {
                    return sum;
                  }
                  const cost = parseFloat(interaction.cost) || 0;
                  return sum + cost;
                }, 0);
                
                tutorCost += costByUser;
                console.log(`[${institution.name}] Tutor cost by user (additional): ${costByUser}`);
              }
            }
            
            // Si no encontramos costos directos, usar los de los reportes
            if (tutorCost === 0 && totalCost > 0) {
              tutorCost = totalCost;
              console.log(`[${institution.name}] Using tutor cost from reports: ${totalCost}`);
            }
          } catch (error) {
            console.warn(`Error obteniendo costos del tutor para institución ${institution.id}:`, error);
            // Si hay error, usar el costo de los reportes
            tutorCost = totalCost;
          }
          
          const finalTutorCost = tutorCost;

          // Obtener costos de procesamiento por institución
          // Buscar por course_id Y por user_id (a través de user_institutions)
          // Reutilizar userIds y courseIds ya obtenidos arriba
          let processingCost = 0;
          try {
            
            // Buscar costos por course_id (incluyendo NULL para capturar todos)
            if (courseIds.length > 0) {
              const { data: processingCostsByCourse, error: processingError } = await supabase
                .from('processing_costs')
                .select('actual_costs, course_id')
                .in('course_id', courseIds);

              if (!processingError && processingCostsByCourse) {
                processingCost += processingCostsByCourse.reduce((sum, cost) => {
                  return sum + (cost.actual_costs?.total || 0);
                }, 0);
              }
            }
            
            // Buscar costos por user_id (todos, no solo los sin course_id)
            // Esto captura costos que pueden no estar asociados a un curso específico
            if (userIds.length > 0) {
              const { data: processingCostsByUser, error: processingError2 } = await supabase
                .from('processing_costs')
                .select('actual_costs, user_id, course_id')
                .in('user_id', userIds);

              if (!processingError2 && processingCostsByUser) {
                // Solo sumar los que NO están ya contados por course_id
                const courseIdsSet = new Set(courseIds);
                processingCost += processingCostsByUser.reduce((sum, cost) => {
                  // Si tiene course_id y está en nuestros cursos, ya fue contado arriba
                  if (cost.course_id && courseIdsSet.has(cost.course_id)) {
                    return sum;
                  }
                  return sum + (cost.actual_costs?.total || 0);
                }, 0);
              }
            }
            
            console.log(`[${institution.name}] Processing cost: ${processingCost}, courses: ${courseIds.length}, users: ${userIds.length}`);
          } catch (error) {
            console.warn(`Error obteniendo costos de procesamiento para institución ${institution.id}:`, error);
          }

          // Obtener costos de uso de IA por institución
          // Buscar por course_id Y por user_id (a través de user_institutions)
          // Reutilizar userIds y courseIds ya obtenidos arriba
          let aiUsageCost = 0;
          try {
            
            // Buscar costos por course_id
            if (courseIds.length > 0) {
              const { data: aiUsageByCourse, error: aiError } = await supabase
                .from('ai_usage_tracking')
                .select('total_cost, course_id')
                .in('course_id', courseIds);

              if (!aiError && aiUsageByCourse) {
                aiUsageCost += aiUsageByCourse.reduce((sum, usage) => {
                  return sum + (usage.total_cost || 0);
                }, 0);
              }
            }
            
            // Buscar costos por user_id (todos, no solo los sin course_id)
            if (userIds.length > 0) {
              const { data: aiUsageByUser, error: aiError2 } = await supabase
                .from('ai_usage_tracking')
                .select('total_cost, user_id, course_id')
                .in('user_id', userIds);

              if (!aiError2 && aiUsageByUser) {
                // Solo sumar los que NO están ya contados por course_id
                const courseIdsSet = new Set(courseIds);
                aiUsageCost += aiUsageByUser.reduce((sum, usage) => {
                  // Si tiene course_id y está en nuestros cursos, ya fue contado arriba
                  if (usage.course_id && courseIdsSet.has(usage.course_id)) {
                    return sum;
                  }
                  return sum + (usage.total_cost || 0);
                }, 0);
              }
            }
            
            console.log(`[${institution.name}] AI usage cost: ${aiUsageCost}, courses: ${courseIds.length}, users: ${userIds.length}`);
          } catch (error) {
            console.warn(`Error obteniendo costos de IA para institución ${institution.id}:`, error);
          }

          const totalAllCosts = finalTutorCost + processingCost + aiUsageCost;
          
          console.log(`[${institution.name}] Total costs - Tutor: ${finalTutorCost}, Processing: ${processingCost}, AI: ${aiUsageCost}, Total: ${totalAllCosts}`);

          return {
            institutionId: institution.id,
            institutionName: institution.name,
            totalCourses,
            totalStudents,
            totalTeachers,
            averageProgress,
            totalTutorInteractions,
            totalCost: finalTutorCost, // Usar el costo calculado directamente
            totalTokens,
            processingCost,
            aiUsageCost,
            totalAllCosts: finalTutorCost + processingCost + aiUsageCost, // Recalcular total
            courses: courseReports
          } as InstitutionReport;
        })
      );

      return institutionReports;
    } catch (error) {
      console.error('Error obteniendo reportes de instituciones:', error);
      return [];
    }
  },

  /**
   * Obtiene métricas globales agregadas
   */
  async getGlobalMetrics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<GlobalMetrics> {
    try {
      const institutions = await this.getAllInstitutionsReports(dateFrom, dateTo);

      const totalInstitutions = institutions.length;
      const totalCourses = institutions.reduce((sum, i) => sum + i.totalCourses, 0);
      const totalStudents = institutions.reduce((sum, i) => sum + i.totalStudents, 0);
      const totalTeachers = institutions.reduce((sum, i) => sum + i.totalTeachers, 0);
      const totalTutorInteractions = institutions.reduce((sum, i) => sum + i.totalTutorInteractions, 0);
      const totalCost = institutions.reduce((sum, i) => sum + i.totalCost, 0); // Costo del tutor
      const totalTokens = institutions.reduce((sum, i) => sum + i.totalTokens, 0);
      
      const allProgress = institutions.map(i => i.averageProgress).filter(p => p > 0);
      const averageProgress = allProgress.length > 0
        ? allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length
        : 0;

      // Obtener total de carreras
      const { data: careers, error: careersError } = await supabase
        .from('careers')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      const totalCareers = careersError ? 0 : (careers?.length || 0);

      // Obtener costos adicionales
      let processingCost = 0;
      let aiUsageCost = 0;

      try {
        // Costos de procesamiento de archivos
        const processingStats = await costService.getOverallStats();
        processingCost = processingStats.totalCost || 0;
      } catch (error) {
        console.warn('Error obteniendo costos de procesamiento:', error);
      }

      try {
        // Costos de uso de IA (Gemini API)
        const aiUsageStats = await aiUsageService.getTotalUsageStats();
        aiUsageCost = aiUsageStats.totalCost || 0;
      } catch (error) {
        console.warn('Error obteniendo costos de uso de IA:', error);
      }

      // Costo total combinado
      const totalAllCosts = totalCost + processingCost + aiUsageCost;

      return {
        totalInstitutions,
        totalCareers,
        totalCourses,
        totalStudents,
        totalTeachers,
        averageProgress,
        totalTutorInteractions,
        totalCost, // Costo del tutor
        totalTokens,
        processingCost, // Costos de procesamiento
        aiUsageCost, // Costos de uso de IA
        totalAllCosts // Total combinado
      };
    } catch (error) {
      console.error('Error obteniendo métricas globales:', error);
      return {
        totalInstitutions: 0,
        totalCareers: 0,
        totalCourses: 0,
        totalStudents: 0,
        totalTeachers: 0,
        averageProgress: 0,
        totalTutorInteractions: 0,
        totalCost: 0,
        totalTokens: 0,
        processingCost: 0,
        aiUsageCost: 0,
        totalAllCosts: 0
      };
    }
  }
};

