// pages/AssignmentDetailPage.tsx
// Página de detalles de tarea para profesores

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { assignmentService, Assignment } from '../services/assignments';
import { courseService, Course } from '../services/teacherCourses';
import Card from '../components/Card';
import Button from '../components/Button';
import Breadcrumbs from '../components/Breadcrumbs';
import { IconArrowLeft, IconEdit, IconTrash, IconClock, IconFileText } from '../components/Icons';

import { RichTextDisplay } from '../components/RichTextDisplay';


export const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAssignment();
    }
  }, [id]);

  const loadAssignment = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const assignmentData = await assignmentService.getAssignment(id);
      setAssignment(assignmentData);

      if (assignmentData.course_id) {
        const courseData = await courseService.getCourse(assignmentData.course_id);
        setCourse(courseData);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la tarea');
      console.error('Error loading assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;

    try {
      await assignmentService.deleteAssignment(id);
      navigate('/teacher/assignments');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la tarea');
      console.error('Error deleting assignment:', err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha límite';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/teacher/dashboard' },
            { label: 'Tareas', path: '/teacher/assignments' },
            { label: 'Detalles' }
          ]}
        />
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error || 'Tarea no encontrada'}</p>
            <Button onClick={() => navigate('/teacher/assignments')}>
              Volver a Tareas
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', path: '/teacher/dashboard' },
          { label: 'Tareas', path: '/teacher/assignments' },
          { label: assignment.title }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teacher/assignments">
            <Button variant="ghost" leftIcon={<IconArrowLeft className="w-5 h-5" />}>
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
            {course && (
              <p className="text-gray-600 mt-1">{course.title}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/teacher/assignments/${id}/edit`}>
            <Button variant="outline" leftIcon={<IconEdit className="w-5 h-5" />}>
              Editar
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            leftIcon={<IconTrash className="w-5 h-5" />}
          >
            Eliminar
          </Button>
        </div>
      </div>

      {/* Información de la tarea */}
      <Card>
        <div className="space-y-6">
          {/* Descripción */}
          {assignment.description && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Descripción</h2>
              <div className="prose prose-sm sm:prose lg:prose-lg max-w-none text-gray-700 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600 prose-a:underline">
                <RichTextDisplay content={assignment.description} />
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <IconClock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Fecha límite</p>
                <p className="font-medium text-gray-900">{formatDate(assignment.due_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <IconFileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Puntaje máximo</p>
                <p className="font-medium text-gray-900">{assignment.max_points} puntos</p>
              </div>
            </div>
          </div>

          {/* Archivos adjuntos */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Archivos Adjuntos</h2>
              <div className="space-y-2">
                {assignment.attachments.map((attachment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <IconFileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{attachment.name || `Archivo ${index + 1}`}</p>
                        {attachment.size && (
                          <p className="text-sm text-gray-500">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    </div>
                    {attachment.url && (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Descargar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Link to={`/teacher/assignments/${id}/submissions`}>
              <Button variant="primary">
                Ver Entregas
              </Button>
            </Link>
            <Link to={`/teacher/assignments/${id}/edit`}>
              <Button variant="outline">
                Editar Tarea
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssignmentDetailPage;

