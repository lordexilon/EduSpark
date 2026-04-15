// =====================================================
// Dashboard de Uso de Tokens para Gemini API
// Monitoreo de costos y uso en tiempo real
// =====================================================

import React, { useState, useEffect } from 'react';
import { tokenMonitoring } from "../services/tokenMonitoringService";
import { IconDollarSign, IconTrendingUp, IconAlertTriangle, IconDownload, IconRefreshCw } from '@/components/Common/Icons';

interface TokenUsageDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TokenUsageDashboard: React.FC<TokenUsageDashboardProps> = ({ isOpen, onClose }) => {
  const [todayUsage, setTodayUsage] = useState(tokenMonitoring.getTodayUsage());
  const [monthUsage, setMonthUsage] = useState(tokenMonitoring.getCurrentMonthUsage());
  const [usageHistory, setUsageHistory] = useState(tokenMonitoring.getUsageHistory(7));
  const [modelStats, setModelStats] = useState(tokenMonitoring.getUsageByModel());
  const [alerts, setAlerts] = useState(tokenMonitoring.getUsageAlerts());

  const refreshData = () => {
    setTodayUsage(tokenMonitoring.getTodayUsage());
    setMonthUsage(tokenMonitoring.getCurrentMonthUsage());
    setUsageHistory(tokenMonitoring.getUsageHistory(7));
    setModelStats(tokenMonitoring.getUsageByModel());
    setAlerts(tokenMonitoring.getUsageAlerts());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const interval = setInterval(refreshData, 30000); // Actualizar cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  const exportData = () => {
    const data = tokenMonitoring.exportUsageData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eduspark-token-usage-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconDollarSign className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Monitoreo de Tokens - Gemini API</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshData}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Actualizar datos"
              >
                <IconRefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={exportData}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Exportar datos"
              >
                <IconDownload className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Alertas */}
          {alerts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <IconAlertTriangle className="w-5 h-5 text-orange-500" />
                Alertas de Uso
              </h3>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${alert.severity === 'critical'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : 'bg-yellow-50 border-yellow-500 text-yellow-800'
                      }`}
                  >
                    <div className="font-medium">{alert.message}</div>
                    <div className="text-sm opacity-75">
                      {alert.type === 'daily' ? 'Uso diario' : 'Uso mensual'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen del día */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Costo Hoy</div>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(todayUsage.totalCost)}</div>
              <div className="text-xs text-blue-600">{todayUsage.requestCount} consultas</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Tokens Entrada</div>
              <div className="text-2xl font-bold text-green-900">{formatNumber(todayUsage.totalInputTokens)}</div>
              <div className="text-xs text-green-600">hoy</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Tokens Salida</div>
              <div className="text-2xl font-bold text-purple-900">{formatNumber(todayUsage.totalOutputTokens)}</div>
              <div className="text-xs text-purple-600">hoy</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Costo Mes</div>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(monthUsage.totalCost)}</div>
              <div className="text-xs text-orange-600">{monthUsage.requestCount} consultas</div>
            </div>
          </div>

          {/* Uso por modelo */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Uso por Modelo</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {Object.keys(modelStats).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(modelStats).map(([model, stats]) => (
                    <div key={model} className="bg-white p-4 rounded-lg border">
                      <div className="font-medium text-gray-900">{model}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatNumber(stats.totalTokens)} tokens
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(stats.totalCost)} costo
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stats.requestCount} consultas
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <IconTrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay datos de uso aún</p>
                  <p className="text-sm">Los datos aparecerán después de hacer consultas</p>
                </div>
              )}
            </div>
          </div>

          {/* Historial de 7 días */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Historial de 7 Días</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {usageHistory.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {day.requestCount} consultas
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-gray-600">
                        {formatNumber(day.totalInputTokens + day.totalOutputTokens)} tokens
                      </div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(day.totalCost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Información de precios */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Precios Actuales (por 1M tokens)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="font-medium text-gray-900">gemini-1.5-flash</div>
                <div className="text-sm text-gray-600">Entrada: $0.075</div>
                <div className="text-sm text-gray-600">Salida: $0.30</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-medium text-gray-900">gemini-1.5-pro</div>
                <div className="text-sm text-gray-600">Entrada: $1.25</div>
                <div className="text-sm text-gray-600">Salida: $5.00</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-medium text-gray-900">gemini-2.5-flash</div>
                <div className="text-sm text-gray-600">Entrada: $0.075</div>
                <div className="text-sm text-gray-600">Salida: $0.30</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

