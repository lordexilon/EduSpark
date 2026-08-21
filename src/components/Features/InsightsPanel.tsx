// components/InsightsPanel.tsx
// Panel de insights y recomendaciones generadas automáticamente

import React from 'react';
import {
  IconRobot,
  IconAlertTriangle,
  IconCheckCircle,
  IconTrendingUp,
} from '@/components/Common/Icons';
import type { AggregatedMetrics, CorrelationAnalysis } from '@/services/comprehensiveReportService';

interface InsightsPanelProps {
  aggregated: AggregatedMetrics;
  correlation: CorrelationAnalysis;
  courseTitle: string;
  className?: string;
}

/**
 * Componente que muestra insights automáticos y recomendaciones
 * basadas en las métricas agregadas del curso
 */
const InsightsPanel: React.FC<InsightsPanelProps> = ({
  aggregated,
  correlation,
  courseTitle,
  className = '',
}) => {
  // Generar insights automáticos
  const generateInsights = () => {
    const insights: Array<{
      type: 'success' | 'warning' | 'info' | 'danger';
      icon: React.ComponentType<any>;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Insight 1: Correlación positiva
    if (correlation.positiveCorrelation > 60) {
      insights.push({
        type: 'success',
        icon: IconCheckCircle,
        title: 'Excelente Correlación',
        description: `${correlation.positiveCorrelation.toFixed(0)}% de los estudiantes muestran correlación positiva entre uso del tutor y progreso académico. El tutor está siendo efectivo.`,
        priority: 'low',
      });
    } else if (correlation.positiveCorrelation < 30) {
      insights.push({
        type: 'danger',
        icon: IconAlertTriangle,
        title: 'Baja Correlación Positiva',
        description: `Solo ${correlation.positiveCorrelation.toFixed(0)}% de los estudiantes muestran correlación positiva. Revisar efectividad del tutor o contenido del curso.`,
        priority: 'high',
      });
    }

    // Insight 2: Estudiantes que necesitan atención
    if (aggregated.studentsNeedingAttention > 0) {
      const percentage = (aggregated.studentsNeedingAttention / aggregated.totalStudents) * 100;
      insights.push({
        type: percentage > 30 ? 'danger' : 'warning',
        icon: IconAlertTriangle,
        title: 'Estudiantes que Necesitan Atención',
        description: `${aggregated.studentsNeedingAttention} estudiantes (${percentage.toFixed(0)}%) requieren intervención. Revisar progreso y uso del tutor.`,
        priority: percentage > 30 ? 'high' : 'medium',
      });
    }

    // Insight 3: Uso del tutor
    if (correlation.averageTutorUsage < 2) {
      insights.push({
        type: 'warning',
        icon: IconTrendingUp,
        title: 'Bajo Uso del Tutor',
        description: `El promedio de interacciones con el tutor es ${correlation.averageTutorUsage.toFixed(1)}. Considerar fomentar más el uso del tutor entre los estudiantes.`,
        priority: 'medium',
      });
    } else if (correlation.averageTutorUsage > 15) {
      insights.push({
        type: 'info',
        icon: IconRobot,
        title: 'Alto Uso del Tutor',
        description: `Los estudiantes están usando activamente el tutor (promedio: ${correlation.averageTutorUsage.toFixed(1)} interacciones). Esto indica buen engagement.`,
        priority: 'low',
      });
    }

    // Insight 4: Eficiencia
    if (correlation.efficiencyScore > 5) {
      insights.push({
        type: 'success',
        icon: IconCheckCircle,
        title: 'Alta Eficiencia del Tutor',
        description: `El tutor está siendo muy eficiente (${correlation.efficiencyScore.toFixed(1)}% de progreso por interacción). Los estudiantes están obteniendo buenos resultados.`,
        priority: 'low',
      });
    } else if (correlation.efficiencyScore < 2) {
      insights.push({
        type: 'warning',
        icon: IconAlertTriangle,
        title: 'Baja Eficiencia del Tutor',
        description: `La eficiencia del tutor es baja (${correlation.efficiencyScore.toFixed(1)}% por interacción). Revisar calidad de respuestas o contenido del curso.`,
        priority: 'high',
      });
    }

    // Insight 5: Progreso promedio
    if (aggregated.averageProgress > 80) {
      insights.push({
        type: 'success',
        icon: IconCheckCircle,
        title: 'Excelente Progreso del Curso',
        description: `El progreso promedio del curso es ${aggregated.averageProgress.toFixed(0)}%. Los estudiantes están avanzando bien.`,
        priority: 'low',
      });
    } else if (aggregated.averageProgress < 50) {
      insights.push({
        type: 'danger',
        icon: IconAlertTriangle,
        title: 'Progreso Bajo del Curso',
        description: `El progreso promedio es solo ${aggregated.averageProgress.toFixed(0)}%. Considerar revisar el contenido o proporcionar más apoyo.`,
        priority: 'high',
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const insights = generateInsights();

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-green-200',
          bg: 'bg-green-50',
          iconColor: 'text-green-600',
          textColor: 'text-green-900',
          titleColor: 'text-green-800',
        };
      case 'warning':
        return {
          border: 'border-orange-200',
          bg: 'bg-orange-50',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-900',
          titleColor: 'text-orange-800',
        };
      case 'danger':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
          titleColor: 'text-red-800',
        };
      default:
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-900',
          titleColor: 'text-blue-800',
        };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {insights.map((insight, index) => {
        const styles = getTypeStyles(insight.type);
        const Icon = insight.icon;

        return (
          <div key={index} className={`p-4 rounded-lg border ${styles.border} ${styles.bg}`}>
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-sm font-semibold ${styles.titleColor}`}>{insight.title}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      insight.priority === 'high'
                        ? 'bg-red-200 text-red-800'
                        : insight.priority === 'medium'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-green-200 text-green-800'
                    }`}
                  >
                    {insight.priority === 'high'
                      ? 'Alta'
                      : insight.priority === 'medium'
                        ? 'Media'
                        : 'Baja'}
                  </span>
                </div>
                <p className={`text-sm ${styles.textColor}`}>{insight.description}</p>
              </div>
            </div>
          </div>
        );
      })}

      {insights.length === 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            No hay insights disponibles aún. Se generarán cuando haya más datos.
          </p>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
