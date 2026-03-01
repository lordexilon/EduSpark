// pages/ProcessingCostsDashboardPage.tsx
// Dashboard de costos de procesamiento de archivos para administradores

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { costService, ProcessingCost, CostSummary, DailyCost } from '@/services/costService';
import { IconDownload, IconCalendar, IconTrendingUp, IconUsers, IconDollarSign, IconRefreshCw, IconFileText, IconClock } from '@/components/Common/Icons';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';

const ProcessingCostsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos
  const [costs, setCosts] = useState<ProcessingCost[]>([]);
  const [userStats, setUserStats] = useState<CostSummary[]>([]);
  const [courseStats, setCourseStats] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyCost[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalCost: 0,
    totalJobs: 0,
    avgCostPerJob: 0,
    totalPages: 0,
    totalChunks: 0,
  });
  
  // Filtros
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedView, setSelectedView] = useState<'overview' | 'jobs' | 'users' | 'courses' | 'daily'>('overview');
  
  // Cargar datos cuando cambie el rango de fechas
  // La verificación de permisos la hace AdminRoute
  useEffect(() => {
    console.log('📊 ProcessingCostsDashboardPage - useEffect:', {
      hasUser: !!user,
      userId: user?.id,
      roleName: user?.role?.name,
      roleId: user?.role?.id
    });
    
    if (user) {
      loadData();
    }
  }, [user, dateRange]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calcular fechas
      const endDate = new Date().toISOString();
      let startDate: string | undefined;
      
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const start = new Date();
        start.setDate(start.getDate() - days);
        startDate = start.toISOString();
      }
      
      // Cargar datos en paralelo
      const [costsData, userStatsData, courseStatsData, dailyStatsData, overallStatsData] = await Promise.all([
        costService.getCosts({ startDate, endDate, limit: 100 }),
        costService.getCostsByUser(),
        costService.getCostsByCourse(),
        costService.getDailyCosts(dateRange === 'all' ? 365 : parseInt(dateRange)),
        costService.getOverallStats(),
      ]);
      
      setCosts(costsData);
      setUserStats(userStatsData);
      setCourseStats(courseStatsData);
      setDailyStats(dailyStatsData);
      setOverallStats(overallStatsData);
      
    } catch (err: any) {
      console.error('Error cargando datos de costos:', err);
      setError(err.message || 'Error al cargar datos de costos');
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };
  
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <IconRefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando datos de costos...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.href = '/teacher/dashboard'}>
              Volver al Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard de Costos de Procesamiento
        </h1>
        <p className="text-gray-600">
          Monitoreo y análisis de costos de procesamiento de archivos
        </p>
      </div>
      
      {/* Filtros y controles */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={dateRange === '7d' ? 'primary' : 'secondary'}
            onClick={() => setDateRange('7d')}
            size="sm"
          >
            7 días
          </Button>
          <Button
            variant={dateRange === '30d' ? 'primary' : 'secondary'}
            onClick={() => setDateRange('30d')}
            size="sm"
          >
            30 días
          </Button>
          <Button
            variant={dateRange === '90d' ? 'primary' : 'secondary'}
            onClick={() => setDateRange('90d')}
            size="sm"
          >
            90 días
          </Button>
          <Button
            variant={dateRange === 'all' ? 'primary' : 'secondary'}
            onClick={() => setDateRange('all')}
            size="sm"
          >
            Todo
          </Button>
        </div>
        
        <Button onClick={loadData} variant="secondary" size="sm">
          <IconRefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>
      
      {/* Vista de resumen */}
      {selectedView === 'overview' && (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Costo Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(overallStats.totalCost)}
                  </p>
                </div>
                <IconDollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total de Jobs</p>
                  <p className="text-2xl font-bold text-green-600">
                    {overallStats.totalJobs}
                  </p>
                </div>
                <IconFileText className="w-8 h-8 text-green-600" />
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Costo Promedio</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(overallStats.avgCostPerJob)}
                  </p>
                </div>
                <IconTrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Páginas Procesadas</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {overallStats.totalPages.toLocaleString()}
                  </p>
                </div>
                <IconFileText className="w-8 h-8 text-orange-600" />
              </div>
            </Card>
          </div>
          
          {/* Desglose de costos por servicio */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Desglose de Costos por Servicio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                // Calcular totales por servicio
                const totals = costs.reduce((acc, cost) => {
                  acc.ocr += cost.actual_costs?.ocr || 0;
                  acc.embeddings += cost.actual_costs?.embeddings || 0;
                  acc.cloudRun += cost.actual_costs?.cloudRun || 0;
                  acc.firestore += cost.actual_costs?.firestore || 0;
                  return acc;
                }, { ocr: 0, embeddings: 0, cloudRun: 0, firestore: 0 });
                
                const totalAll = totals.ocr + totals.embeddings + totals.cloudRun + totals.firestore;
                
                return (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">OCR (Google Vision)</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(totals.ocr)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {totalAll > 0 ? `${((totals.ocr / totalAll) * 100).toFixed(1)}%` : '0%'} del total
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Embeddings (Gemini API)</p>
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(totals.embeddings)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {totalAll > 0 ? `${((totals.embeddings / totalAll) * 100).toFixed(1)}%` : '0%'} del total
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cloud Functions</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(totals.cloudRun)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {totalAll > 0 ? `${((totals.cloudRun / totalAll) * 100).toFixed(1)}%` : '0%'} del total
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Firestore</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatCurrency(totals.firestore)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {totalAll > 0 ? `${((totals.firestore / totalAll) * 100).toFixed(1)}%` : '0%'} del total
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>
          
          {/* Gráfico de costos diarios */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Costos Diarios</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Fecha</th>
                    <th className="text-right py-2 px-4">Jobs</th>
                    <th className="text-right py-2 px-4">Costo Total</th>
                    <th className="text-right py-2 px-4">Costo Promedio</th>
                    <th className="text-right py-2 px-4">Páginas</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.slice(0, 30).map((stat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{new Date(stat.date).toLocaleDateString('es-PE')}</td>
                      <td className="text-right py-2 px-4">{stat.total_jobs}</td>
                      <td className="text-right py-2 px-4 font-semibold">
                        {formatCurrency(stat.total_cost)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(stat.avg_cost_per_job)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {stat.total_pages_processed?.toLocaleString() || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      
      {/* Vista de jobs individuales */}
      {selectedView === 'jobs' && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Jobs de Procesamiento</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Archivo</th>
                  <th className="text-right py-2 px-4">Páginas</th>
                  <th className="text-right py-2 px-4">Chunks</th>
                  <th className="text-right py-2 px-4">Tiempo</th>
                  <th className="text-right py-2 px-4">OCR</th>
                  <th className="text-right py-2 px-4">Gemini</th>
                  <th className="text-right py-2 px-4">Cloud Run</th>
                  <th className="text-right py-2 px-4">Firestore</th>
                  <th className="text-right py-2 px-4 font-semibold">Total</th>
                  <th className="text-left py-2 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => (
                  <tr key={cost.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">
                      <div className="max-w-xs truncate" title={cost.file_name}>
                        {cost.file_name}
                      </div>
                    </td>
                    <td className="text-right py-2 px-4">{cost.total_pages || 0}</td>
                    <td className="text-right py-2 px-4">{cost.total_chunks || 0}</td>
                    <td className="text-right py-2 px-4">{formatTime(cost.execution_time_seconds)}</td>
                    <td className="text-right py-2 px-4 text-sm">
                      {formatCurrency(cost.actual_costs?.ocr || 0)}
                    </td>
                    <td className="text-right py-2 px-4 text-sm">
                      {formatCurrency(cost.actual_costs?.embeddings || 0)}
                    </td>
                    <td className="text-right py-2 px-4 text-sm">
                      {formatCurrency(cost.actual_costs?.cloudRun || 0)}
                    </td>
                    <td className="text-right py-2 px-4 text-sm">
                      {formatCurrency(cost.actual_costs?.firestore || 0)}
                    </td>
                    <td className="text-right py-2 px-4 font-semibold">
                      {formatCurrency(cost.actual_costs?.total || 0)}
                    </td>
                    <td className="text-left py-2 px-4 text-sm text-gray-600">
                      {formatDate(cost.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {/* Vista por usuarios */}
      {selectedView === 'users' && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Costos por Usuario</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Usuario</th>
                  <th className="text-right py-2 px-4">Jobs</th>
                  <th className="text-right py-2 px-4">Costo Total</th>
                  <th className="text-right py-2 px-4">Costo Promedio</th>
                  <th className="text-right py-2 px-4">Páginas</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((stat, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{stat.user_id || 'N/A'}</td>
                    <td className="text-right py-2 px-4">{stat.total_jobs}</td>
                    <td className="text-right py-2 px-4 font-semibold">
                      {formatCurrency(stat.total_cost)}
                    </td>
                    <td className="text-right py-2 px-4">
                      {formatCurrency(stat.avg_cost_per_job)}
                    </td>
                    <td className="text-right py-2 px-4">
                      {stat.total_pages_processed?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {/* Navegación de vistas */}
      <div className="mt-6 flex gap-2">
        <Button
          variant={selectedView === 'overview' ? 'primary' : 'secondary'}
          onClick={() => setSelectedView('overview')}
        >
          Resumen
        </Button>
        <Button
          variant={selectedView === 'jobs' ? 'primary' : 'secondary'}
          onClick={() => setSelectedView('jobs')}
        >
          Jobs
        </Button>
        <Button
          variant={selectedView === 'users' ? 'primary' : 'secondary'}
          onClick={() => setSelectedView('users')}
        >
          Por Usuario
        </Button>
        <Button
          variant={selectedView === 'courses' ? 'primary' : 'secondary'}
          onClick={() => setSelectedView('courses')}
        >
          Por Curso
        </Button>
        <Button
          variant={selectedView === 'daily' ? 'primary' : 'secondary'}
          onClick={() => setSelectedView('daily')}
        >
          Diario
        </Button>
      </div>
    </div>
  );
};

export default ProcessingCostsDashboardPage;

