import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { courseService, Course } from '../services/teacherCourses';
import { assignmentService } from '../services/assignments';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  IconBookOpen,
  IconStudent,
  IconClipboardList,
  IconGraduationCap,
  IconPlusCircle,
  IconMessage,
  IconCalendar,
} from '../components/Icons';

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
      const coursesData = await courseService.getMyCourses(user!.id);
      
      // Obtener IDs de los cursos
      const courseIds = coursesData.map(c => c.id);
      
      // Calcular total de estudiantes únicos en todos los cursos
      let totalStudents = 0;
      if (courseIds.length > 0) {
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('course_enrollments')
          .select('student_id')
          .in('course_id', courseIds);
        
        if (!enrollmentsError && enrollments) {
          // Contar estudiantes únicos
          const uniqueStudents = new Set(enrollments.map(e => e.student_id));
          totalStudents = uniqueStudents.size;
        }
      }
      
      // Calcular tareas pendientes (submissions sin calificar)
      let pendingAssignments = 0;
      if (courseIds.length > 0) {
        // Obtener todas las tareas de los cursos
        const allAssignments = await Promise.all(
          courseIds.map(courseId => assignmentService.getAssignmentsWithSubmissions(courseId))
        );
        
        // Contar submissions sin calificar (grade es null)
        allAssignments.flat().forEach(assignment => {
          if (assignment.submissions) {
            const ungraded = assignment.submissions.filter(s => s.grade === null);
            pendingAssignments += ungraded.length;
          }
        });
      }
      
      // Calcular estadísticas básicas
      const { data: forumsData } = await supabase
        .from('forum_topics')
        .select('id, title, last_message_at, created_at')
        .eq('created_by', user!.id)
        .order('last_message_at', { ascending: false, nullsLast: false })
        .order('created_at', { ascending: false });
      const forumsCount = forumsData?.length ?? 0;
      const recentForumsData =
        forumsData?.slice(0, 5).map((topic) => ({
          id: topic.id,
          title: topic.title,
          last_message_at: topic.last_message_at ?? topic.created_at,
        })) ?? [];

      const coursesWithExtras = await Promise.all(
        coursesData.map(async (course) => {
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('course_enrollments')
            .select('student_id')
            .eq('course_id', course.id);
          const count =
            !enrollmentsError && enrollments ? new Set(enrollments.map((e) => e.student_id)).size : 0;
          return {
            ...course,
            enrollmentsCount: count,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <p className="text-text-light">Bienvenido de nuevo, {user?.first_name} 👋</p>
        <div className="flex items-center gap-4 mt-1">
          <h1 className="text-3xl font-bold text-text-dark">
            {user?.role?.name === 'admin' ? 'Panel de Administración' : 'Panel de Docente'}
          </h1>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            user?.role?.name === 'admin' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-primary/20 text-primary'
          }`}>
            {user?.role?.name === 'admin' ? 'Administrador' : 'Docente'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconBookOpen className="h-8 w-8 text-primary" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-text-light truncate">Total de Cursos</dt>
                <dd className="text-lg font-medium text-text-dark">{stats.totalCourses}</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconGraduationCap className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-text-light truncate">Cursos Activos</dt>
                <dd className="text-lg font-medium text-text-dark">{stats.activeCourses}</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconStudent className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-text-light truncate">Estudiantes</dt>
                <dd className="text-lg font-medium text-text-dark">{stats.totalStudents}</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconClipboardList className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-text-light truncate">Tareas Pendientes</dt>
                <dd className="text-lg font-medium text-text-dark">{stats.pendingAssignments}</dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/teacher/courses/new">
            <Button className="w-full justify-center">
              <IconPlusCircle className="w-5 h-5 mr-2" />
              Crear Nuevo Curso
            </Button>
          </Link>
          <Link to="/teacher/assignments/new">
            <Button variant="secondary" className="w-full justify-center">
              <IconClipboardList className="w-5 h-5 mr-2" />
              Crear Nueva Tarea
            </Button>
          </Link>
          <Link to="/teacher/forums">
            <Button variant="outline" className="w-full justify-center">
              <IconMessage className="w-5 h-5 mr-2" />
              Gestionar Foros
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Foros Recientes</h2>
          <Link to="/teacher/forums">
            <Button size="sm" variant="outline">
              Ver todos
            </Button>
          </Link>
        </div>
        {recentForums.length === 0 ? (
          <div className="text-center py-8">
            <IconMessage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-text-dark">Sin temas recientes</h3>
            <p className="mt-1 text-sm text-text-light">
              Crea un nuevo tema para comenzar una discusión con tus estudiantes.
            </p>
            <div className="mt-6">
              <Link to="/teacher/forums">
                <Button>
                  <IconPlusCircle className="w-4 h-4 mr-2" />
                  Crear tema
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentForums.map((topic) => (
              <Link
                key={topic.id}
                to={`/forum/${topic.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <h4 className="font-medium text-text-dark truncate">{topic.title}</h4>
                  <p className="text-xs text-text-light mt-1">
                    Última actividad: {formatRelativeTime(topic.last_message_at)}
                  </p>
                </div>
                <Button size="sm" variant="secondary">
                  Ver tema
                </Button>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-text-dark">Mis Cursos Recientes</h2>
            <Link to="/teacher/courses">
              <Button size="sm" variant="outline">Ver todos</Button>
            </Link>
          </div>
          
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <IconBookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-text-dark">No tienes cursos</h3>
              <p className="mt-1 text-sm text-text-light">Comienza creando tu primer curso.</p>
              <div className="mt-6">
                <Link to="/teacher/courses/new">
                  <Button>
                    <IconPlusCircle className="w-4 h-4 mr-2" />
                    Crear Curso
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-text-dark">{course.title}</h4>
                    <p className="text-sm text-text-light">
                      {course.status === 'active' ? 'Activo' : 'Borrador'} ·{' '}
                      {course.enrollmentsCount ?? 0} estudiantes
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/forums?courseId=${course.id}`}>
                      <Button size="sm" variant="secondary">
                        Foros
                      </Button>
                    </Link>
                    <Link to={`/teacher/courses/${course.id}`}>
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-dark mb-4">Próximas Sesiones</h2>
          <div className="space-y-3">
            {courses.length === 0 ? (
              <p className="text-sm text-text-light text-center py-6">
                Cuando programes sesiones o videollamadas, aparecerán aquí.
              </p>
            ) : (
              <Link to="/teacher/courses">
                <Button variant="outline" className="w-full justify-center" leftIcon={<IconCalendar className="w-5 h-5" />}>
                  Ver calendario de clases
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
