import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { courseService, Course } from '@/services/teacherCourses';
import { assignmentService } from '@/services/assignments';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  IconBookOpen,
  IconStudent,
  IconClipboardList,
  IconGraduationCap,
  IconPlusCircle,
  IconMessage,
  IconCalendar,
  IconUserGroup,
} from '@/components/Common/Icons';

interface CourseWithExtras extends Course {
  enrollmentsCount?: number;
}

const formatRelativeTime = (isoDate?: string | null) => {
  if (!isoDate) {
    return 'Sin actividad';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Sin actividad';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    activeCourses: 0,
    totalStudents: 0,
    pendingAssignments: 0,
    forumsCount: 0,
  });
  const [recentForums, setRecentForums] = useState<
    { id: number; title: string; last_message_at: string | null }[]
  >([]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const isAdmin = user?.role?.name === 'admin';

      // Cargar cursos según rol
      const coursesData = isAdmin
        ? await courseService.getAllCourses()
        : await courseService.getMyCourses(user!.id);

      // Obtener IDs de los cursos
      const courseIds = coursesData.map(c => c.id);

      // Calcular total de estudiantes (para admin podría ser total del sistema, para profe solo sus alumnos)
      let totalStudents = 0;

      if (isAdmin) {
        // Para admin, intentar obtener conteo total si es posible, o sumar inscripciones únicas
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', (await supabase.from('roles').select('id').eq('name', 'student').single()).data?.id);

        if (!error && count !== null) {
          totalStudents = count;
        }
      } else {
        if (courseIds.length > 0) {
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('course_enrollments')
            .select('student_id')
            .in('course_id', courseIds);

          if (!enrollmentsError && enrollments) {
            const uniqueStudents = new Set(enrollments.map(e => e.student_id));
            totalStudents = uniqueStudents.size;
          }
        }
      }

      // Calcular tareas pendientes
      let pendingAssignments = 0;
      if (courseIds.length > 0) {
        // Optimización: Limitar a los primeros 10 cursos para no saturar si es admin
        const targetCourseIds = isAdmin ? courseIds.slice(0, 10) : courseIds;

        const allAssignments = await Promise.all(
          targetCourseIds.map(courseId => assignmentService.getAssignmentsWithSubmissions(courseId))
        );

        allAssignments.flat().forEach(assignment => {
          if (assignment.submissions) {
            const ungraded = assignment.submissions.filter(s => s.grade === null);
            pendingAssignments += ungraded.length;
          }
        });
      }

      // Foros (Admin ve últimos del sistema, Profe ve los suyos)
      let forumsQuery = supabase
        .from('forum_topics')
        .select('id, title, last_message_at, created_at');

      if (!isAdmin) {
        forumsQuery = forumsQuery.eq('created_by', user!.id);
      }

      const { data: forumsData } = await forumsQuery
        .order('last_message_at', { ascending: false, nullsLast: false })
        .order('created_at', { ascending: false })
        .limit(10);

      const forumsCount = forumsData?.length ?? 0;
      const recentForumsData =
        forumsData?.slice(0, 5).map((topic) => ({
          id: topic.id,
          title: topic.title,
          last_message_at: topic.last_message_at ?? topic.created_at,
        })) ?? [];

      // Calcular inscripciones para cada curso (limitar para admin para rendimiento)
      const coursesToProcess = isAdmin ? coursesData.slice(0, 20) : coursesData;
      const coursesWithExtras = await Promise.all(
        coursesToProcess.map(async (course) => {
          const { count, error } = await supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);
          return {
            ...course,
            enrollmentsCount: count || 0,
          };
        })
      );

      setCourses(coursesWithExtras);
      setRecentForums(recentForumsData);
      setStats({
        totalCourses: coursesData.length,
        activeCourses: coursesData.filter((c) => c.status === 'active').length,
        totalStudents,
        pendingAssignments,
        forumsCount,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header con Acciones (Estilo Image 2) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="uppercase tracking-wider">PANEL DE CONTROL</span>
            <span>›</span>
            <span className="font-semibold text-brand-primary">VISTA GENERAL</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role?.name === 'admin' ? 'Panel de Administración' : 'Panel de Docente'}
            </h1>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${user?.role?.name === 'admin'
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-50 text-blue-700'
              }`}>
              {user?.role?.name === 'admin' ? 'Admin' : 'Docente'}
            </span>
          </div>
        </div>

        {/* Acciones en el Header */}
        <div className="flex gap-3">
          {user?.role?.name === 'admin' ? (
            <Link to="/admin/users">
              <Button variant="outline" className="bg-white">
                <IconUserGroup className="w-4 h-4 mr-2" />
                Usuarios
              </Button>
            </Link>
          ) : (
            <Link to="/teacher/forums">
              <Button variant="outline" className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                <IconMessage className="w-4 h-4 mr-2" />
                Gestionar Foros
              </Button>
            </Link>
          )}

          <Link to={user?.role?.name === 'admin' ? "/admin/courses" : "/teacher/assignments/new"}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow">
              <IconPlusCircle className="w-4 h-4 mr-2" />
              {user?.role?.name === 'admin' ? 'Gestionar Cursos' : 'Crear Nueva Tarea'}
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Stats Cards (Estilo Image 2 - Icon Box + Number) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <IconBookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {user?.role?.name === 'admin' ? 'Cursos Totales' : 'Mis Cursos'}
              </p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalCourses}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <IconGraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Cursos Activos</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.activeCourses}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <IconStudent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {user?.role?.name === 'admin' ? 'Usuarios' : 'Estudiantes'}
              </p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.totalStudents}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <IconClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {user?.role?.name === 'admin' ? 'Actividad' : 'Por Calificar'}
              </p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pendingAssignments}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. AI Smart Hub Banner (Estilo Image 2 - Dark Navy) */}
      {/* 3. Welcome Banner (Estilo Premium con funciones reales) */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-8 md:p-10 shadow-lg">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-xs font-medium text-blue-100 tracking-wide uppercase">
                {user?.role?.name === 'admin' ? 'SYSTEM STATUS: ONLINE' : 'CENTRO DE DOCENTE'}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              {user?.role?.name === 'admin'
                ? 'Administración Institucional'
                : 'Gestiona tu Contenido Académico'}
            </h2>
            <p className="text-blue-200/80 text-lg leading-relaxed mb-6">
              {user?.role?.name === 'admin'
                ? 'Bienvenido al panel de control central. Aquí puedes gestionar usuarios, cursos y configuraciones de la plataforma.'
                : 'Accede rápidamente a tus cursos recientes, revisa las tareas pendientes y participa en los foros de discusión con tus estudiantes.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={user?.role?.name === 'admin' ? "/admin/courses" : "/teacher/courses"}>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white border-none px-6 py-2.5 h-auto font-medium rounded-lg shadow-lg shadow-blue-900/20">
                  {user?.role?.name === 'admin' ? 'Ir a Cursos' : 'Ver Mis Cursos'}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link to={user?.role?.name === 'admin' ? "/admin/users" : "/teacher/students"}>
                <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-6 py-2.5 h-auto font-medium rounded-lg backdrop-blur-sm">
                  {user?.role?.name === 'admin' ? 'Gestionar Usuarios' : 'Lista de Estudiantes'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Real Quick Stats (Floating Cards Replacement) */}
          <div className="hidden lg:flex flex-col gap-4 min-w-[300px]">
            <Link to="/teacher/assignments">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4 transition-transform hover:-translate-x-1 duration-300 cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <IconClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Tareas Pendientes</h4>
                  <p className="text-blue-200/60 text-xs">{stats.pendingAssignments} sin calificar</p>
                </div>
              </div>
            </Link>

            <Link to="/teacher/forums">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4 transition-transform hover:-translate-x-1 duration-300" style={{ marginLeft: '1.5rem' }}>
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <IconMessage className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">Actividad en Foros</h4>
                  <p className="text-blue-200/60 text-xs">{stats.forumsCount} temas activos</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid (Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1 & 2: Recent Courses (Wider) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Mis Cursos Recientes</h2>
            <Link to="/teacher/courses">
              <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">Ver todos</span>
            </Link>
          </div>

          <div className="grid gap-4">
            {courses.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2 border-gray-200 bg-gray-50">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <IconBookOpen className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium">No hay cursos activos</h3>
                <p className="text-gray-500 text-sm mt-1 mb-4">Comienza creando tu primer curso hoy mismo.</p>
                <Link to="/teacher/courses/new">
                  <Button>Crear Primer Curso</Button>
                </Link>
              </Card>
            ) : (
              courses.slice(0, 3).map((course) => (
                <div key={course.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-12 h-12 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {course.title.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{course.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full ${course.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {course.status === 'active' ? 'Activo' : 'Borrador'}
                        </span>
                        <span>•</span>
                        <span>{course.enrollmentsCount || 0} estudiantes</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end sm:self-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/teacher/courses/${course.id}`}>
                      <Button size="sm" variant="secondary">Gestionar</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Forums (Narrower) */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Foros Recientes</h2>
            <Link to="/teacher/forums">
              <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">Ver todos</span>
            </Link>
          </div>

          <div className="space-y-4">
            {recentForums.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                <p className="text-sm text-gray-500">No hay actividad reciente en foros.</p>
              </div>
            ) : (
              recentForums.map((topic) => (
                <div key={topic.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 cursor-pointer">
                        <Link to={`/forum/${topic.id}`}>{topic.title}</Link>
                      </h4>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <IconCalendar className="w-3 h-3" />
                        {formatRelativeTime(topic.last_message_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                    <Link to={`/forum/${topic.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                      Responder →
                    </Link>
                  </div>
                </div>
              ))
            )}

            {/* Quick Calendar Placeholder (from image design) */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Próximas Sesiones</h3>
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <IconCalendar className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">No tienes sesiones programadas hoy.</p>
                <Button variant="ghost" size="sm" className="mt-2 text-blue-600">Ver Calendario</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
