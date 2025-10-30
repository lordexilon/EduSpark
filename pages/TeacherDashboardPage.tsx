import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { courseService, Course } from '../services/teacherCourses';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconBookOpen, IconUsers, IconClipboardList, IconGraduationCap, IconPlusCircle } from '../components/Icons';

const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    activeCourses: 0,
    totalStudents: 0,
    pendingAssignments: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const coursesData = await courseService.getMyCourses(user!.id);
      setCourses(coursesData);
      
      // Calcular estadísticas básicas
      setStats({
        totalCourses: coursesData.length,
        activeCourses: coursesData.filter(c => c.status === 'active').length,
        totalStudents: 0, // TODO: Implementar conteo de estudiantes
        pendingAssignments: 0 // TODO: Implementar conteo de tareas pendientes
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
              <IconUsers className="h-8 w-8 text-blue-600" />
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
          <Link to="/teacher/courses">
            <Button variant="outline" className="w-full justify-center">
              <IconBookOpen className="w-5 h-5 mr-2" />
              Gestionar Cursos
            </Button>
          </Link>
        </div>
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
                <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-dark">{course.title}</h4>
                    <p className="text-sm text-text-light">
                      {course.status === 'active' ? 'Activo' : 'Borrador'}
                    </p>
                  </div>
                  <Link to={`/teacher/courses/${course.id}`}>
                    <Button size="sm" variant="outline">Ver</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-dark mb-4">Actividad Reciente</h2>
          <div className="text-center py-8">
            <IconClipboardList className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-text-dark">No hay actividad reciente</h3>
            <p className="mt-1 text-sm text-text-light">Las actividades aparecerán aquí.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
