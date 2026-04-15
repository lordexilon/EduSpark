// pages/TeacherQuizzesPage.tsx
// Página de gestión de quizzes para docentes

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quizService, Assessment } from '@/services/quizService';
import { courseService, Course } from '@/services/teacherCourses';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconClipboardCheck, IconPlusCircle, IconEdit, IconChartBar, IconClock, IconCheckCircle, IconX } from '@/components/Common/Icons';

export const TeacherQuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      loadAssessments();
    }
  }, [selectedCourse, filterType]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getMyCourses(user!.id);
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (err) {
      setError('Error al cargar los cursos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async () => {
    if (!selectedCourse) return;

    try {
      setLoading(true);
      const types = filterType 
        ? [filterType as 'quiz' | 'trivia' | 'exam' | 'project' | 'assignment']
        : ['quiz', 'trivia', 'exam', 'project', 'assignment'];
      
      const data = await quizService.getCourseAssessments(selectedCourse, types);
      setAssessments(data);
    } catch (err) {
      setError('Error al cargar los quizzes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este quiz? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await quizService.deleteAssessment(id);
      loadAssessments();
    } catch (err: any) {
      alert('Error al eliminar el quiz: ' + (err.message || 'Error desconocido'));
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'quiz': 'Quiz',
      'trivia': 'Trivia',
      'exam': 'Examen',
      'project': 'Proyecto',
      'assignment': 'Tarea'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'quiz': 'bg-blue-100 text-blue-700',
      'trivia': 'bg-purple-100 text-purple-700',
      'exam': 'bg-red-100 text-red-700',
      'project': 'bg-green-100 text-green-700',
      'assignment': 'bg-yellow-100 text-yellow-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Quizzes y Evaluaciones</h1>
        </div>
        <Card>
          <div className="text-center py-8">
            <IconClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes cursos</h3>
            <p className="text-gray-600 mb-4">Crea un curso primero para poder crear quizzes</p>
            <Link to="/teacher/courses/new">
              <Button>
                <IconPlusCircle className="w-4 h-4 mr-2" />
                Crear Curso
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes y Evaluaciones</h1>
          <p className="text-gray-600">Gestiona tus quizzes, trivias y exámenes</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Todos los tipos</option>
            <option value="quiz">Quiz</option>
            <option value="trivia">Trivia</option>
            <option value="exam">Examen</option>
            <option value="project">Proyecto</option>
            <option value="assignment">Tarea</option>
          </select>
          <Link to={`/teacher/quizzes/new?courseId=${selectedCourse}`}>
            <Button>
              <IconPlusCircle className="w-4 h-4 mr-2" />
              Nuevo Quiz
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : assessments.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <IconClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterType ? `No hay ${getTypeLabel(filterType)}s` : 'No hay evaluaciones'}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedCourseData 
                ? `Aún no has creado evaluaciones para "${selectedCourseData.title}"`
                : 'Selecciona un curso para ver sus evaluaciones'}
            </p>
            {selectedCourse && (
              <Link to={`/teacher/quizzes/new?courseId=${selectedCourse}`}>
                <Button>
                  <IconPlusCircle className="w-4 h-4 mr-2" />
                  Crear Primer Quiz
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <IconClipboardCheck className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {assessment.title}
                        </h3>
                      </div>
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getTypeColor(assessment.assessment_type)}`}>
                        {getTypeLabel(assessment.assessment_type)}
                      </span>
                    </div>
                  </div>

                  {assessment.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {assessment.description}
                    </p>
                  )}

                  <div className="space-y-2 text-xs text-gray-500">
                    {assessment.time_limit && (
                      <div className="flex items-center gap-1">
                        <IconClock className="w-3 h-3" />
                        <span>{assessment.time_limit} minutos</span>
                      </div>
                    )}
                    {assessment.max_attempts && (
                      <div className="flex items-center gap-1">
                        <span>{assessment.max_attempts} intento{assessment.max_attempts > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {assessment.passing_score && (
                      <div className="flex items-center gap-1">
                        <span>Aprobar: {assessment.passing_score}%</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {assessment.is_published ? (
                        <>
                          <IconCheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-green-600">Publicado</span>
                        </>
                      ) : (
                        <>
                          <IconX className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-500">Borrador</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-4 border-t border-gray-200">
                  <Link
                    to={`/teacher/quizzes/edit/${assessment.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <IconEdit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </Link>
                  <Link
                    to={`/teacher/quizzes/${assessment.id}/analytics`}
                    className="flex-1"
                  >
                    <Button variant="secondary" size="sm" className="w-full">
                      <IconChartBar className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherQuizzesPage;

