import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getAdminCourseOverview,
  getEnrollmentsByStudent,
  AdminCourseOverview,
} from '@/services/adminCourses';
import ProgressIndicator from '@/components/Common/ProgressIndicator';
import Card from '@/components/Common/Card';

const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminCourseOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const userId = user?.id as string | undefined;
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const [enrs, courses] = await Promise.all([
          getEnrollmentsByStudent(userId),
          getAdminCourseOverview(),
        ]);

        // Guardar enrollments para obtener progreso
        setEnrollments(enrs || []);

        const enrolledCourseIds = new Set<number>(enrs.map((e: any) => e.course_id));
        const filtered = courses.filter((c) => enrolledCourseIds.has(c.course_id));
        if (mounted) setOverview(filtered);
      } catch (e: any) {
        setError(e.message || 'Error cargando cursos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Función helper para obtener el progreso de un curso
  const getCourseProgress = (courseId: number): number => {
    const enrollment = enrollments.find((e: any) => e.course_id === courseId);
    return enrollment?.completion_percentage || 0;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Mis Cursos</h1>
      {loading && <div>Cargando...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {overview.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No estás inscrito en ningún curso aún.</p>
            </div>
          )}
          {overview.map((c) => {
            const progress = getCourseProgress(c.course_id);
            return (
              <Card key={c.course_id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {c.course_title || `Curso #${c.course_id}`}
                    </h3>
                    <div className="text-sm text-gray-600 mb-4">
                      {c.course_code && (
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium mr-2">
                          {c.course_code}
                        </span>
                      )}
                      <span className="text-gray-500">{c.module_count} módulos</span>
                    </div>

                    {/* Indicador de Progreso */}
                    <ProgressIndicator
                      value={progress}
                      label="Progreso"
                      showIcon={true}
                      size="sm"
                      showPercentage={true}
                      className="mb-4"
                    />
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <Link
                      to={`/courses/${c.course_id}`}
                      className="flex-1 text-center text-white bg-primary hover:opacity-90 px-3 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Ver Curso
                    </Link>
                    <Link
                      to={`/tutor?courseId=${c.course_id}`}
                      className="flex-1 text-center text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Tutor IA
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCoursesPage;
