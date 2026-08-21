/**
 * Student Progress Card Component
 * Muestra el progreso del estudiante por sesión con actividades completadas
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { courseEnrollmentService, CourseEnrollment } from '@/services/academicService';
import { sessionService } from '@/services/teacherCourses';

interface SessionProgress {
  sessionId: string;
  sessionTitle: string;
  sessionOrder: number;
  courseId: number;
  courseTitle: string;
  unitId: string | null;
  completedActivities: number;
  totalActivities: number;
  progressPercentage: number;
}

interface StudentProgressCardProps {
  userId: string;
}

export const StudentProgressCard: React.FC<StudentProgressCardProps> = ({ userId }) => {
  const [sessions, setSessions] = useState<SessionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [userId]);

  const loadProgressData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Obtener cursos activos del estudiante
      const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
      const activeEnrollments = enrollments.filter((e) => e.status === 'active');

      const allProgress: SessionProgress[] = [];

      // 2. Para cada curso, obtener sesiones y progreso
      for (const enrollment of activeEnrollments) {
        const courseId = enrollment.course_id;
        const courseTitle =
          (enrollment as CourseEnrollment & { course?: { title?: string } }).course?.title ||
          'Curso';

        // Obtener sesiones del curso
        const courseSessions = await sessionService.getCourseSessions(courseId);

        // Para cada sesión, calcular progreso
        for (let sessionIndex = 0; sessionIndex < courseSessions.length; sessionIndex++) {
          const session = courseSessions[sessionIndex];
          // Contar actividades totales (materiales + assessments + assignments)
          const { data: materials } = await supabase
            .from('materials')
            .select('id')
            .eq('session_id', session.id);

          // Usar assessments en lugar de quizzes (tabla quizzes no existe)
          const { data: assessments } = await supabase
            .from('assessments')
            .select('id')
            .eq('session_id', session.id);

          const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .eq('session_id', session.id);

          const totalActivities =
            (materials?.length || 0) + (assessments?.length || 0) + (assignments?.length || 0);

          // Contar actividades completadas (session_progress puede no existir)
          let sessionProgress = null;
          try {
            const { data } = await supabase
              .from('session_progress')
              .select('is_completed, activities_completed, total_activities')
              .eq('student_id', userId)
              .eq('session_id', session.id)
              .maybeSingle();
            sessionProgress = data;
          } catch (e) {
            // Tabla session_progress puede no existir, continuar sin progreso
          }

          let completedActivities = 0;
          let progressPercentage = 0;

          if (sessionProgress) {
            // Usar las columnas reales de la tabla
            completedActivities = sessionProgress.activities_completed || 0;

            if (totalActivities > 0) {
              progressPercentage = Math.round((completedActivities / totalActivities) * 100);
            } else if (sessionProgress.is_completed) {
              progressPercentage = 100;
            }
          }

          // Usar order_index si existe, sino usar el índice + 1
          const sessionOrder =
            session.order_index != null && session.order_index > 0
              ? session.order_index
              : sessionIndex + 1;

          allProgress.push({
            sessionId: session.id,
            sessionTitle: session.title,
            sessionOrder,
            courseId: courseId,
            courseTitle,
            unitId: session.unit_id || null,
            completedActivities,
            totalActivities,
            progressPercentage,
          });
        }
      }

      // Ordenar por curso y luego por orden de sesión
      allProgress.sort((a, b) => {
        if (a.courseTitle !== b.courseTitle) {
          return a.courseTitle.localeCompare(b.courseTitle);
        }
        return a.sessionOrder - b.sessionOrder;
      });

      setSessions(allProgress);
    } catch (err) {
      console.error('Error cargando progreso del estudiante:', err);
      setError('Error al cargar el progreso');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg h-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg h-full">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg h-full flex flex-col">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Progreso del Estudiante
      </h3>

      {/* Contenedor scrolleable con altura máxima fija */}
      <div
        className="overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        style={{ maxHeight: '320px' }}
      >
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No hay sesiones disponibles</p>
          </div>
        ) : (
          (() => {
            // Agrupar sesiones por curso
            const groupedByCourse: { [key: string]: SessionProgress[] } = {};
            sessions.forEach((session) => {
              if (!groupedByCourse[session.courseTitle]) {
                groupedByCourse[session.courseTitle] = [];
              }
              groupedByCourse[session.courseTitle].push(session);
            });

            return Object.entries(groupedByCourse).map(([courseTitle, courseSessions]) => (
              <div key={courseTitle} className="space-y-2">
                {/* Course Header */}
                <div className="flex items-center gap-2 pb-2 border-b-2 border-indigo-200 dark:border-indigo-800">
                  <span className="text-indigo-600 dark:text-indigo-400">📚</span>
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                    {courseTitle}
                  </h4>
                </div>

                {/* Sessions for this course */}
                <div className="space-y-2 pl-2">
                  {courseSessions.map((session) => (
                    <Link
                      key={session.sessionId}
                      to={`/session/${session.sessionId}`}
                      className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group"
                    >
                      {/* Nombre de la sesión */}
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <span className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 mr-1">
                            Sesión {session.sessionOrder}:
                          </span>
                          {session.sessionTitle}
                        </p>
                      </div>

                      {/* Actividades y porcentaje */}
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {session.completedActivities}/{session.totalActivities} actividades
                        </span>
                        <span
                          className={`font-bold ${
                            session.progressPercentage === 100
                              ? 'text-green-600 dark:text-green-400'
                              : session.progressPercentage > 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {session.progressPercentage}%
                        </span>
                      </div>

                      {/* Barra de progreso */}
                      {session.totalActivities > 0 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              session.progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${session.progressPercentage}%` }}
                          ></div>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ));
          })()
        )}
      </div>
    </div>
  );
};
