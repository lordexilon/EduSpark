// components/ComprehensiveStudentCard.tsx
// Componente que muestra progreso académico + métricas del Tutor IA combinadas

import React from 'react';
import {
  IconBookOpen,
  IconClipboardCheck,
  IconRobot,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertCircle,
  IconCheckCircle,
} from '@/components/Common/Icons';
import ProgressBar from '@/components/Common/ProgressBar';
import type { ComprehensiveStudentData } from '@/services/comprehensiveReportService';

interface ComprehensiveStudentCardProps {
  data: ComprehensiveStudentData;
  showDetails?: boolean;
  showCosts?: boolean; // Si false, oculta tokens y costos
  className?: string;
}

/**
 * Componente que muestra un informe completo de un estudiante
 * combinando progreso académico y uso del Tutor IA
 */
const ComprehensiveStudentCard: React.FC<ComprehensiveStudentCardProps> = ({
  data,
  showDetails = true,
  showCosts = true, // Por defecto mostrar costos
  className = '',
}) => {
  const { academicProgress, tutorMetrics, insights } = data;

  // Iconos y colores según el tipo de correlación
  const correlationConfig = {
    'high-usage-high-progress': {
      icon: IconCheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: '✅ Correlación Positiva',
      description: 'Alto progreso con buen uso del tutor',
    },
    'high-usage-low-progress': {
      icon: IconAlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: '❌ Necesita Atención',
      description: 'Mucho uso del tutor pero bajo progreso',
    },
    'low-usage-high-progress': {
      icon: IconTrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: '⚠️ Sin Tutor',
      description: 'Buen progreso sin usar el tutor',
    },
    'low-usage-low-progress': {
      icon: IconTrendingDown,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      label: '🔴 Bajo Rendimiento',
      description: 'Bajo progreso y poco uso del tutor',
    },
  };

  const config = correlationConfig[insights.tutorUsageVsProgress];
  const CorrelationIcon = config.icon;

  // Formatear costo
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const hours = Math.floor(academicProgress.timeSpentMinutes / 60);
  const minutes = academicProgress.timeSpentMinutes % 60;

  return (
    <div
      className={`bg-white border-2 ${config.border} rounded-lg p-5 shadow-md hover:shadow-lg transition-shadow ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{data.studentName}</h3>
          {data.studentEmail && <p className="text-sm text-gray-600">{data.studentEmail}</p>}
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} border ${config.border}`}
        >
          <div className="flex items-center gap-1">
            <CorrelationIcon className="w-4 h-4" />
            {config.label}
          </div>
        </div>
      </div>

      {/* Progreso General */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progreso del Curso</span>
          <span className="text-lg font-bold text-gray-900">
            {Math.round(academicProgress.completionPercentage)}%
          </span>
        </div>
        <ProgressBar
          value={academicProgress.completionPercentage}
          color="var(--primary)"
          height="h-3"
        />
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Progreso Académico */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <IconBookOpen className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900">Progreso Académico</h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Unidades:</span>
              <span className="font-semibold text-gray-900">
                {academicProgress.completedUnits}/{academicProgress.totalUnits}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sesiones:</span>
              <span className="font-semibold text-gray-900">
                {academicProgress.completedSessions}/{academicProgress.totalSessions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quizzes:</span>
              <span className="font-semibold text-gray-900">
                {academicProgress.completedQuizzes}/{academicProgress.totalQuizzes}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Tiempo:</span>
              <span className="font-semibold text-gray-900">
                {hours > 0 ? `${hours}h ` : ''}
                {minutes}m
              </span>
            </div>
          </div>
        </div>

        {/* Tutor IA */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <IconRobot className="w-5 h-5 text-purple-600" />
            <h4 className="text-sm font-semibold text-gray-900">Tutor IA</h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Interacciones:</span>
              <span className="font-semibold text-gray-900">{tutorMetrics.totalInteractions}</span>
            </div>
            {showCosts && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tokens:</span>
                  <span className="font-semibold text-gray-900">
                    {tutorMetrics.totalTokens.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(tutorMetrics.totalCost)}
                  </span>
                </div>
              </>
            )}
            <div
              className={`flex justify-between ${showCosts ? 'pt-2 border-t border-gray-200' : ''}`}
            >
              <span className="text-gray-600">Última:</span>
              <span className="font-semibold text-gray-900 text-xs">
                {formatDate(tutorMetrics.lastInteractionDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Eficiencia */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Eficiencia del Tutor:</span>
          <span className="text-sm font-semibold text-gray-900">
            {insights.efficiency.toFixed(1)}% por interacción
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {insights.efficiency > 5
            ? 'Excelente uso del tutor'
            : insights.efficiency > 2
              ? 'Uso moderado del tutor'
              : 'Baja eficiencia - revisar estrategia'}
        </div>
      </div>

      {/* Insights y Recomendaciones */}
      {showDetails && (
        <div className={`mt-4 p-4 rounded-lg border ${config.border} ${config.bg}`}>
          <div className="flex items-start gap-2 mb-2">
            <CorrelationIcon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{config.label}</h4>
              <p className="text-xs text-gray-700 mb-3">{config.description}</p>

              {insights.recommendedActions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-2">Recomendaciones:</p>
                  <ul className="space-y-1">
                    {insights.recommendedActions.map((action, index) => (
                      <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nivel de Riesgo */}
      {insights.riskLevel !== 'low' && (
        <div
          className={`mt-3 p-2 rounded text-xs font-medium text-center ${
            insights.riskLevel === 'high'
              ? 'bg-red-100 text-red-800'
              : 'bg-orange-100 text-orange-800'
          }`}
        >
          Nivel de Riesgo: {insights.riskLevel === 'high' ? 'Alto' : 'Medio'}
        </div>
      )}
    </div>
  );
};

export default ComprehensiveStudentCard;
