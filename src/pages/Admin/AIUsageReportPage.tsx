// pages/AIUsageReportPage.tsx
// Página de reportes de consumo de IA para administradores

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { aiUsageService, UserUsageStats, DailyUsageStats, MonthlyUsageStats } from '@/services/aiUsageService';
import { IconDownload, IconCalendar, IconTrendingUp, IconUsers, IconDollarSign, IconRefreshCw } from '@/components/Common/Icons';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';

const AIUsageReportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos de reporte
  const [userStats, setUserStats] = useState<UserUsageStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyUsageStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyUsageStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalInputCost: 0,
    totalOutputCost: 0,
    totalCost: 0,
    uniqueUsers: 0
  });
  
  // Filtros
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedView, setSelectedView] = useState<'users' | 'daily' | 'monthly'>('users');
  
  // Verificar permisos
  useEffect(() => {
    const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'coordinator';
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!isAdmin) {
      setError('No tienes permisos para acceder a esta página. Solo administradores y coordinadores pueden ver reportes de consumo.');
      setLoading(false);
      return;
    }
    
    loadReportData();
  }, [user, dateRange]);
  
  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calcular fechas según el rango seleccionado
      let startDate: Date | undefined;
      const endDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'all':
          startDate = undefined;
          break;
      }
      
      // Cargar datos en paralelo
      const [userStatsData, dailyStatsData, monthlyStatsData, totalStatsData] = await Promise.all([
        aiUsageService.getUserUsageStats(startDate, endDate),
        aiUsageService.getDailyUsageStats(startDate, endDate),
        aiUsageService.getMonthlyUsageStats(),
        aiUsageService.getTotalUsageStats()
      ]);
      
      setUserStats(userStatsData);
      setDailyStats(dailyStatsData);
      setMonthlyStats(monthlyStatsData);
      setTotalStats(totalStatsData);
      
    } catch (err: any) {
      console.error('Error cargando reportes:', err);
      setError('Error al cargar los reportes. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(value);
  };
  
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('es-ES').format(value);
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      totals: totalStats,
      userStats,
      dailyStats,
      monthlyStats
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-usage-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Cargando reportes...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error && !userStats.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6">
            <div className="text-center text-red-600">{error}</div>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reporte de Consumo de IA</h1>
            <p className="mt-2 text-gray-600">Monitoreo de tokens y costos de Gemini API</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={loadReportData}
              className="flex items-center gap-2"
            >
              <IconRefreshCw className="w-5 h-5" />
              Actualizar
            </Button>
            <Button
              variant="primary"
              onClick={exportReport}
              className="flex items-center gap-2"
            >
              <IconDownload className="w-5 h-5" />
              Exportar
            </Button>
          </div>
        </div>
        
        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Rango de fechas:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="all">Todo el tiempo</option>
            </select>
            
            <label className="text-sm font-medium text-gray-700 ml-4">Vista:</label>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="users">Por Usuario</option>
              <option value="daily">Diario</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
        </Card>
        
        {/* Estadísticas Totales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Solicitudes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalStats.totalRequests)}</p>
              </div>
              <IconTrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Tokens</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalStats.totalTokens)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatNumber(totalStats.totalInputTokens)} entrada / {formatNumber(totalStats.totalOutputTokens)} salida
                </p>
              </div>
              <IconUsers className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Costo Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalStats.totalCost)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(totalStats.totalInputCost)} entrada / {formatCurrency(totalStats.totalOutputCost)} salida
                </p>
              </div>
              <IconDollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuarios Únicos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalStats.uniqueUsers)}</p>
              </div>
              <IconUsers className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>
        
        {/* Tabla de Datos */}
        <Card className="p-6">
          {selectedView === 'users' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Consumo por Usuario</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitudes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Uso</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userStats.map((stat) => (
                      <tr key={stat.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {stat.user_name && stat.user_name !== 'Usuario sin nombre' 
                                ? stat.user_name 
                                : stat.user_email || stat.user_id || 'Usuario desconocido'}
                            </div>
                            {stat.user_email && stat.user_email !== stat.user_name && (
                              <div className="text-sm text-gray-500">{stat.user_email}</div>
                            )}
                            {!stat.user_email && (
                              <div className="text-sm text-gray-500">ID: {stat.user_id.substring(0, 8)}...</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(stat.total_requests)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatNumber(stat.total_tokens)}</div>
                          <div className="text-xs text-gray-500">
                            {formatNumber(stat.total_input_tokens)} / {formatNumber(stat.total_output_tokens)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(stat.total_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.last_usage ? formatDate(stat.last_usage) : '-'}
                        </td>
                      </tr>
                    ))}
                    {userStats.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No hay datos disponibles para el rango seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {selectedView === 'daily' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Consumo Diario</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitudes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyStats.map((stat) => (
                      <tr key={stat.usage_date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(stat.usage_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(stat.request_count)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatNumber(stat.total_tokens)}</div>
                          <div className="text-xs text-gray-500">
                            {formatNumber(stat.total_input_tokens)} / {formatNumber(stat.total_output_tokens)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(stat.total_cost)}
                        </td>
                      </tr>
                    ))}
                    {dailyStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No hay datos disponibles para el rango seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {selectedView === 'monthly' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Consumo Mensual</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitudes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyStats.map((stat) => (
                      <tr key={stat.usage_month} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(stat.usage_month)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(stat.request_count)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatNumber(stat.total_tokens)}</div>
                          <div className="text-xs text-gray-500">
                            {formatNumber(stat.total_input_tokens)} / {formatNumber(stat.total_output_tokens)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(stat.total_cost)}
                        </td>
                      </tr>
                    ))}
                    {monthlyStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No hay datos disponibles
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AIUsageReportPage;

