// pages/GradesPage.tsx
// Página para que estudiantes vean sus calificaciones

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { quizService, AssessmentAttempt } from '@/services/quizService';
import { gradingService, StudentFinalGrade } from '@/services/gradingService';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import {
  IconChartBar,
  IconCheckCircle,
  IconClock,
  IconBookOpen,
  IconAlertTriangle,
  IconTrophy,
} from '@/components/Common/Icons';
import { Link } from 'react-router-dom';

interface GradeItem {
  id: string;
  title: string;
  type: 'quiz' | 'trivia' | 'exam' | 'assignment' | 'project';
  score: number | null;
  totalPoints: number;
  percentage: number | null;
  date: string;
  status: 'submitted' | 'graded' | 'pending';
  assessmentId: string;
  attemptId: string;
  courseTitle?: string;
}

interface CourseFinalGrade {
  courseId: number;
  courseTitle: string;
  subjectName?: string;
  finalGrade: StudentFinalGrade | null;
}

const GradesPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [finalGrades, setFinalGrades] = useState<CourseFinalGrade[]>([]);
  const [loadingFinalGrades, setLoadingFinalGrades] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadGrades();
      loadFinalGrades();
    }
  }, [user?.id]);

  const loadGrades = async () => {
    try {
      setLoading(true);

      // Obtener todos los intentos de assessments del estudiante
      const { data: attempts, error: attemptsError } = await supabase
        .from('assessment_attempts')
        .select(
          `
          *,
          assessments (
            id,
            title,
            assessment_type,
            total_points,
            course_id,
            courses (
              title
            )
          )
        `
        )
        .eq('student_id', user!.id)
        .in('status', ['submitted', 'graded'])
        .order('submitted_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Obtener todas las preguntas de todos los assessments para calcular puntos reales
      const assessmentIds = [
        ...new Set((attempts || []).map((a: any) => a.assessments?.id).filter(Boolean)),
      ];

      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('assessment_id, points')
        .in('assessment_id', assessmentIds);

      if (questionsError) throw questionsError;

      // Crear mapa de puntos totales por assessment
      const pointsByAssessment = new Map<string, number>();
      (allQuestions || []).forEach((q: any) => {
        const current = pointsByAssessment.get(q.assessment_id) || 0;
        pointsByAssessment.set(q.assessment_id, current + (q.points || 0));
      });

      // Transformar los intentos en items de calificación
      const gradesList: GradeItem[] = (attempts || []).map((attempt: any) => {
        const assessment = attempt.assessments;
        const course = assessment?.courses;

        // Calcular puntos totales reales desde las preguntas
        const totalPointsFromQuestions = pointsByAssessment.get(assessment?.id) || 0;
        const totalPoints =
          totalPointsFromQuestions > 0 ? totalPointsFromQuestions : assessment?.total_points || 0;

        const score = attempt.score || 0;
        // Recalcular porcentaje basado en puntos reales (no usar el guardado si es incorrecto)
        const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

        return {
          id: attempt.id,
          title: assessment?.title || 'Evaluación sin título',
          type: assessment?.assessment_type || 'quiz',
          score: score > 0 ? score : null,
          totalPoints,
          percentage: percentage > 0 ? percentage : null,
          date: attempt.submitted_at
            ? new Date(attempt.submitted_at).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : 'Pendiente',
          status: attempt.status,
          assessmentId: assessment?.id || '',
          attemptId: attempt.id,
          courseTitle: course?.title,
        };
      });

      setGrades(gradesList);
    } catch (error: any) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinalGrades = async () => {
    if (!user?.id) return;

    try {
      setLoadingFinalGrades(true);

      // Obtener todos los cursos en los que el estudiante está inscrito
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select(
          `
          course_id,
          courses (
            id,
            title,
            subject_id,
            subjects (
              name,
              code
            )
          )
        `
        )
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments || enrollments.length === 0) {
        setFinalGrades([]);
        return;
      }

      // Calcular nota final para cada curso
      const finalGradesList: CourseFinalGrade[] = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const course = enrollment.courses;
          if (!course) return null;

          try {
            const finalGrade = await gradingService.calculateFinalGrade(user.id, course.id);

            const subject = course.subjects;
            const subjectName = subject
              ? `${subject.name}${subject.code ? ` (${subject.code})` : ''}`
              : undefined;

            return {
              courseId: course.id,
              courseTitle: course.title || 'Curso sin título',
              subjectName,
              finalGrade,
            };
          } catch (error) {
            console.error(`Error calculating final grade for course ${course.id}:`, error);
            return {
              courseId: course.id,
              courseTitle: course.title || 'Curso sin título',
              subjectName: undefined,
              finalGrade: null,
            };
          }
        })
      );

      // Filtrar nulls y ordenar por curso
      setFinalGrades(finalGradesList.filter((fg): fg is CourseFinalGrade => fg !== null));
    } catch (error: any) {
      console.error('Error loading final grades:', error);
    } finally {
      setLoadingFinalGrades(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quiz: 'Quiz',
      trivia: 'Trivia',
      exam: 'Examen',
      assignment: 'Tarea',
      project: 'Proyecto',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      quiz: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      trivia: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      exam: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      assignment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      project: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null)
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    if (percentage >= 80)
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (percentage >= 60)
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  };

  const formatScore = (item: GradeItem) => {
    if (item.status === 'pending' || item.score === null) {
      return 'Pendiente';
    }
    return `${item.score} / ${item.totalPoints}`;
  };

  const formatPercentage = (item: GradeItem) => {
    if (item.percentage === null) return '-';
    return `${item.percentage.toFixed(1)}%`;
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-dark">Mis Calificaciones</h1>
        <div className="flex items-center gap-2 text-sm text-text-light">
          <IconChartBar className="w-5 h-5" />
          <span>
            {grades.length} evaluación{grades.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {/* Sección de Notas Finales por Curso */}
      {finalGrades.length > 0 && (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-text-dark flex items-center gap-2">
              <IconTrophy className="w-5 h-5 text-yellow-500" />
              Notas Finales por Curso
            </h2>
            <p className="text-sm text-text-light mt-1">
              Calificaciones finales calculadas según la ponderación de cada materia
            </p>
          </div>
          {loadingFinalGrades ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background/50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Curso
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Materia
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Quizzes/Tareas
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Examen 1
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Examen 2
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Final
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-text-light uppercase">
                      Nota Final
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {finalGrades.map((fg) => (
                    <tr key={fg.courseId} className="hover:bg-background/40 transition-colors">
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-text-dark">
                        {fg.courseTitle}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-text-light">
                        {fg.subjectName || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-text-light">
                        {fg.finalGrade?.quizzesAverage !== null &&
                        fg.finalGrade?.quizzesAverage !== undefined
                          ? `${fg.finalGrade.quizzesAverage.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-text-light">
                        {fg.finalGrade?.exam1Score !== null &&
                        fg.finalGrade?.exam1Score !== undefined
                          ? `${fg.finalGrade.exam1Score.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-text-light">
                        {fg.finalGrade?.exam2Score !== null &&
                        fg.finalGrade?.exam2Score !== undefined
                          ? `${fg.finalGrade.exam2Score.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-text-light">
                        {fg.finalGrade?.finalExamScore !== null &&
                        fg.finalGrade?.finalExamScore !== undefined
                          ? `${fg.finalGrade.finalExamScore.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {fg.finalGrade?.finalGrade !== null &&
                        fg.finalGrade?.finalGrade !== undefined ? (
                          <span
                            className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                              fg.finalGrade.finalGrade >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                : fg.finalGrade.finalGrade >= 60
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {fg.finalGrade.finalGrade.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-sm text-text-light opacity-60">
                            Sin datos suficientes
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Sección de Calificaciones Individuales */}
      <div>
        <h2 className="text-xl font-semibold text-text-dark mb-4">Evaluaciones Individuales</h2>
        {grades.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <IconBookOpen className="w-16 h-16 text-text-light/30 mx-auto mb-4" />
              <p className="text-text-dark text-lg mb-2">No hay calificaciones disponibles aún.</p>
              <p className="text-text-light text-sm">
                Completa quizzes y evaluaciones para ver tus calificaciones aquí.
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Evaluación
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Tipo
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Puntaje
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Porcentaje
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Fecha
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {grades.map((grade) => (
                    <tr key={grade.id} className="hover:bg-background/40 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-text-dark">{grade.title}</div>
                          {grade.courseTitle && (
                            <div className="text-xs text-text-light opacity-70">
                              {grade.courseTitle}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(grade.type)}`}
                        >
                          {getTypeLabel(grade.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                        {formatScore(grade)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreColor(grade.percentage)}`}
                        >
                          {formatPercentage(grade)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                        {grade.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            grade.status === 'graded'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : grade.status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {grade.status === 'graded'
                            ? 'Calificado'
                            : grade.status === 'submitted'
                              ? 'En revisión'
                              : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/quiz/${grade.assessmentId}/results/${grade.attemptId}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Ver Resultados
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GradesPage;
