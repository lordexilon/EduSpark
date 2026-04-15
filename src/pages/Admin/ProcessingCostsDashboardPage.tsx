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
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Cargando analítica de costos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrendingUp className="w-8 h-8 text-red-600 dark:text-red-400 rotate-180" />
            </div>
            <p className="text-red-600 dark:text-red-400 mb-6 font-bold">{error}</p>
            <Button onClick={() => window.location.href = '/teacher/dashboard'} className="rounded-xl">
              Volver al Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Analítica de Costos de Procesamiento
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium italic">
            Visualización avanzada del consumo de infraestructura y modelos
          </p>
        </div>
        <Button onClick={loadData} variant="secondary" size="default" className="rounded-xl border-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
          <IconRefreshCw className="w-4 h-4 mr-2" />
          Actualizar Datos
        </Button>
      </div>

      {/* Filtros y controles */}
      <div className="bg-gray-50/50 dark:bg-gray-800/20 p-2 rounded-2xl flex flex-wrap gap-2 items-center border border-gray-100 dark:border-gray-800">
        <Button
          variant={dateRange === '7d' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('7d')}
          className={`rounded-xl px-6 font-bold ${dateRange === '7d' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          7 días
        </Button>
        <Button
          variant={dateRange === '30d' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('30d')}
          className={`rounded-xl px-6 font-bold ${dateRange === '30d' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          30 días
        </Button>
        <Button
          variant={dateRange === '90d' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('90d')}
          className={`rounded-xl px-6 font-bold ${dateRange === '90d' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          90 días
        </Button>
        <Button
          variant={dateRange === 'all' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('all')}
          className={`rounded-xl px-6 font-bold ${dateRange === 'all' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Todo el tiempo
        </Button>
      </div>

      {/* Vista de resumen */}
      {selectedView === 'overview' && (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-xl shadow-blue-500/5 bg-white dark:bg-gray-900 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Costo Total Periodo</p>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {formatCurrency(overallStats.totalCost)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <IconDollarSign className="w-8 h-8" />
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-xl shadow-emerald-500/5 bg-white dark:bg-gray-900 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Volumen Procesado</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {overallStats.totalJobs} <span className="text-sm font-medium text-gray-400">jobs</span>
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <IconFileText className="w-8 h-8" />
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-xl shadow-purple-500/5 bg-white dark:bg-gray-900 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Ticket Promedio</p>
                  <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
                    {formatCurrency(overallStats.avgCostPerJob)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
                  <IconTrendingUp className="w-8 h-8" />
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-xl shadow-orange-500/5 bg-white dark:bg-gray-900 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Densidad Páginas</p>
                  <p className="text-3xl font-black text-orange-600 dark:text-orange-400">
                    {overallStats.totalPages.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl">
                  <IconFileText className="w-8 h-8" />
                </div>
              </div>
            </Card>
          </div>

          {/* Desglose de costos por servicio */}
          <Card className="border-none shadow-2xl shadow-indigo-500/5 bg-white dark:bg-gray-900 rounded-3xl p-8">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight">Estructura de Gastos por Infraestructura</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
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
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">OCR (Vision Intelligence)</p>
                      <p className="text-2xl font-black text-blue-900 dark:text-white">
                        {formatCurrency(totals.ocr)}
                      </p>
                      <div className="mt-3 w-full h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${totalAll > 0 ? (totals.ocr / totalAll) * 100 : 0}%` }}></div>
                      </div>
                      <p className="text-[10px] text-blue-500 font-bold mt-2">
                        {totalAll > 0 ? `${((totals.ocr / totalAll) * 100).toFixed(1)}%` : '0%'} de la carga
                      </p>
                    </div>

                    <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20 p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Embeddings (Gemini LLM)</p>
                      <p className="text-2xl font-black text-purple-900 dark:text-white">
                        {formatCurrency(totals.embeddings)}
                      </p>
                      <div className="mt-3 w-full h-1 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600" style={{ width: `${totalAll > 0 ? (totals.embeddings / totalAll) * 100 : 0}%` }}></div>
                      </div>
                      <p className="text-[10px] text-purple-500 font-bold mt-2">
                        {totalAll > 0 ? `${((totals.embeddings / totalAll) * 100).toFixed(1)}%` : '0%'} de la carga
                      </p>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Edge Compute / Run</p>
                      <p className="text-2xl font-black text-emerald-900 dark:text-white">
                        {formatCurrency(totals.cloudRun)}
                      </p>
                      <div className="mt-3 w-full h-1 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600" style={{ width: `${totalAll > 0 ? (totals.cloudRun / totalAll) * 100 : 0}%` }}></div>
                      </div>
                      <p className="text-[10px] text-emerald-500 font-bold mt-2">
                        {totalAll > 0 ? `${((totals.cloudRun / totalAll) * 100).toFixed(1)}%` : '0%'} de la carga
                      </p>
                    </div>

                    <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/20 p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Data Storage / Vector</p>
                      <p className="text-2xl font-black text-orange-900 dark:text-white">
                        {formatCurrency(totals.firestore)}
                      </p>
                      <div className="mt-3 w-full h-1 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-600" style={{ width: `${totalAll > 0 ? (totals.firestore / totalAll) * 100 : 0}%` }}></div>
                      </div>
                      <p className="text-[10px] text-orange-500 font-bold mt-2">
                        {totalAll > 0 ? `${((totals.firestore / totalAll) * 100).toFixed(1)}%` : '0%'} de la carga
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>

          {/* Gráfico de costos diarios */}
          <Card className="border-none shadow-2xl shadow-indigo-500/5 bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden p-0">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Serie Histórica Diaria</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Operativa</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Volumen Jobs</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Inversión Total</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Eff. Cost/Job</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Páginas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {dailyStats.slice(0, 30).map((stat, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                      <td className="px-8 py-4 font-bold text-gray-700 dark:text-gray-300">
                        {new Date(stat.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-4 text-right font-medium text-gray-600 dark:text-gray-400">{stat.total_jobs}</td>
                      <td className="px-8 py-4 text-right font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(stat.total_cost)}
                      </td>
                      <td className="px-8 py-4 text-right text-gray-500 dark:text-gray-500 font-medium">
                        {formatCurrency(stat.avg_cost_per_job)}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400">
                          {stat.total_pages_processed?.toLocaleString() || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dailyStats.length === 0 && (
                <div className="p-20 text-center text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs italic">
                  No hay registros disponibles en este rango.
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Vista de jobs individuales */}
      {selectedView === 'jobs' && (
        <Card className="border-none shadow-2xl shadow-indigo-500/5 bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden p-0">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Registro Maestro de Procesamiento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Archivo / Recurso</th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Págs</th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Chunks</th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Duración</th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">OCR</th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Gemini</th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate font-bold text-gray-700 dark:text-gray-300" title={cost.file_name}>
                        {cost.file_name}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-gray-500">{cost.total_pages || 0}</td>
                    <td className="px-4 py-4 text-right font-medium text-gray-500">{cost.total_chunks || 0}</td>
                    <td className="px-4 py-4 text-right font-bold text-gray-400 dark:text-gray-500 text-xs">{formatTime(cost.execution_time_seconds)}</td>
                    <td className="px-4 py-4 text-right text-xs font-bold text-blue-600/70">
                      {formatCurrency(cost.actual_costs?.ocr || 0)}
                    </td>
                    <td className="px-4 py-4 text-right text-xs font-bold text-purple-600/70">
                      {formatCurrency(cost.actual_costs?.embeddings || 0)}
                    </td>
                    <td className="px-4 py-4 text-right font-black text-gray-900 dark:text-white">
                      {formatCurrency(cost.actual_costs?.total || 0)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-600 italic">
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
        <Card className="border-none shadow-2xl shadow-indigo-500/5 bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden p-0">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Atribución de Costos por Usuario</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificador Usuario (UUID/Email)</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Volumen Jobs</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Gasto Acumulado</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Páginas Totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {userStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                    <td className="px-8 py-4 font-bold text-gray-600 dark:text-gray-400 text-xs truncate max-w-[200px]">{stat.user_id || 'System Process'}</td>
                    <td className="px-8 py-4 text-right font-bold text-gray-900 dark:text-white">{stat.total_jobs}</td>
                    <td className="px-8 py-4 text-right font-black text-primary">
                      {formatCurrency(stat.total_cost)}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">
                        {stat.total_pages_processed?.toLocaleString() || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Navegación de vistas sub-level */}
      <div className="bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl flex flex-wrap gap-2 items-center border border-gray-100 dark:border-gray-800">
        <Button
          variant={selectedView === 'overview' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('overview')}
          className={`rounded-xl px-6 font-bold ${selectedView === 'overview' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Resumen Ejecutivo
        </Button>
        <Button
          variant={selectedView === 'jobs' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('jobs')}
          className={`rounded-xl px-6 font-bold ${selectedView === 'jobs' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Registro de Jobs
        </Button>
        <Button
          variant={selectedView === 'users' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('users')}
          className={`rounded-xl px-6 font-bold ${selectedView === 'users' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Atribución por Usuario
        </Button>
        <Button
          variant={selectedView === 'courses' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('courses')}
          className={`rounded-xl px-6 font-bold ${selectedView === 'courses' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Análisis por Curso
        </Button>
        <Button
          variant={selectedView === 'daily' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('daily')}
          className={`rounded-xl px-6 font-bold ${selectedView === 'daily' ? '' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Serie Diaria
        </Button>
      </div>
    </div>
  );
};

export default ProcessingCostsDashboardPage;

