// pages/CourseComprehensiveReportPage.tsx
// Página unificada que combina progreso académico + analíticas del Tutor IA

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService, Course } from '@/services/teacherCourses';
import { comprehensiveReportService, CourseComprehensiveReport } from '@/services/comprehensiveReportService';
import { adminReportsService } from '@/services/adminReportsService';
import { institutionService } from '@/services/institutionService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import ComprehensiveStudentCard from '@/components/Features/ComprehensiveStudentCard';
import CorrelationChart from '@/components/Features/CorrelationChart';
import InsightsPanel from '@/components/Features/InsightsPanel';
import ExportReportButton from '@/components/Features/ExportReportButton';
import { IconChevronLeft, IconRefreshCw, IconUsers, IconChartBar, IconRobot, IconBookOpen, IconDollarSign, IconCheckCircle, IconAlertTriangle } from '@/components/Common/Icons';

export const CourseComprehensiveReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [report, setReport] = useState<CourseComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [userInstitutionId, setUserInstitutionId] = useState<number | null>(null);

  useEffect(() => {
    if (id && user?.id) {
      // Obtener institución del usuario si es admin-campus o coordinator
      const isAdminCampus = user?.role?.name === 'admin-campus';
      const isCoordinator = user?.role?.name === 'coordinator';
      
      if (isAdminCampus || isCoordinator) {
        institutionService.getUserInstitution(user.id).then(institution => {
          if (institution) {
            setUserInstitutionId(institution.id);
          }
        });
      }
      
      loadData();
    }
  }, [id, dateFrom, dateTo, user?.id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const courseId = parseInt(id);

      // Cargar curso
      const courseData = await courseService.getCourse(courseId);
      
      // Verificar que el curso pertenezca a la institución del usuario (si es admin-campus/coordinator)
      const isAdminCampus = user?.role?.name === 'admin-campus';
      const isCoordinator = user?.role?.name === 'coordinator';
      
      // Verificar acceso por institución si es admin-campus/coordinator
      if ((isAdminCampus || isCoordinator) && userInstitutionId && courseData) {
        // Obtener institución del curso
        const { data: courseInstitution } = await supabase
          .from('courses')
          .select('institution_id')
          .eq('id', courseId)
          .single();
        
        if (courseInstitution?.institution_id !== userInstitutionId) {
          setError('No tienes acceso a este curso. Solo puedes ver cursos de tu institución.');
          setLoading(false);
          return;
        }
      }
      
      setCourse(courseData);

      // Cargar informe comprehensivo con filtros de fecha
      const comprehensiveReport = await comprehensiveReportService.getCourseComprehensiveReport(
        courseId,
        dateFrom || undefined,
        dateTo || undefined
      );
      
      if (!comprehensiveReport) {
        setError('No se pudo cargar el informe comprehensivo');
        return;
      }

      setReport(comprehensiveReport);
    } catch (err: any) {
      console.error('Error loading comprehensive report:', err);
      setError(err.message || 'Error al cargar el informe comprehensivo');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <p className="text-red-800">{error}</p>
            <Button onClick={loadData} className="mt-4">
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!course || !report) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">Curso no encontrado o sin datos</p>
          </div>
        </Card>
      </div>
    );
  }

  // Determinar qué mostrar según el rol
  const isAdmin = user?.role?.name === 'admin';
  const isAdminCampus = user?.role?.name === 'admin-campus';
  const isCoordinator = user?.role?.name === 'coordinator';
  const showCosts = isAdmin; // Solo admin ve costos

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teacher/courses">
            <Button variant="secondary" leftIcon={<IconChevronLeft className="w-4 h-4" />}>
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Informe Comprehensivo</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {report && (
            <ExportReportButton
              report={report}
              courseTitle={course.title}
              showCosts={showCosts}
            />
          )}
          <Button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            variant="secondary"
          >
            {viewMode === 'cards' ? 'Vista Tabla' : 'Vista Tarjetas'}
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={<IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <IconBookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Progreso Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.aggregated.averageProgress.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <IconRobot className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Uso Promedio Tutor</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.aggregated.averageTutorInteractions.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <IconCheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Correlación Positiva</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.correlation.positiveCorrelation.toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center gap-3">
            <IconAlertTriangle className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Necesitan Atención</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.aggregated.studentsNeedingAttention}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Advertencia para admin-campus/coordinator */}
      {(isAdminCampus || isCoordinator) && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Estás viendo solo los cursos de tu institución. Los tokens y costos no se muestran en esta vista.
            </p>
          </div>
        </Card>
      )}

      {/* Gráfico de Correlación */}
      {report.students.length > 0 && (
        <CorrelationChart students={report.students} />
      )}

      {/* Insights y Recomendaciones */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconRobot className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Insights y Recomendaciones Automáticas
          </h2>
        </div>
        <InsightsPanel
          aggregated={report.aggregated}
          correlation={report.correlation}
          courseTitle={course.title}
        />
      </Card>

      {/* Métricas Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <IconUsers className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Estudiantes Totales</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{report.aggregated.totalStudents}</p>
        </Card>

        {showCosts && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <IconDollarSign className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Costo Total Tutor</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(report.aggregated.totalCost)}
            </p>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <IconChartBar className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Eficiencia Promedio</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {report.correlation.efficiencyScore.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Lista de Estudiantes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Estudiantes ({report.students.length})
          </h2>
          <div className="text-sm text-gray-600">
            Ordenados por: {viewMode === 'cards' ? 'Riesgo' : 'Progreso'}
          </div>
        </div>

        {report.students.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No hay estudiantes activos en este curso</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-4">
            {/* Ordenar por nivel de riesgo */}
            {report.students
              .sort((a, b) => {
                const riskOrder = { high: 0, medium: 1, low: 2 };
                return riskOrder[a.insights.riskLevel] - riskOrder[b.insights.riskLevel];
              })
              .map((student) => (
                <ComprehensiveStudentCard
                  key={student.studentId}
                  data={student}
                  showDetails={true}
                  showCosts={showCosts}
                />
              ))}
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
                    Progreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutor IA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correlación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eficiencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Riesgo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.students
                  .sort((a, b) => b.academicProgress.completionPercentage - a.academicProgress.completionPercentage)
                  .map((student) => {
                    const correlationConfig = {
                      'high-usage-high-progress': { label: '✅ Positiva', color: 'text-green-600' },
                      'high-usage-low-progress': { label: '❌ Negativa', color: 'text-red-600' },
                      'low-usage-high-progress': { label: '⚠️ Sin Tutor', color: 'text-blue-600' },
                      'low-usage-low-progress': { label: '🔴 Bajo', color: 'text-orange-600' }
                    };
                    const config = correlationConfig[student.insights.tutorUsageVsProgress];

                    return (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.studentName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {Math.round(student.academicProgress.completionPercentage)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {student.tutorMetrics.totalInteractions} interacciones
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {student.insights.efficiency.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded ${
                            student.insights.riskLevel === 'high'
                              ? 'bg-red-100 text-red-800'
                              : student.insights.riskLevel === 'medium'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {student.insights.riskLevel === 'high' ? 'Alto' : student.insights.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CourseComprehensiveReportPage;

