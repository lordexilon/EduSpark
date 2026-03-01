// pages/AssignmentSubmissionsPage.tsx
// Página para ver y calificar entregas de estudiantes

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { assignmentService, Assignment } from '@/services/assignments';
import { submissionService, AssignmentSubmission } from '@/services/assignments';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Breadcrumbs from '@/components/Common/Breadcrumbs';
import { IconArrowLeft, IconCheck, IconX, IconClock, IconFileText, IconUser } from '@/components/Common/Icons';
import { RichTextDisplay } from '@/components/Common/RichTextDisplay';

interface SubmissionWithStudent extends AssignmentSubmission {
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const AssignmentSubmissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [feedbackValues, setFeedbackValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [assignmentData, submissionsData] = await Promise.all([
        assignmentService.getAssignment(id),
        submissionService.getAssignmentSubmissions(id)
      ]);

      if (!assignmentData) {
        setError('Tarea no encontrada');
        return;
      }

      setAssignment(assignmentData);
      setSubmissions(submissionsData as SubmissionWithStudent[]);

      // Inicializar valores de calificación
      const initialGrades: Record<string, string> = {};
      const initialFeedback: Record<string, string> = {};
      submissionsData.forEach(sub => {
        if (sub.grade !== null && sub.grade !== undefined) {
          initialGrades[sub.id] = sub.grade.toString();
        }
        if (sub.feedback) {
          initialFeedback[sub.id] = sub.feedback;
        }
      });
      setGradeValues(initialGrades);
      setFeedbackValues(initialFeedback);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    if (!id) return;

    const gradeStr = gradeValues[submissionId];
    const feedback = feedbackValues[submissionId] || '';

    if (!gradeStr || gradeStr.trim() === '') {
      alert('Por favor ingresa una calificación');
      return;
    }

    const grade = parseFloat(gradeStr);

    if (isNaN(grade) || grade < 0) {
      alert('Por favor ingresa una calificación válida');
      return;
    }

    if (assignment && grade > assignment.max_points) {
      alert(`La calificación no puede ser mayor a ${assignment.max_points} puntos`);
      return;
    }

    try {
      setGradingSubmission(submissionId);
      await submissionService.gradeSubmission(submissionId, grade, feedback);
      await loadData(); // Recargar datos
      alert('Calificación guardada exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al guardar la calificación');
      console.error('Error grading submission:', err);
    } finally {
      setGradingSubmission(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStudentName = (submission: SubmissionWithStudent) => {
    if (submission.users) {
      return `${submission.users.first_name} ${submission.users.last_name}`.trim() || submission.users.email;
    }
    return 'Estudiante desconocido';
  };

  const getStatusBadge = (submission: SubmissionWithStudent) => {
    if (submission.grade !== null && submission.grade !== undefined) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <IconCheck className="w-3 h-3 mr-1" />
          Calificada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <IconClock className="w-3 h-3 mr-1" />
        Pendiente
      </span>
    );
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
            { label: 'Entregas' }
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
          { label: assignment.title, path: `/teacher/assignments/${id}` },
          { label: 'Entregas' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/teacher/assignments/${id}`}>
            <Button variant="ghost" leftIcon={<IconArrowLeft className="w-5 h-5" />}>
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Entregas</h1>
            <p className="text-gray-600 mt-1">{assignment.title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total de entregas</p>
          <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
        </div>
      </div>

      {/* Lista de entregas */}
      {submissions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <IconFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entregas</h3>
            <p className="text-gray-600">Aún no hay estudiantes que hayan entregado esta tarea.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <IconUser className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getStudentName(submission)}
                        </h3>
                        {getStatusBadge(submission)}
                      </div>
                      {submission.users?.email && (
                        <p className="text-sm text-gray-500 mb-2">{submission.users.email}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <IconClock className="w-4 h-4" />
                          Entregado: {formatDate(submission.submitted_at)}
                        </span>
                        {submission.grade !== null && submission.grade !== undefined && (
                          <span className="font-semibold text-gray-900">
                            Calificación: {submission.grade} / {assignment.max_points}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido de la entrega */}
                {submission.text && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Respuesta del estudiante:</h4>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <RichTextDisplay content={submission.text} />
                    </div>
                  </div>
                )}

                {submission.url && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Archivo adjunto:</h4>
                    <a
                      href={submission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <IconFileText className="w-4 h-4" />
                      Ver archivo
                    </a>
                  </div>
                )}

                {/* Formulario de calificación */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Calificación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Puntaje (máximo: {assignment.max_points})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={assignment.max_points}
                        step="0.01"
                        value={gradeValues[submission.id] || ''}
                        onChange={(e) => setGradeValues({
                          ...gradeValues,
                          [submission.id]: e.target.value
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => handleGrade(submission.id)}
                        disabled={gradingSubmission === submission.id}
                        className="w-full"
                      >
                        {gradingSubmission === submission.id ? 'Guardando...' : submission.grade !== null ? 'Actualizar Calificación' : 'Calificar'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentarios / Feedback
                    </label>
                    <textarea
                      value={feedbackValues[submission.id] || ''}
                      onChange={(e) => setFeedbackValues({
                        ...feedbackValues,
                        [submission.id]: e.target.value
                      })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Escribe comentarios para el estudiante..."
                    />
                  </div>
                  {submission.feedback && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Feedback actual:</p>
                      <p className="text-sm text-blue-800">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmissionsPage;

