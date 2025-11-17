// pages/TeacherTutorAnalyticsPage.tsx
// Dashboard para docentes: Análisis de desempeño del Tutor IA por curso y estudiante

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { courseService, Course } from '../services/teacherCourses';
import {
  getStudentMetrics,
  getCourseMetrics,
  getTopicAnalysis,
  getStudentsNeedingAttention,
  StudentMetrics,
  CourseMetrics,
} from '../services/tutorAnalyticsService';
import { getCostMetrics } from '../services/tutorCostService';
import { analyzeCoursePerformance, AdvisorAnalysis } from '../services/teacherAdvisorAgent';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  IconBookOpen,
  IconStudent,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconDollarSign,
  IconRefreshCw,
  IconChartBar,
  IconUsers,
  IconMessage,
  IconRobot,
} from '../components/Icons';

const TeacherTutorAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics[]>([]);
  const [courseMetrics, setCourseMetrics] = useState<CourseMetrics | null>(null);
  const [costMetrics, setCostMetrics] = useState<any>(null);
  const [studentsNeedingAttention, setStudentsNeedingAttention] = useState<
    Array<{ studentId: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  >([]);
  const [advisorAnalysis, setAdvisorAnalysis] = useState<AdvisorAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    console.log('📊 Tutor Analytics: Componente montado o usuario cambió', { userId: user?.id, userRole: user?.role?.name });
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('📊 Tutor Analytics: Curso seleccionado cambió:', selectedCourseId);
    if (selectedCourseId) {
      loadAnalytics();
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      console.log('📊 Tutor Analytics: Cargando cursos...', { userId: user?.id, userRole: user?.role?.name });
      // Verificar si es admin o coordinador para ver todos los cursos
      const userRole = user?.role?.name;
      const isAdminOrCoordinator = userRole === 'admin' || userRole === 'coordinator';
      
      const coursesData = isAdminOrCoordinator
        ? await courseService.getAllCourses()
        : await courseService.getMyCourses(user!.id);
      
      console.log('📊 Tutor Analytics: Cursos cargados:', { count: coursesData.length, courses: coursesData.map(c => ({ id: c.id, title: c.title })) });
      
      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourseId) {
        // Course.id puede ser number o string dependiendo de la BD
        setSelectedCourseId(String(coursesData[0].id));
        console.log('📊 Tutor Analytics: Curso seleccionado automáticamente:', coursesData[0].id);
      }
    } catch (error) {
      console.error('❌ Tutor Analytics: Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedCourseId) {
      console.log('⚠️ Tutor Analytics: No hay curso seleccionado');
      return;
    }

    console.log('📊 Tutor Analytics: Cargando datos de análisis para curso:', selectedCourseId);
    setLoading(true);
    try {
      const [students, course, costs, attention] = await Promise.all([
        getStudentMetrics(selectedCourseId),
        getCourseMetrics(selectedCourseId),
        getCostMetrics({ courseId: selectedCourseId }),
        getStudentsNeedingAttention(selectedCourseId),
      ]);

      console.log('📊 Tutor Analytics: Datos cargados:', {
        studentsCount: students.length,
        courseMetrics: course ? {
          courseId: course.courseId,
          courseTitle: course.courseTitle,
          totalStudents: course.totalStudents,
          activeStudents: course.activeStudents,
          totalInteractions: course.totalInteractions,
          totalCost: course.totalCost,
        } : null,
        costsMetrics: costs ? { totalCost: costs.totalCost, totalInteractions: costs.totalInteractions } : null,
        attentionCount: attention.length,
      });

      setStudentMetrics(students);
      setCourseMetrics(course);
      setCostMetrics(costs);
      setStudentsNeedingAttention(attention);

      // Generar análisis con IA si hay datos
      if (course && students.length > 0) {
        console.log('🤖 Tutor Analytics: Generando análisis con IA...');
        setAnalyzing(true);
        try {
          const analysis = await analyzeCoursePerformance(course, students);
          console.log('✅ Tutor Analytics: Análisis de IA generado:', {
            summary: analysis.summary?.substring(0, 100) + '...',
            insightsCount: analysis.keyInsights.length,
            recommendationsCount: analysis.recommendations.length,
          });
          setAdvisorAnalysis(analysis);
        } catch (error) {
          console.error('❌ Tutor Analytics: Error generating advisor analysis:', error);
          // Continuar sin análisis de IA
        } finally {
          setAnalyzing(false);
        }
      } else {
        console.log('⚠️ Tutor Analytics: No hay datos suficientes para análisis de IA:', {
          hasCourse: !!course,
          studentsCount: students.length,
        });
        setAdvisorAnalysis(null);
      }
    } catch (error) {
      console.error('❌ Tutor Analytics: Error loading analytics:', error);
    } finally {
      setLoading(false);
      console.log('✅ Tutor Analytics: Carga de análisis completada');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-dark">Análisis del Tutor IA</h1>
        <p className="text-text-light mt-1">
          {user?.role?.name === 'admin' || user?.role?.name === 'coordinator'
            ? 'Evalúa el desempeño de todos los cursos y estudiantes con el Tutor Virtual'
            : 'Evalúa el desempeño del curso y de cada estudiante con el Tutor Virtual'}
        </p>
      </div>

      {/* Selector de Curso */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-text-dark">Curso:</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Selecciona un curso</option>
            {courses.map((course) => (
              <option key={course.id} value={String(course.id)}>
                {course.title}
              </option>
            ))}
          </select>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <IconRefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </Card>

      {!selectedCourseId ? (
        <Card className="p-8 text-center">
          <IconBookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-text-dark">Selecciona un curso</h3>
          <p className="mt-1 text-sm text-text-light">
            Elige un curso para ver el análisis del Tutor IA
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Métricas Generales del Curso */}
          {courseMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconUsers className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">
                        Participación Total
                      </dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.activeStudents} / {courseMetrics.totalStudents}
                      </dd>
                      <dd className="text-xs text-text-light">
                        {Math.round(courseMetrics.participationRate)}% de estudiantes
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconMessage className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">
                        Interacciones
                      </dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.totalInteractions}
                      </dd>
                      <dd className="text-xs text-text-light">
                        Promedio: {courseMetrics.averageInteractionsPerStudent.toFixed(1)} por
                        estudiante
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconDollarSign className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">Costo Total</dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {formatCurrency(courseMetrics.totalCost)}
                      </dd>
                      <dd className="text-xs text-text-light">
                        {courseMetrics.totalInteractions > 0
                          ? formatCurrency(
                              courseMetrics.totalCost / courseMetrics.totalInteractions
                            )
                          : '$0.00'}{' '}
                        por interacción
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconChartBar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">Tokens</dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.totalTokens.toLocaleString()}
                      </dd>
                      <dd className="text-xs text-text-light">
                        {courseMetrics.totalInteractions > 0
                          ? Math.round(courseMetrics.totalTokens / courseMetrics.totalInteractions)
                          : 0}{' '}
                        por interacción
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Análisis y Recomendaciones del Asesor IA */}
          {advisorAnalysis && (
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <IconRobot className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-text-dark">
                  Análisis y Recomendaciones del Asesor IA
                </h2>
                {analyzing && (
                  <div className="ml-auto">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Resumen Ejecutivo */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-text-dark mb-2">Resumen Ejecutivo</h3>
                <p className="text-sm text-text-light whitespace-pre-line">{advisorAnalysis.summary}</p>
              </div>

              {/* Insights Clave */}
              {advisorAnalysis.keyInsights.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-text-dark mb-2">Insights Clave</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {advisorAnalysis.keyInsights.map((insight, index) => (
                      <li key={index} className="text-sm text-text-light">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones */}
              {advisorAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-text-dark mb-4">Recomendaciones</h3>
                  <div className="space-y-4">
                    {advisorAnalysis.recommendations.map((rec, index) => {
                      const priorityColors = {
                        high: 'border-red-200 bg-red-50',
                        medium: 'border-orange-200 bg-orange-50',
                        low: 'border-yellow-200 bg-yellow-50',
                      };

                      const priorityIcons = {
                        high: '🔴',
                        medium: '🟠',
                        low: '🟡',
                      };

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span>{priorityIcons[rec.priority]}</span>
                                <h4 className="font-semibold text-text-dark">{rec.title}</h4>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    rec.priority === 'high'
                                      ? 'bg-red-200 text-red-800'
                                      : rec.priority === 'medium'
                                      ? 'bg-orange-200 text-orange-800'
                                      : 'bg-yellow-200 text-yellow-800'
                                  }`}
                                >
                                  {rec.priority === 'high'
                                    ? 'Alta'
                                    : rec.priority === 'medium'
                                    ? 'Media'
                                    : 'Baja'}
                                </span>
                              </div>
                              <p className="text-sm text-text-light mt-1">{rec.description}</p>
                            </div>
                          </div>
                          {rec.actionItems.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-text-dark mb-1">
                                Acciones sugeridas:
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {rec.actionItems.map((action, actionIndex) => (
                                  <li key={actionIndex} className="text-xs text-text-light">
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Alertas: Estudiantes que Necesitan Atención */}
          {studentsNeedingAttention.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <IconAlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-text-dark">
                  Estudiantes que Necesitan Atención
                </h2>
              </div>
              <div className="space-y-2">
                {studentsNeedingAttention.map((item) => {
                  const student = studentMetrics.find((s) => s.studentId === item.studentId);
                  if (!student) return null;

                  const priorityColors = {
                    high: 'bg-red-100 text-red-800 border-red-200',
                    medium: 'bg-orange-100 text-orange-800 border-orange-200',
                    low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  };

                  return (
                    <div
                      key={item.studentId}
                      className={`p-3 rounded-lg border ${priorityColors[item.priority]}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-sm opacity-75">{item.reason}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            item.priority === 'high'
                              ? 'bg-red-200'
                              : item.priority === 'medium'
                              ? 'bg-orange-200'
                              : 'bg-yellow-200'
                          }`}
                        >
                          {item.priority === 'high'
                            ? 'Alta'
                            : item.priority === 'medium'
                            ? 'Media'
                            : 'Baja'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Lista de Estudiantes con Métricas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-dark mb-4">
              Desempeño por Estudiante
            </h2>
            {studentMetrics.length === 0 ? (
              <div className="text-center py-8">
                <IconStudent className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-text-dark">
                  No hay datos disponibles
                </h3>
                <p className="mt-1 text-sm text-text-light">
                  Los estudiantes aún no han usado el Tutor IA en este curso
                </p>
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
                        Interacciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Costo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última Interacción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Desempeño
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentMetrics.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-text-dark">
                              {student.studentName}
                            </div>
                            <div className="text-sm text-text-light">{student.studentEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                          {student.totalInteractions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                          {student.totalTokens.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                          {formatCurrency(student.totalCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                          {formatDate(student.lastInteractionDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.performanceImprovement !== null ? (
                            <div className="flex items-center">
                              {student.performanceImprovement > 0 ? (
                                <>
                                  <IconTrendingUp className="h-4 w-4 text-green-600 mr-1" />
                                  <span className="text-sm text-green-600">
                                    +{student.performanceImprovement.toFixed(1)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <IconTrendingDown className="h-4 w-4 text-red-600 mr-1" />
                                  <span className="text-sm text-red-600">
                                    {student.performanceImprovement.toFixed(1)}%
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-text-light">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Temas Más Consultados */}
          {courseMetrics && courseMetrics.topTopics.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-dark mb-4">
                Temas Más Consultados
              </h2>
              <div className="space-y-2">
                {courseMetrics.topTopics.slice(0, 10).map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-text-dark">{topic.topic}</span>
                    <span className="text-sm text-text-light">{topic.count} consultas</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherTutorAnalyticsPage;

