import React from 'react';
import { UserUsageStats } from '@/services/aiUsageService';
import { IconDownload, IconTrendingUp, IconAlertTriangle } from '@/components/Common/Icons';
import { Card } from '@/components/ui/card';

interface AIUsageStatsTableProps {
  stats: UserUsageStats[];
  loading?: boolean;
}

export const AIUsageStatsTable: React.FC<AIUsageStatsTableProps> = ({ stats, loading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando datos de consumo...</div>;
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        No hay datos de consumo disponibles para el período seleccionado.
      </div>
    );
  }

  // Sort by cost descending by default
  const sortedStats = [...stats].sort((a, b) => b.total_cost - a.total_cost);

  return (
    <div className="overflow-hidden bg-white shadow-sm rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Usuario
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Solicitudes
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Tokens (In/Out)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Costo Total
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Último Uso
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {sortedStats.map((stat) => {
              const highCost = stat.total_cost > 1.0; // Alert if > $1
              return (
                <tr
                  key={stat.user_id}
                  className={`hover:bg-slate-50 transition-colors ${highCost ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        {stat.user_name ? stat.user_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {stat.user_name && stat.user_name !== 'Usuario sin nombre'
                            ? stat.user_name
                            : 'Usuario Desconocido'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {stat.user_email || stat.user_id.substring(0, 8) + '...'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatNumber(stat.total_requests)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{formatNumber(stat.total_tokens)}</div>
                    <div className="text-xs text-slate-500">
                      I: {formatNumber(stat.total_input_tokens)} / O:{' '}
                      {formatNumber(stat.total_output_tokens)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-bold ${highCost ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      {formatCurrency(stat.total_cost)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(stat.last_usage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {highCost ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <IconTrendingUp className="w-3 h-3 mr-1" /> Alto Consumo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
