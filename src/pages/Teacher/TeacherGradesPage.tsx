// pages/TeacherGradesPage.tsx
// Página para que profesores vean las calificaciones de sus estudiantes

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { courseService, Course } from '@/services/teacherCourses';
import { gradingService, StudentFinalGrade } from '@/services/gradingService';
import Card from '@/components/Common/Card';
import { IconChartBar, IconBookOpen, IconUser, IconAlertTriangle, IconTrophy, IconCog } from '@/components/Common/Icons';

interface StudentGrade {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: string;
  courseTitle: string;
  score: number | null;
  totalPoints: number;
  percentage: number | null;
  submittedAt: string | null;
  status: string;
  attemptId: string;
}

const TeacherGradesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId');

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(initialCourseId ? parseInt(initialCourseId) : null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [finalGrades, setFinalGrades] = useState<StudentFinalGrade[]>([]);
  const [loadingFinalGrades, setLoadingFinalGrades] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      loadGrades();
      loadFinalGrades();
    } else {
      setGrades([]);
      setFinalGrades([]);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getMyCourses(user!.id);
      setCourses(data);
      if (data.length > 0 && !selectedCourse) {
        setSelectedCourse(data[0].id);
      }
    } catch (err: any) {
      setError('Error al cargar los cursos');
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    if (!selectedCourse) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener todos los intentos de assessments de estudiantes en este curso
      const { data: attempts, error: attemptsError } = await supabase
        .from('assessment_attempts')
        .select(`
          *,
          assessments!inner (
            id,
            title,
            assessment_type,
            total_points,
            course_id,
            courses (
              title
            )
          )
        `)
        .eq('assessments.course_id', selectedCourse)
        .in('status', ['submitted', 'graded'])
        .order('submitted_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Obtener IDs únicos de estudiantes
      const studentIds = [...new Set((attempts || []).map((a: any) => a.student_id).filter(Boolean))];

      // Obtener información de los estudiantes
      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Crear mapa de estudiantes por ID
      const studentsMap = new Map<string, any>();
      (students || []).forEach((s: any) => {
        studentsMap.set(s.id, s);
      });

      // Obtener todas las preguntas de todos los assessments para calcular puntos reales
      const assessmentIds = [...new Set((attempts || []).map((a: any) => a.assessments?.id).filter(Boolean))];

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
      const gradesList: StudentGrade[] = (attempts || []).map((attempt: any) => {
        const assessment = attempt.assessments;
        const course = assessment?.courses;
        const student = studentsMap.get(attempt.student_id);

        // Calcular puntos totales reales desde las preguntas
        const totalPointsFromQuestions = pointsByAssessment.get(assessment?.id) || 0;
        const totalPoints = totalPointsFromQuestions > 0 ? totalPointsFromQuestions : (assessment?.total_points || 0);

        const score = attempt.score || 0;
        const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

        return {
          id: attempt.id,
          studentId: student?.id || '',
          studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Estudiante sin nombre',
          studentEmail: student?.email || '',
          assessmentId: assessment?.id || '',
          assessmentTitle: assessment?.title || 'Evaluación sin título',
          assessmentType: assessment?.assessment_type || 'quiz',
          courseTitle: course?.title || '',
          score: score > 0 ? score : null,
          totalPoints,
          percentage: percentage > 0 ? percentage : null,
          submittedAt: attempt.submitted_at,
          status: attempt.status,
          attemptId: attempt.id
        };
      });

      setGrades(gradesList);
    } catch (err: any) {
      setError('Error al cargar las calificaciones');
      console.error('Error loading grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFinalGrades = async () => {
    if (!selectedCourse) return;

    try {
      setLoadingFinalGrades(true);
      const finalGradesData = await gradingService.calculateAllStudentsFinalGrades(selectedCourse);

      // Obtener información de estudiantes para mostrar nombres
      const studentIds = finalGradesData.map(fg => fg.studentId);
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', studentIds);

        // Crear mapa de estudiantes
        const studentsMap = new Map<string, any>();
        (students || []).forEach((s: any) => {
          studentsMap.set(s.id, s);
        });

        // Agregar nombres a las notas finales
        const finalGradesWithNames = finalGradesData.map(fg => ({
          ...fg,
          studentName: (() => {
            const student = studentsMap.get(fg.studentId);
            return student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : fg.studentId;
          })(),
          studentEmail: (() => {
            const student = studentsMap.get(fg.studentId);
            return student?.email || '';
          })()
        }));

        setFinalGrades(finalGradesWithNames as any);
      } else {
        setFinalGrades(finalGradesData);
      }
    } catch (err: any) {
      console.error('Error loading final grades:', err);
      // No mostrar error aquí, solo loguear
    } finally {
      setLoadingFinalGrades(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'quiz': 'Quiz',
      'trivia': 'Trivia',
      'exam': 'Examen',
      'assignment': 'Tarea',
      'project': 'Proyecto'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'quiz': 'bg-blue-100 text-blue-800',
      'trivia': 'bg-purple-100 text-purple-800',
      'exam': 'bg-red-100 text-red-800',
      'assignment': 'bg-yellow-100 text-yellow-800',
      'project': 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return 'bg-amber-100 text-amber-800';
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatScore = (grade: StudentGrade) => {
    if (grade.status === 'pending' || grade.score === null) {
      return 'Pendiente';
    }
    return `${grade.score} / ${grade.totalPoints}`;
  };

  const formatPercentage = (grade: StudentGrade) => {
    if (grade.percentage === null) return '-';
    return `${grade.percentage.toFixed(1)}%`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pendiente';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Calificaciones de Estudiantes</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona y revisa las calificaciones de tus estudiantes</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <IconTrophy className="w-5 h-5" />
          <span>{grades.length} calificación{grades.length !== 1 ? 'es' : ''}</span>
        </div>
      </div>

      {/* Selector de curso */}
      {courses.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label htmlFor="course-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Filtrar por curso:
            </label>
            <select
              id="course-select"
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none bg-white"
            >
              <option value="">Todos los cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {course.code ? `(${course.code})` : ''}
                </option>
              ))}
            </select>
            {selectedCourse && (() => {
              const course = courses.find(c => c.id === selectedCourse);
              if (course?.subject_id) {
                return (
                  <Link
                    to={`/teacher/courses/${selectedCourse}/grading-weights`}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <IconCog className="w-4 h-4" />
                    Configurar Ponderaciones
                  </Link>
                );
              }
              return null;
            })()}
          </div>
        </Card>
      )}

      {/* Tabla de Notas Finales */}
      {selectedCourse && finalGrades.length > 0 && (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Notas Finales del Curso</h2>
            <p className="text-sm text-gray-600 mt-1">
              Notas calculadas según la configuración de ponderaciones del curso
            </p>
          </div>
          {loadingFinalGrades ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estudiante</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quizzes/Tareas</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prácticos</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Examen 1</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Examen 2</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Examen 3</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Final</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nota Final</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {finalGrades.map((fg: any) => (
                    <tr key={fg.studentId} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {fg.studentName || fg.studentId}
                          </div>
                          {fg.studentEmail && (
                            <div className="text-xs text-slate-500">{fg.studentEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500">
                        {fg.quizzesAverage !== null ? `${fg.quizzesAverage.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500">
                        {fg.practicalsScore !== null ? `${fg.practicalsScore.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500">
                        {fg.exam1Score !== null ? `${fg.exam1Score.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500">
                        {fg.exam2Score !== null ? `${fg.exam2Score.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500">
                        {fg.exam3Score !== null ? `${fg.exam3Score.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500">
                        {fg.finalExamScore !== null ? `${fg.finalExamScore.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {fg.finalGrade !== null ? (
                          <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${fg.finalGrade >= 80 ? 'bg-green-100 text-green-800' :
                            fg.finalGrade >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {fg.finalGrade.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Sin datos suficientes</span>
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

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-red-600">
            <IconAlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <IconBookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-2">No tienes cursos asignados.</p>
            <p className="text-slate-500 text-sm">Crea un curso para comenzar a gestionar calificaciones.</p>
          </div>
        </Card>
      ) : grades.length === 0 && !loading ? (
        <Card>
          <div className="text-center py-12">
            <IconChartBar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-2">No hay calificaciones disponibles aún.</p>
            <p className="text-slate-500 text-sm">
              {selectedCourse
                ? 'Los estudiantes aún no han completado evaluaciones en este curso.'
                : 'Selecciona un curso para ver las calificaciones de los estudiantes.'}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Evaluación
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Puntaje
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{grade.studentName}</div>
                        <div className="text-xs text-slate-500">{grade.studentEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{grade.assessmentTitle}</div>
                        {grade.courseTitle && (
                          <div className="text-xs text-slate-500">{grade.courseTitle}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(grade.assessmentType)}`}>
                        {getTypeLabel(grade.assessmentType)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatScore(grade)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreColor(grade.percentage)}`}>
                        {formatPercentage(grade)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(grade.submittedAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${grade.status === 'graded'
                        ? 'bg-green-100 text-green-800'
                        : grade.status === 'submitted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {grade.status === 'graded' ? 'Calificado' : grade.status === 'submitted' ? 'En revisión' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/quiz/${grade.assessmentId}/results/${grade.attemptId}`}
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
        </Card>
      )}
    </div>
  );
};

export default TeacherGradesPage;

