// components/ExportReportButton.tsx
// Componente para exportar reportes a Excel y PDF

import React from 'react';
import Button from '@/components/Common/Button';
import { IconDownload, IconFileText } from '@/components/Common/Icons';
import type {
  CourseComprehensiveReport,
  ComprehensiveStudentData,
} from '@/services/comprehensiveReportService';
import { exportToExcel, exportToPDF, createTableSheet } from '@/utils/exportService';

interface ExportReportButtonProps {
  report: CourseComprehensiveReport;
  courseTitle: string;
  showCosts?: boolean; // Si false, no incluye tokens/costos en la exportación
  className?: string;
}

/**
 * Componente que permite exportar un reporte a Excel o PDF
 *
 * NOTA: Requiere instalar las siguientes dependencias:
 * npm install xlsx jspdf jspdf-autotable
 */
const ExportReportButton: React.FC<ExportReportButtonProps> = ({
  report,
  courseTitle,
  showCosts = true,
  className = '',
}) => {
  const handleExportToExcel = async () => {
    try {
      const studentsData = report.students.map((student, index) => ({
        '#': index + 1,
        Estudiante: student.studentName,
        Email: student.studentEmail || '',
        'Progreso (%)': Math.round(student.academicProgress.completionPercentage),
        'Unidades Completadas': `${student.academicProgress.completedUnits}/${student.academicProgress.totalUnits}`,
        'Sesiones Completadas': `${student.academicProgress.completedSessions}/${student.academicProgress.totalSessions}`,
        'Quizzes Completados': `${student.academicProgress.completedQuizzes}/${student.academicProgress.totalQuizzes}`,
        'Tiempo Invertido (min)': student.academicProgress.timeSpentMinutes,
        'Interacciones Tutor': student.tutorMetrics.totalInteractions,
        ...(showCosts
          ? {
              'Tokens Usados': student.tutorMetrics.totalTokens,
              'Costo Total': student.tutorMetrics.totalCost,
            }
          : {}),
        'Última Interacción': student.tutorMetrics.lastInteractionDate
          ? new Date(student.tutorMetrics.lastInteractionDate).toLocaleDateString('es-ES')
          : 'Nunca',
        Correlación: getCorrelationLabel(student.insights.tutorUsageVsProgress),
        'Eficiencia (%)': student.insights.efficiency.toFixed(1),
        'Nivel de Riesgo':
          student.insights.riskLevel === 'high'
            ? 'Alto'
            : student.insights.riskLevel === 'medium'
              ? 'Medio'
              : 'Bajo',
      }));

      const summaryData = [
        { Métrica: 'Total Estudiantes', Valor: report.aggregated.totalStudents },
        { Métrica: 'Progreso Promedio (%)', Valor: report.aggregated.averageProgress.toFixed(1) },
        {
          Métrica: 'Interacciones Promedio Tutor',
          Valor: report.aggregated.averageTutorInteractions.toFixed(1),
        },
        {
          Métrica: 'Correlación Positiva (%)',
          Valor: report.correlation.positiveCorrelation.toFixed(1),
        },
        {
          Métrica: 'Estudiantes Necesitan Atención',
          Valor: report.aggregated.studentsNeedingAttention,
        },
        {
          Métrica: 'Eficiencia Promedio (%)',
          Valor: report.correlation.efficiencyScore.toFixed(1),
        },
        ...(showCosts
          ? [
              { Métrica: 'Costo Total Tutor', Valor: report.aggregated.totalCost.toFixed(4) },
              { Métrica: 'Tokens Totales', Valor: report.aggregated.totalTokens },
            ]
          : []),
      ];

      await exportToExcel({
        sheets: [
          { name: 'Estudiantes', data: studentsData },
          { name: 'Resumen', data: summaryData },
        ],
        fileName: `Reporte_${courseTitle.replace(/[^a-z0-9]/gi, '_')}`,
      });
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      alert('Error al exportar a Excel. Por favor, intenta de nuevo.');
    }
  };

  const handleExportToPDF = async () => {
    try {
      const headers = [
        '#',
        'Estudiante',
        'Progreso',
        'Unidades',
        'Sesiones',
        'Interacciones',
        ...(showCosts ? ['Tokens', 'Costo'] : []),
        'Correlación',
        'Riesgo',
      ];

      const tableData = report.students.map((student, index) => [
        index + 1,
        student.studentName,
        `${Math.round(student.academicProgress.completionPercentage)}%`,
        `${student.academicProgress.completedUnits}/${student.academicProgress.totalUnits}`,
        `${student.academicProgress.completedSessions}/${student.academicProgress.totalSessions}`,
        student.tutorMetrics.totalInteractions,
        ...(showCosts
          ? [
              student.tutorMetrics.totalTokens.toLocaleString(),
              `$${student.tutorMetrics.totalCost.toFixed(4)}`,
            ]
          : []),
        getCorrelationLabel(student.insights.tutorUsageVsProgress),
        student.insights.riskLevel === 'high'
          ? 'Alto'
          : student.insights.riskLevel === 'medium'
            ? 'Medio'
            : 'Bajo',
      ]);

      const summaries = [
        { label: 'Total Estudiantes', value: report.aggregated.totalStudents },
        { label: 'Progreso Promedio', value: `${report.aggregated.averageProgress.toFixed(1)}%` },
        {
          label: 'Interacciones Promedio',
          value: report.aggregated.averageTutorInteractions.toFixed(1),
        },
        {
          label: 'Correlación Positiva',
          value: `${report.correlation.positiveCorrelation.toFixed(1)}%`,
        },
        {
          label: 'Estudiantes Necesitan Atención',
          value: report.aggregated.studentsNeedingAttention,
        },
      ];

      if (showCosts) {
        summaries.push(
          { label: 'Costo Total', value: `$${report.aggregated.totalCost.toFixed(4)}` },
          { label: 'Tokens Totales', value: report.aggregated.totalTokens.toLocaleString() }
        );
      }

      await exportToPDF({
        title: 'Informe Comprehensivo del Curso',
        subtitle: courseTitle,
        orientation: 'landscape',
        summaries,
        tables: [
          {
            headers,
            rows: tableData,
          },
        ],
        fileName: `Reporte_${courseTitle.replace(/[^a-z0-9]/gi, '_')}`,
      });
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      alert('Error al exportar a PDF. Por favor, intenta de nuevo.');
    }
  };

  const getCorrelationLabel = (type: string) => {
    const labels: Record<string, string> = {
      'high-usage-high-progress': '✅ Positiva',
      'high-usage-low-progress': '❌ Negativa',
      'low-usage-high-progress': '⚠️ Sin Tutor',
      'low-usage-low-progress': '🔴 Bajo',
    };
    return labels[type] || type;
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={handleExportToExcel}
        variant="secondary"
        leftIcon={<IconDownload className="w-4 h-4" />}
        size="sm"
      >
        Exportar Excel
      </Button>
      <Button
        onClick={handleExportToPDF}
        variant="secondary"
        leftIcon={<IconFileText className="w-4 h-4" />}
        size="sm"
      >
        Exportar PDF
      </Button>
    </div>
  );
};

export default ExportReportButton;
