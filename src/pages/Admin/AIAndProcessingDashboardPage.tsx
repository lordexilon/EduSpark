import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  costService,
  type CostSummary,
  type DailyCost,
  type ProcessingCost,
} from '@/services/costService';
import {
  aiUsageService,
  type DailyUsageStats,
  type UserUsageStats,
} from '@/services/aiUsageService';
import { supabase } from '@/lib/supabase';
import {
  IconBrain,
  IconDollarSign,
  IconFileText,
  IconRefreshCw,
  IconTrendingUp,
  IconUsers,
} from '@/components/Common/Icons';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';

type DateRange = '7d' | '30d' | '90d' | 'all';
type DashboardView = 'overview' | 'processing-jobs' | 'processing-users' | 'ai-users' | 'ai-daily';
type ProcessingUserProfile = { name: string; email?: string };

const AIAndProcessingDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedView, setSelectedView] = useState<DashboardView>('overview');

  const [processingCosts, setProcessingCosts] = useState<ProcessingCost[]>([]);
  const [processingUserStats, setProcessingUserStats] = useState<CostSummary[]>([]);
  const [processingDailyStats, setProcessingDailyStats] = useState<DailyCost[]>([]);
  const [processingUserProfiles, setProcessingUserProfiles] = useState<
    Record<string, ProcessingUserProfile>
  >({});
  const [processingOverallStats, setProcessingOverallStats] = useState({
    totalCost: 0,
    totalJobs: 0,
    avgCostPerJob: 0,
    totalPages: 0,
    totalChunks: 0,
  });

  const [aiUserStats, setAiUserStats] = useState<UserUsageStats[]>([]);
  const [aiDailyStats, setAiDailyStats] = useState<DailyUsageStats[]>([]);
  const [aiTotals, setAiTotals] = useState({
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalInputCost: 0,
    totalOutputCost: 0,
    totalCost: 0,
    uniqueUsers: 0,
  });

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user, dateRange]);

  const getDateRange = (): { startDate?: Date; endDate: Date; days: number } => {
    const endDate = new Date();
    if (dateRange === 'all') return { endDate, days: 365 };

    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate, days };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate, days } = getDateRange();
      const processingStartDateISO = startDate?.toISOString();
      const processingEndDateISO = endDate.toISOString();

      const [
        costsData,
        processingUserStatsData,
        processingDailyStatsData,
        processingOverallStatsData,
        aiUserStatsData,
        aiDailyStatsData,
        aiTotalsData,
      ] = await Promise.all([
        costService.getCosts({
          startDate: processingStartDateISO,
          endDate: processingEndDateISO,
          limit: 100,
        }),
        costService.getCostsByUser(),
        costService.getDailyCosts(dateRange === 'all' ? 365 : days),
        costService.getOverallStats(),
        aiUsageService.getUserUsageStats(startDate, endDate),
        aiUsageService.getDailyUsageStats(startDate, endDate),
        aiUsageService.getTotalUsageStats(),
      ]);

      setProcessingCosts(costsData);
      setProcessingUserStats(processingUserStatsData);
      setProcessingDailyStats(processingDailyStatsData);
      setProcessingOverallStats(processingOverallStatsData);
      await loadProcessingUserProfiles(processingUserStatsData);

      setAiUserStats(aiUserStatsData);
      setAiDailyStats(aiDailyStatsData);
      setAiTotals(aiTotalsData);
    } catch (err: any) {
      console.error('Error cargando dashboard combinado:', err);
      setError(err?.message || 'Error al cargar el dashboard combinado');
    } finally {
      setLoading(false);
    }
  };

  const loadProcessingUserProfiles = async (stats: CostSummary[]) => {
    const userIds = Array.from(
      new Set(
        stats.map((row) => row.user_id).filter((id): id is string => Boolean(id && id.trim()))
      )
    );

    if (userIds.length === 0) {
      setProcessingUserProfiles({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (error) {
        console.warn('No se pudieron resolver perfiles de usuarios de procesamiento:', error);
        setProcessingUserProfiles({});
        return;
      }

      const profiles: Record<string, ProcessingUserProfile> = {};
      (data || []).forEach((user: any) => {
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        profiles[user.id] = {
          name: fullName || user.email || 'Usuario sin nombre',
          email: user.email || undefined,
        };
      });
      setProcessingUserProfiles(profiles);
    } catch (err) {
      console.warn('Error resolviendo nombres para dashboard de procesamiento:', err);
      setProcessingUserProfiles({});
    }
  };

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value || 0);

  const formatNumber = (value: number): string => new Intl.NumberFormat('es-ES').format(value || 0);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#020617]">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full animate-pulse blur-sm"></div>
          </div>
        </div>
        <p className="mt-8 text-[11px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Iniciando Red Neuronal...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-6 font-bold">{error}</p>
            <Button onClick={() => void loadData()} className="rounded-xl">
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10 space-y-10 max-w-7xl">
      {/* 1. Header Premium "Neural Center" */}
      <header className="relative overflow-hidden rounded-[2.5rem] bg-[#020617] p-10 md:p-12 shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
              <span className="text-[10px] font-black text-purple-100/70 uppercase tracking-[0.2em]">
                SISTRÓNICA DE IA ACTIVADA
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight italic">
              Neural{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Hub
              </span>
            </h1>
            <p className="text-blue-100/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              Monitoreo analítico de infraestructura, costos de procesamiento y consumo de modelos
              generativos en tiempo real.
            </p>
          </div>
          <Button
            onClick={() => void loadData()}
            className="h-14 px-8 bg-white text-[#020617] hover:bg-blue-50 font-black rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3"
          >
            <IconRefreshCw className="w-5 h-5 animate-spin-slow" />
            Sincronizar Datos
          </Button>
        </div>
      </header>

      <div className="bg-gray-50/50 dark:bg-gray-800/20 p-2 rounded-2xl flex flex-wrap gap-2 items-center border border-gray-100 dark:border-gray-800">
        <Button
          variant={dateRange === '7d' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('7d')}
          className="rounded-xl px-5 font-bold"
        >
          7 días
        </Button>
        <Button
          variant={dateRange === '30d' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('30d')}
          className="rounded-xl px-5 font-bold"
        >
          30 días
        </Button>
        <Button
          variant={dateRange === '90d' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('90d')}
          className="rounded-xl px-5 font-bold"
        >
          90 días
        </Button>
        <Button
          variant={dateRange === 'all' ? 'primary' : 'ghost'}
          onClick={() => setDateRange('all')}
          className="rounded-xl px-5 font-bold"
        >
          Todo el tiempo
        </Button>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl flex flex-wrap gap-2 items-center border border-gray-100 dark:border-gray-800">
        <Button
          variant={selectedView === 'overview' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('overview')}
          className="rounded-xl px-5 font-bold"
        >
          Resumen
        </Button>
        <Button
          variant={selectedView === 'processing-jobs' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('processing-jobs')}
          className="rounded-xl px-5 font-bold"
        >
          Jobs Procesamiento
        </Button>
        <Button
          variant={selectedView === 'processing-users' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('processing-users')}
          className="rounded-xl px-5 font-bold"
        >
          Procesamiento por Usuario
        </Button>
        <Button
          variant={selectedView === 'ai-users' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('ai-users')}
          className="rounded-xl px-5 font-bold"
        >
          IA por Usuario
        </Button>
        <Button
          variant={selectedView === 'ai-daily' ? 'primary' : 'ghost'}
          onClick={() => setSelectedView('ai-daily')}
          className="rounded-xl px-5 font-bold"
        >
          IA Diario
        </Button>
      </div>

      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="border-none shadow-2xl rounded-[2rem] p-8 bg-surface/40 backdrop-blur-xl border-white/40 dark:border-white/5 hover:-translate-y-2 transition-all duration-300">
            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-3">
              Infraestructura
            </p>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter italic">
              {formatCurrency(processingOverallStats.totalCost)}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-light/70">
                {formatNumber(processingOverallStats.totalJobs)} Procesos
              </span>
              <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <IconFileText className="size-4" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-2xl rounded-[2rem] p-8 bg-surface/40 backdrop-blur-xl border-white/40 dark:border-white/5 hover:-translate-y-2 transition-all duration-300">
            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-3">
              Modelos de IA
            </p>
            <p className="text-4xl font-black text-purple-600 dark:text-purple-400 tracking-tighter italic">
              {formatCurrency(aiTotals.totalCost)}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-light/70">
                {formatNumber(aiTotals.totalRequests)} Requests
              </span>
              <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                <IconBrain className="size-4" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-2xl rounded-[2rem] p-8 bg-surface/40 backdrop-blur-xl border-white/40 dark:border-white/5 hover:-translate-y-2 transition-all duration-300">
            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-3">
              Audiencia Activa
            </p>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter italic">
              {formatNumber(aiTotals.uniqueUsers)}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-light/70">Usuarios Únicos</span>
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <IconUsers className="size-4" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-2xl rounded-[2rem] p-8 bg-gradient-to-br from-orange-500 to-red-600 hover:-translate-y-2 transition-all duration-300">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <p className="relative z-10 text-[10px] font-black text-white/70 uppercase tracking-widest mb-3">
              Inversión Bruta
            </p>
            <p className="relative z-10 text-4xl font-black text-white tracking-tighter italic">
              {formatCurrency(processingOverallStats.totalCost + aiTotals.totalCost)}
            </p>
            <div className="relative z-10 mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-white/70">Total Operativo</span>
              <div className="size-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <IconDollarSign className="size-4" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {selectedView === 'processing-jobs' && (
        <Card className="border-none shadow-2xl bg-surface/50 backdrop-blur-2xl dark:bg-gray-900/60 rounded-[2.5rem] overflow-hidden p-0 border border-white/10">
          <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-white/5">
            <h2 className="text-xl font-black text-text-dark uppercase tracking-tight">
              Registro de Jobs de Procesamiento
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest">
                    Archivo
                  </th>
                  <th className="px-4 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest text-right">
                    Págs
                  </th>
                  <th className="px-4 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest text-right">
                    Chunks
                  </th>
                  <th className="px-4 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest text-right">
                    Total
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {processingCosts.map((cost) => (
                  <tr
                    key={cost.id}
                    className="hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <td
                      className="px-8 py-5 max-w-xs truncate font-bold text-text-dark group-hover:text-primary transition-colors"
                      title={cost.file_name}
                    >
                      {cost.file_name}
                    </td>
                    <td className="px-4 py-5 text-right font-bold text-text-light/70">
                      {cost.total_pages || 0}
                    </td>
                    <td className="px-4 py-5 text-right font-bold text-text-light/70">
                      {cost.total_chunks || 0}
                    </td>
                    <td className="px-4 py-5 text-right font-black text-text-dark group-hover:scale-110 transition-transform origin-right">
                      {formatCurrency(cost.actual_costs?.total || 0)}
                    </td>
                    <td className="px-8 py-5 text-[10px] font-black text-text-light/40">
                      {formatDate(cost.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedView === 'processing-users' && (
        <Card className="border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden p-0">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Procesamiento por Usuario
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Usuario
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Jobs
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Costo
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Páginas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {processingUserStats.map((stat, index) => (
                  <tr
                    key={`${stat.user_id}-${index}`}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-8 py-4">
                      <div className="font-bold text-gray-700 dark:text-gray-300 text-sm truncate max-w-[250px]">
                        {stat.user_id
                          ? processingUserProfiles[stat.user_id]?.name || 'Usuario sin nombre'
                          : 'System Process'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                        {stat.user_id
                          ? processingUserProfiles[stat.user_id]?.email || stat.user_id
                          : 'Sin usuario asociado'}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatNumber(stat.total_jobs)}
                    </td>
                    <td className="px-8 py-4 text-right font-black text-primary">
                      {formatCurrency(stat.total_cost)}
                    </td>
                    <td className="px-8 py-4 text-right text-gray-500">
                      {formatNumber(stat.total_pages_processed || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedView === 'ai-users' && (
        <Card className="border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden p-0">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Consumo de IA por Usuario
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Usuario
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Solicitudes
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Tokens
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Costo
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Último uso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {aiUserStats.map((stat) => (
                  <tr
                    key={stat.user_id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {stat.user_name || stat.user_email || 'Usuario sin nombre'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {stat.user_email || stat.user_id}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                      {formatNumber(stat.total_requests)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                      {formatNumber(stat.total_tokens)}
                    </td>
                    <td className="px-4 py-4 text-right font-black text-purple-600 dark:text-purple-400">
                      {formatCurrency(stat.total_cost)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {stat.last_usage ? formatDate(stat.last_usage) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedView === 'ai-daily' && (
        <Card className="border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden p-0">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Serie Diaria de Consumo IA
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Fecha
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Solicitudes
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Tokens
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Costo Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {aiDailyStats.map((stat) => (
                  <tr
                    key={stat.usage_date}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-8 py-4 font-bold text-gray-700 dark:text-gray-300">
                      {formatDate(stat.usage_date)}
                    </td>
                    <td className="px-8 py-4 text-right text-gray-600 dark:text-gray-400">
                      {formatNumber(stat.request_count)}
                    </td>
                    <td className="px-8 py-4 text-right text-gray-600 dark:text-gray-400">
                      {formatNumber(stat.total_tokens)}
                    </td>
                    <td className="px-8 py-4 text-right font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(stat.total_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedView === 'overview' && (
        <Card className="border-none shadow-2xl rounded-[2.5rem] p-10 bg-surface/50 backdrop-blur-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="relative group">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500/20 group-hover:bg-blue-500 transition-colors rounded-full"></div>
              <div className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.2em] mb-2">
                Páginas procesadas
              </div>
              <div className="text-4xl font-black text-text-dark tracking-tighter">
                {formatNumber(processingOverallStats.totalPages)}
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-purple-500/20 group-hover:bg-purple-500 transition-colors rounded-full"></div>
              <div className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.2em] mb-2">
                Chunks generados
              </div>
              <div className="text-4xl font-black text-text-dark tracking-tighter">
                {formatNumber(processingOverallStats.totalChunks)}
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors rounded-full"></div>
              <div className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.2em] mb-2">
                Inversión Input
              </div>
              <div className="text-4xl font-black text-text-dark tracking-tighter">
                {formatCurrency(aiTotals.totalInputCost)}
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-orange-500/20 group-hover:bg-orange-500 transition-colors rounded-full"></div>
              <div className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.2em] mb-2">
                Inversión Output
              </div>
              <div className="text-4xl font-black text-text-dark tracking-tighter">
                {formatCurrency(aiTotals.totalOutputCost)}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AIAndProcessingDashboardPage;
