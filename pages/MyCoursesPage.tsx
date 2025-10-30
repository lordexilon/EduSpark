import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { getAdminCourseOverview, getEnrollmentsByStudent, AdminCourseOverview } from '../services/adminCourses.ts';

const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminCourseOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|undefined>();

  const userId = user?.id as string | undefined;

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
        const enrolledCourseIds = new Set<number>(enrs.map((e:any)=> e.course_id));
        const filtered = courses.filter(c => enrolledCourseIds.has(c.course_id));
        if (mounted) setOverview(filtered);
      } catch (e:any) {
        setError(e.message || 'Error cargando cursos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Mis Cursos</h1>
      {loading && <div>Cargando...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {overview.length === 0 && <div className="text-sm text-gray-500">Sin cursos</div>}
          {overview.map(c => (
            <div key={c.course_id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.course_title || `Curso #${c.course_id}`}</div>
                <div className="text-xs text-gray-500">{c.course_code} · {c.module_count} módulos</div>
              </div>
              <Link
                to={`/teacher/tutor?courseId=${c.course_id}`}
                className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
              >
                Abrir Tutor
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCoursesPage;


