// pages/AdminComprehensiveReportsPage.tsx
// Página para admin: Vista global de todos los reportes con tokens/costos

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminReportsService, InstitutionReport, GlobalMetrics } from '@/services/adminReportsService';
import { Link } from 'react-router-dom';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconChevronRight, IconRefreshCw, IconBookOpen, IconUsers, IconRobot, IconDollarSign, IconChartBar, IconTrendingUp } from '@/components/Common/Icons';
import ProgressBar from '@/components/Common/ProgressBar';
import ExportAdminReportButton from '@/components/Features/ExportAdminReportButton';

export const AdminComprehensiveReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<InstitutionReport[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user?.id && user?.role?.name === 'admin') {
      loadData();
    } else {
      setError('Solo los administradores pueden acceder a esta página');
      setLoading(false);
    }
  }, [user?.id, dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [institutionsData, globalMetricsData] = await Promise.all([
        adminReportsService.getAllInstitutionsReports(
          dateFrom || undefined,
          dateTo || undefined
        ),
        adminReportsService.getGlobalMetrics(
          dateFrom || undefined,
          dateTo || undefined
        )
      ]);

      setInstitutions(institutionsData);
      setGlobalMetrics(globalMetricsData);
    } catch (err: any) {
      console.error('Error loading admin reports:', err);
      setError(err.message || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleInstitution = (institutionId: number) => {
    const newExpanded = new Set(expandedInstitutions);
    if (newExpanded.has(institutionId)) {
      newExpanded.delete(institutionId);
    } else {
      newExpanded.add(institutionId);
    }
    setExpandedInstitutions(newExpanded);
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

  if (user?.role?.name !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="p-4">
            <p className="text-yellow-800">
              No tienes permisos para acceder a esta página. Solo los administradores pueden ver reportes globales.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes Comprehensivos Globales</h1>
          <p className="text-gray-600 mt-1">
            Vista administrativa de todas las instituciones, carreras y cursos
          </p>
        </div>
        <div className="flex gap-2">
          <ExportAdminReportButton
            institutions={institutions}
            globalMetrics={globalMetrics}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={<IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Desde:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Hasta:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              variant="secondary"
              size="sm"
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Métricas Globales */}
      {globalMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <IconUsers className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Instituciones</p>
                <p className="text-2xl font-bold text-gray-900">{globalMetrics.totalInstitutions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <IconBookOpen className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Cursos Totales</p>
                <p className="text-2xl font-bold text-gray-900">{globalMetrics.totalCourses}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <IconUsers className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Estudiantes</p>
                <p className="text-2xl font-bold text-gray-900">{globalMetrics.totalStudents}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-3">
              <IconDollarSign className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Costo Total Combinado</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(globalMetrics.totalAllCosts || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tutor: {formatCurrency(globalMetrics.totalCost || 0)} | 
                  Procesamiento: {formatCurrency(globalMetrics.processingCost || 0)} | 
                  IA: {formatCurrency(globalMetrics.aiUsageCost || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Desglose de Costos */}
      {globalMetrics && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Desglose de Costos Totales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Tutor IA</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(globalMetrics.totalCost)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {globalMetrics.totalAllCosts > 0 
                  ? `${((globalMetrics.totalCost / globalMetrics.totalAllCosts) * 100).toFixed(1)}% del total`
                  : '0%'}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Procesamiento</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(globalMetrics.processingCost || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(globalMetrics.totalAllCosts || 0) > 0 
                  ? `${(((globalMetrics.processingCost || 0) / globalMetrics.totalAllCosts) * 100).toFixed(1)}% del total`
                  : '0%'}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Uso de IA</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(globalMetrics.aiUsageCost || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(globalMetrics.totalAllCosts || 0) > 0 
                  ? `${(((globalMetrics.aiUsageCost || 0) / globalMetrics.totalAllCosts) * 100).toFixed(1)}% del total`
                  : '0%'}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Total General</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(globalMetrics.totalAllCosts)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                100% del total
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Métricas Adicionales Globales */}
      {globalMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <IconChartBar className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Progreso Promedio</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {globalMetrics.averageProgress.toFixed(1)}%
            </p>
            <ProgressBar 
              value={globalMetrics.averageProgress} 
              color="var(--primary)"
              height="h-2"
              className="mt-2"
            />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <IconRobot className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Interacciones Totales</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {globalMetrics.totalTutorInteractions.toLocaleString()}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <IconTrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Tokens Totales</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {globalMetrics.totalTokens.toLocaleString()}
            </p>
          </Card>
        </div>
      )}

      {/* Lista de Instituciones */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Instituciones ({institutions.length})
        </h2>

        {institutions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No hay instituciones con datos disponibles</p>
          </div>
        ) : (
          <div className="space-y-4">
            {institutions.map((institution) => (
              <div
                key={institution.institutionId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleInstitution(institution.institutionId)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <IconBookOpen className="w-6 h-6 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {institution.institutionName}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{institution.totalCourses} cursos</span>
                        <span>•</span>
                        <span>{institution.totalStudents} estudiantes</span>
                        <span>•</span>
                        <span>{institution.totalTeachers} profesores</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Progreso Promedio</p>
                      <p className="text-lg font-bold text-gray-900">
                        {institution.averageProgress.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Costo Total</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(institution.totalAllCosts || institution.totalCost)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tutor: {formatCurrency(institution.totalCost || 0)} | 
                        Proc: {formatCurrency(institution.processingCost || 0)} | 
                        IA: {formatCurrency(institution.aiUsageCost || 0)}
                      </p>
                    </div>
                    <IconChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedInstitutions.has(institution.institutionId) ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {expandedInstitutions.has(institution.institutionId) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Interacciones</p>
                        <p className="font-semibold text-gray-900">
                          {institution.totalTutorInteractions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tokens</p>
                        <p className="font-semibold text-gray-900">
                          {institution.totalTokens.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Costo Tutor</p>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(institution.totalCost || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Costo Procesamiento</p>
                        <p className="font-semibold text-purple-600">
                          {formatCurrency(institution.processingCost || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Costo IA</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(institution.aiUsageCost || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Costo Total de la Institución:</p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(institution.totalAllCosts || institution.totalCost || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Cursos de la institución */}
                    {institution.courses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          Cursos ({institution.courses.length})
                        </h4>
                        <div className="space-y-2">
                          {institution.courses.map((course) => (
                            <Link
                              key={course.courseId}
                              to={`/teacher/courses/${course.courseId}/comprehensive-report`}
                              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{course.courseTitle}</h5>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                    <span>{course.totalStudents} estudiantes</span>
                                    <span>•</span>
                                    <span>Progreso: {course.averageProgress.toFixed(1)}%</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-600">Costo</p>
                                  <p className="text-sm font-semibold text-orange-600">
                                    {formatCurrency(course.totalCost)}
                                  </p>
                                  <IconChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminComprehensiveReportsPage;

