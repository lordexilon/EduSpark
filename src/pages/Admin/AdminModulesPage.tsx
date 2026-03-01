import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getAdminCourseOverview, getModulesByCourse, AdminCourseOverview, CourseModuleRow } from '@/services/adminCourses';
import { subjectService, careerService, Subject, Career } from '@/services/academicService';
import { courseService } from '@/services/teacherCourses';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }>=({ active, onClick, children })=> (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-t-md border ${active ? 'bg-white border-b-transparent' : 'bg-gray-100 border-gray-200 hover:bg-gray-200'}`}
  >
    {children}
  </button>
);

const AdminModulesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'teachers'|'students'>('teachers');
  const [courses, setCourses] = useState<AdminCourseOverview[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string|undefined>();
  const [lastReloadAt, setLastReloadAt] = useState<number>(0);

  const loadData = async () => {
    try {
      setPageLoading(true);
      setError(undefined);
      const data = await getAdminCourseOverview();
      setCourses(data);
    } catch (e:any) {
      setError(e.message || 'Error cargando cursos');
    } finally {
      setPageLoading(false);
      setLastReloadAt(Date.now());
    }
  };

  // Cargar cuando auth listo y hay usuario
  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user?.id]);

  // Reintento breve si no hay cursos tras primera carga
  useEffect(() => {
    if (!authLoading && user && courses.length === 0) {
      const t = setTimeout(() => {
        loadData();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [authLoading, user, courses.length]);

  // Refrescar al volver el foco/visibilidad
  useEffect(() => {
    const onFocus = () => {
      // Evitar recargar en exceso: solo si pasaron >2s
      if (Date.now() - lastReloadAt > 2000 && !pageLoading && user) {
        loadData();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [lastReloadAt, pageLoading, user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Administración: Módulos</h1>

      <div className="flex gap-2 border-b mb-4">
        <TabButton active={tab==='teachers'} onClick={()=>setTab('teachers')}>Por Docente</TabButton>
        <TabButton active={tab==='students'} onClick={()=>setTab('students')}>Por Estudiante</TabButton>
      </div>

      {pageLoading && <div>Cargando...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!pageLoading && !error && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={loadData}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              Recargar
            </button>
          </div>
          {courses.map(course => (
            <CourseCard key={course.course_id} course={course} tab={tab} />
          ))}
        </div>
      )}
    </div>
  );
};

const CourseCard: React.FC<{ course: AdminCourseOverview; tab: 'teachers'|'students' }>=({ course, tab })=>{
  const [modules, setModules] = useState<CourseModuleRow[]>([]);
  const [open, setOpen] = useState(false);
  const [academicInfo, setAcademicInfo] = useState<{subject?: Subject | null; career?: Career | null}>({});
  const [courseData, setCourseData] = useState<any>(null);

  useEffect(() => {
    // Cargar información académica del curso
    (async () => {
      try {
        const data = await courseService.getCourse(course.course_id);
        setCourseData(data);
        if (data?.subject_id) {
          const subject = await subjectService.getSubject(data.subject_id);
          setAcademicInfo(prev => ({ ...prev, subject }));
          if (subject?.career_id) {
            const career = await careerService.getCareer(subject.career_id);
            setAcademicInfo(prev => ({ ...prev, career }));
          }
        }
      } catch (err) {
        console.error('Error loading academic info:', err);
      }
    })();
  }, [course.course_id]);

  useEffect(()=>{
    if (!open) return;
    (async () => {
      const data = await getModulesByCourse(course.course_id);
      setModules(data);
    })();
  }, [open, course.course_id]);

  return (
    <div className="border rounded-md">
      <div className="p-4 flex items-center justify-between bg-gray-50">
        <div>
          <div className="font-medium">{course.course_title || `Curso #${course.course_id}`}</div>
          <div className="text-sm text-gray-600">
            {course.course_code} · {course.module_count} módulos · {course.student_count} estudiantes
            {academicInfo.subject && (
              <span className="ml-2 text-blue-600">
                · {academicInfo.subject.name}
                {academicInfo.career && ` (${academicInfo.career.name})`}
              </span>
            )}
            {courseData?.academic_period && (
              <span className="ml-2 text-gray-500">· {courseData.academic_period}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/teacher/courses/${course.course_id}/modules`}
            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-100"
            title="Gestionar módulos"
          >
            Gestionar
          </Link>
          <button className="text-blue-600" onClick={()=>setOpen(v=>!v)}>{open ? 'Ocultar' : 'Ver módulos'}</button>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-2">
          {modules.length === 0 && <div className="text-sm text-gray-500">Sin módulos</div>}
          {modules.map(m => (
            <div key={m.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-gray-500">Orden {m.order ?? 0}</div>
              </div>
              <Link
                to={`/#/teacher/tutor?courseId=${m.course_id}&moduleId=${m.id}`}
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

export default AdminModulesPage;


