// pages/TeacherAssignmentsPage.tsx
// Página de gestión de tareas para docentes

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentService, AssignmentWithSubmissions } from '@/services/assignments';
import { courseService, Course } from '@/services/teacherCourses';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';

import { RichTextDisplay } from '@/components/Common/RichTextDisplay';

export const TeacherAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithSubmissions[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      loadAssignments();
    }
  }, [selectedCourse]);

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

  const loadAssignments = async () => {
    if (!selectedCourse) return;

    try {
      setLoading(true);
      const data = await assignmentService.getAssignmentsWithSubmissions(selectedCourse);
      setAssignments(data);
    } catch (err) {
      setError('Error al cargar las tareas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;

    try {
      await assignmentService.deleteAssignment(id);
      setAssignments(assignments.filter((a) => a.id !== id));
    } catch (err) {
      setError('Error al eliminar la tarea');
      console.error(err);
    }
  };

  const getDueDateStatus = (dueAt?: string) => {
    if (!dueAt) return { text: 'Sin fecha límite', color: 'text-gray-500' };

    const dueDate = new Date(dueAt);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Vencida', color: 'text-red-600' };
    if (diffDays === 0) return { text: 'Vence hoy', color: 'text-orange-600' };
    if (diffDays <= 3) return { text: `Vence en ${diffDays} días`, color: 'text-yellow-600' };
    return { text: `Vence en ${diffDays} días`, color: 'text-green-600' };
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={loadCourses} className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">No tienes cursos</h2>
        <p className="text-gray-600 mt-2">
          Primero necesitas crear un curso para poder gestionar tareas.
        </p>
        <Link to="/teacher/courses/new" className="mt-4 inline-block">
          <Button>Crear Curso</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-gray-600">Gestiona las tareas de tus cursos</p>
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
          <Link to={`/teacher/assignments/new?course=${selectedCourse}`}>
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nueva Tarea
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay tareas</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza creando tu primera tarea.</p>
            <div className="mt-6">
              <Link to={`/teacher/assignments/new?course=${selectedCourse}`}>
                <Button>Crear Tarea</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const dueStatus = getDueDateStatus(assignment.due_at);
            return (
              <Card key={assignment.id}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                      {assignment.description && (
                        <div
                          className="text-gray-600 text-sm mt-2 prose prose-sm max-w-none line-clamp-3 break-words"
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          <RichTextDisplay content={assignment.description} />
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link to={`/teacher/assignments/${assignment.id}/edit`}>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Fecha límite:</span>
                      <p className={`font-medium ${dueStatus.color}`}>
                        {assignment.due_at
                          ? new Date(assignment.due_at).toLocaleDateString()
                          : 'Sin fecha'}
                      </p>
                      <p className={`text-xs ${dueStatus.color}`}>{dueStatus.text}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Puntaje máximo:</span>
                      <p className="font-medium">{assignment.max_points} puntos</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Entregas:</span>
                      <p className="font-medium">{assignment.submission_count} estudiantes</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Calificadas:</span>
                      <p className="font-medium">
                        {assignment.graded_count} de {assignment.submission_count}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Link to={`/teacher/assignments/${assignment.id}/submissions`}>
                      <Button size="sm" variant="outline">
                        Ver Entregas ({assignment.submission_count})
                      </Button>
                    </Link>
                    <Link to={`/teacher/assignments/${assignment.id}`}>
                      <Button size="sm">Ver Detalles</Button>
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
