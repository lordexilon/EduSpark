// pages/QuizAnalyticsPage.tsx
// Analytics y estadísticas de quizzes para docentes

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quizService, Assessment, AssessmentAttempt, QuestionResponse } from '../services/quizService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';
import { IconArrowLeft, IconUsers, IconCheckCircle, IconX, IconTrendingUp, IconChartBar, IconClock, IconPencil } from '../components/Icons';

interface QuizStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  averageTimeMinutes: number;
}

interface StudentResult {
  student_id: string;
  student_name: string;
  student_email: string;
  attempts: AssessmentAttempt[];
  bestScore: number;
  bestPercentage: number;
  isPassed: boolean;
  totalAttempts: number;
}

interface QuestionStats {
  question_id: string;
  question_text: string;
  correct_count: number;
  incorrect_count: number;
  total_responses: number;
  accuracy: number;
}

export const QuizAnalyticsPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [stats, setStats] = useState<QuizStats>({
    totalAttempts: 0,
    completedAttempts: 0,
    averageScore: 0,
    averagePercentage: 0,
    passRate: 0,
    averageTimeMinutes: 0
  });
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  const loadAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);

      // Cargar assessment y preguntas
      const { assessment: loadedAssessment, questions: loadedQuestions } = await quizService.getAssessmentWithQuestions(quizId!);
      setAssessment(loadedAssessment);
      setQuestions(loadedQuestions);

      // Cargar todos los intentos
      const { data: attempts, error: attemptsError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('assessment_id', quizId!)
        .order('submitted_at', { ascending: false });

      if (attemptsError) throw attemptsError;
      setAttempts(attempts || []);

      // Cargar respuestas
      const { data: responses, error: responsesError } = await supabase
        .from('question_responses')
        .select('*, questions(question_text)')
        .in('attempt_id', attempts?.map(a => a.id) || []);

      if (responsesError) throw responsesError;
      setResponses(responses || []);

      // Calcular estadísticas
      const completedAttempts = attempts?.filter(a => a.status === 'submitted' || a.status === 'graded') || [];
      const scores = completedAttempts.map(a => a.score || 0).filter(s => s > 0);
      const percentages = completedAttempts.map(a => a.percentage || 0).filter(p => p > 0);
      const passedCount = completedAttempts.filter(a => a.is_passed).length;
      const timeSpent = completedAttempts
        .map(a => a.time_spent_minutes || 0)
        .filter(t => t > 0);

      const calculatedStats: QuizStats = {
        totalAttempts: attempts?.length || 0,
        completedAttempts: completedAttempts.length,
        averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        averagePercentage: percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0,
        passRate: completedAttempts.length > 0 ? (passedCount / completedAttempts.length) * 100 : 0,
        averageTimeMinutes: timeSpent.length > 0 ? timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length : 0
      };

      setStats(calculatedStats);

      // Agrupar resultados por estudiante
      const studentMap = new Map<string, StudentResult>();
      
      for (const attempt of completedAttempts) {
        if (!studentMap.has(attempt.student_id)) {
          // Obtener información del estudiante
          const { data: studentData } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .eq('id', attempt.student_id)
            .single();

          studentMap.set(attempt.student_id, {
            student_id: attempt.student_id,
            student_name: studentData 
              ? `${studentData.first_name} ${studentData.last_name}`
              : 'Estudiante desconocido',
            student_email: studentData?.email || '',
            attempts: [],
            bestScore: 0,
            bestPercentage: 0,
            isPassed: false,
            totalAttempts: 0
          });
        }

        const student = studentMap.get(attempt.student_id)!;
        student.attempts.push(attempt);
        if ((attempt.percentage || 0) > student.bestPercentage) {
          student.bestPercentage = attempt.percentage || 0;
          student.bestScore = attempt.score || 0;
          student.isPassed = attempt.is_passed || false;
        }
      }

      // Actualizar total de intentos por estudiante
      studentMap.forEach(student => {
        student.totalAttempts = student.attempts.length;
      });

      setStudentResults(Array.from(studentMap.values()));

      // Calcular estadísticas por pregunta
      const questionMap = new Map<string, QuestionStats>();
      
      const questionResponses = responses || [];
      for (const response of questionResponses) {
        const qId = response.question_id;
        if (!questionMap.has(qId)) {
          questionMap.set(qId, {
            question_id: qId,
            question_text: (response.questions as any)?.question_text || 'Pregunta',
            correct_count: 0,
            incorrect_count: 0,
            total_responses: 0,
            accuracy: 0
          });
        }

        const question = questionMap.get(qId)!;
        question.total_responses++;
        if (response.is_correct) {
          question.correct_count++;
        } else {
          question.incorrect_count++;
        }
      }

      // Calcular precisión
      questionMap.forEach(question => {
        question.accuracy = question.total_responses > 0
          ? (question.correct_count / question.total_responses) * 100
          : 0;
      });

      setQuestionStats(Array.from(questionMap.values()).sort((a, b) => a.accuracy - b.accuracy));
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      alert(error.message || 'Error cargando analytics');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (quizId) {
      loadAnalytics();
    }
  }, [quizId, loadAnalytics]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Quiz no encontrado</p>
          <Button onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Panel Docente', path: '/teacher' },
          { label: 'Mis Cursos', path: '/teacher/courses' },
          { label: assessment.title }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics del Quiz</h1>
          <p className="text-gray-600 mt-1">{assessment.title}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/teacher/quizzes/edit/${quizId}`)}
          >
            Editar Quiz
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            leftIcon={<IconArrowLeft className="w-5 h-5" />}
          >
            Volver
          </Button>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconUsers className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Intentos</dt>
                <dd className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</dd>
                <dd className="text-xs text-gray-500">{stats.completedAttempts} completados</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconTrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Promedio</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {stats.averagePercentage.toFixed(1)}%
                </dd>
                <dd className="text-xs text-gray-500">
                  {stats.averageScore.toFixed(1)} / {assessment.total_points} puntos
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconCheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tasa de Aprobación</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {stats.passRate.toFixed(1)}%
                </dd>
                <dd className="text-xs text-gray-500">
                  {assessment.passing_score}% requerido
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconClock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tiempo Promedio</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.averageTimeMinutes)} min
                </dd>
                <dd className="text-xs text-gray-500">
                  {assessment.time_limit ? `Límite: ${assessment.time_limit} min` : 'Sin límite'}
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Resultados por Estudiante */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Resultados por Estudiante</h2>
        {studentResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aún no hay intentos completados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mejor Puntuación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentResults.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                        <div className="text-sm text-gray-500">{student.student_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.totalAttempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.bestScore.toFixed(1)} / {assessment.total_points} ({student.bestPercentage.toFixed(1)}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {student.isPassed ? 'Aprobado' : 'No Aprobado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/quiz/${quizId}/results/${student.attempts[0]?.id}`}
                        className="text-primary hover:text-primary-dark"
                      >
                        Ver Detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Preguntas que Requieren Calificación Manual */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Preguntas Abiertas Pendientes de Calificación</h2>
        {(() => {
          // Obtener todas las respuestas abiertas que necesitan calificación
          const openEndedResponses = (responses || []).filter((r: any) => {
            const question = questions?.find((q: any) => q.id === r.question_id);
            return question && 
                   (question.question_type === 'short_answer' || question.question_type === 'essay') &&
                   (r.points_earned === 0 || r.points_earned === null);
          });

          if (openEndedResponses.length === 0) {
            return (
              <div className="text-center py-8">
                <IconCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No hay preguntas abiertas pendientes de calificación</p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {openEndedResponses.map((response: any) => {
                const question = questions?.find((q: any) => q.id === response.question_id);
                const attempt = attempts?.find((a: any) => a.id === response.attempt_id);
                const student = studentResults.find(s => s.student_id === attempt?.student_id);
                
                return (
                  <OpenEndedGradeCard
                    key={response.id}
                    response={response}
                    question={question}
                    student={student}
                    onGrade={async (points, feedback) => {
                      await quizService.gradeResponse(response.id, points, feedback);
                      // Recalcular el intento
                      if (attempt) {
                        await quizService.submitAttempt(attempt.id, attempt.time_spent_minutes);
                      }
                      // Recargar analytics
                      await loadAnalytics();
                    }}
                  />
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* Estadísticas por Pregunta */}
      {questionStats.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Análisis por Pregunta</h2>
          <div className="space-y-4">
            {questionStats.map((question, idx) => (
              <div key={question.question_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        Pregunta {idx + 1}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        question.accuracy >= 70
                          ? 'bg-green-100 text-green-700'
                          : question.accuracy >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {question.accuracy.toFixed(1)}% correcto
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{question.question_text}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                  <span>✅ {question.correct_count} correctas</span>
                  <span>❌ {question.incorrect_count} incorrectas</span>
                  <span>📊 {question.total_responses} respuestas</span>
                </div>
                {/* Barra de progreso */}
                <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      question.accuracy >= 70
                        ? 'bg-green-500'
                        : question.accuracy >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${question.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default QuizAnalyticsPage;

