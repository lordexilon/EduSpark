// components/ExportAdminReportButton.tsx
// Componente para exportar reportes administrativos globales a Excel y PDF

import React from 'react';
import Button from '@/components/Common/Button';
import { IconDownload, IconFileText } from '@/components/Common/Icons';
import type { InstitutionReport, GlobalMetrics } from '@/services/adminReportsService';
import { exportToExcel, exportToPDF } from '@/utils/exportService';

interface ExportAdminReportButtonProps {
  institutions: InstitutionReport[];
  globalMetrics: GlobalMetrics | null;
  dateFrom?: string;
  dateTo?: string;
  className?: string;
}

/**
 * Componente que permite exportar reportes administrativos globales a Excel o PDF
 */
const ExportAdminReportButton: React.FC<ExportAdminReportButtonProps> = ({
  institutions,
  globalMetrics,
  dateFrom,
  dateTo,
  className = '',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const handleExportToExcel = async () => {
    try {
      const sheets: any[] = [];

      // Hoja 1: Resumen Global
      if (globalMetrics) {
        const globalSummaryData = [
          { Métrica: 'Total Instituciones', Valor: globalMetrics.totalInstitutions },
          { Métrica: 'Total Cursos', Valor: globalMetrics.totalCourses },
          { Métrica: 'Total Estudiantes', Valor: globalMetrics.totalStudents },
          { Métrica: 'Progreso Promedio (%)', Valor: globalMetrics.averageProgress.toFixed(1) },
          { Métrica: 'Interacciones Totales Tutor', Valor: globalMetrics.totalTutorInteractions },
          { Métrica: 'Tokens Totales', Valor: globalMetrics.totalTokens },
          { Métrica: 'Costo Tutor IA', Valor: globalMetrics.totalCost },
          { Métrica: 'Costo Procesamiento', Valor: globalMetrics.processingCost || 0 },
          { Métrica: 'Costo Uso de IA', Valor: globalMetrics.aiUsageCost || 0 },
          { Métrica: 'Costo Total Combinado', Valor: globalMetrics.totalAllCosts || 0 },
        ];
        sheets.push({ name: 'Resumen Global', data: globalSummaryData });
      }

      // Hoja 2: Instituciones
      const institutionsData = institutions.map((inst, index) => ({
        '#': index + 1,
        Institución: inst.institutionName,
        Cursos: inst.totalCourses,
        Estudiantes: inst.totalStudents,
        Profesores: inst.totalTeachers,
        'Progreso Promedio (%)': inst.averageProgress.toFixed(1),
        'Interacciones Tutor': inst.totalTutorInteractions,
        Tokens: inst.totalTokens,
        'Costo Tutor': inst.totalCost,
        'Costo Procesamiento': inst.processingCost || 0,
        'Costo IA': inst.aiUsageCost || 0,
        'Costo Total': inst.totalAllCosts || inst.totalCost || 0,
      }));
      sheets.push({ name: 'Instituciones', data: institutionsData });

      // Hoja 3: Cursos por Institución
      const coursesData: any[] = [];
      institutions.forEach((inst) => {
        inst.courses.forEach((course) => {
          coursesData.push({
            Institución: inst.institutionName,
            Curso: course.courseTitle,
            Estudiantes: course.totalStudents,
            'Progreso Promedio (%)': course.averageProgress.toFixed(1),
            'Interacciones Tutor': course.totalTutorInteractions,
            Tokens: course.totalTokens,
            Costo: course.totalCost,
          });
        });
      });
      if (coursesData.length > 0) {
        sheets.push({ name: 'Cursos', data: coursesData });
      }

      const dateRange = dateFrom || dateTo ? `_${dateFrom || 'inicio'}_${dateTo || 'fin'}` : '';

      await exportToExcel({
        sheets,
        fileName: `Reporte_Global_Admin${dateRange}`,
      });
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      alert('Error al exportar a Excel. Por favor, intenta de nuevo.');
    }
  };

  const handleExportToPDF = async () => {
    try {
      const summaries = globalMetrics
        ? [
            { label: 'Total Instituciones', value: globalMetrics.totalInstitutions },
            { label: 'Total Cursos', value: globalMetrics.totalCourses },
            { label: 'Total Estudiantes', value: globalMetrics.totalStudents },
            { label: 'Progreso Promedio', value: `${globalMetrics.averageProgress.toFixed(1)}%` },
            {
              label: 'Interacciones Totales',
              value: globalMetrics.totalTutorInteractions.toLocaleString(),
            },
            { label: 'Tokens Totales', value: globalMetrics.totalTokens.toLocaleString() },
            {
              label: 'Costo Total Combinado',
              value: formatCurrency(globalMetrics.totalAllCosts || 0),
            },
          ]
        : [];

      const institutionsTable = {
        title: 'Instituciones',
        headers: [
          'Institución',
          'Cursos',
          'Estudiantes',
          'Profesores',
          'Progreso',
          'Interacciones',
          'Tokens',
          'Total',
        ],
        rows: institutions.map((inst) => [
          inst.institutionName,
          inst.totalCourses.toString(),
          inst.totalStudents.toString(),
          inst.totalTeachers.toString(),
          `${inst.averageProgress.toFixed(1)}%`,
          inst.totalTutorInteractions.toLocaleString(),
          inst.totalTokens.toLocaleString(),
          formatCurrency(inst.totalAllCosts || inst.totalCost || 0),
        ]),
      };

      const coursesTable = {
        title: 'Cursos por Institución',
        headers: [
          'Institución',
          'Curso',
          'Estudiantes',
          'Progreso',
          'Interacciones',
          'Tokens',
          'Costo',
        ],
        rows: institutions.flatMap((inst) =>
          inst.courses.map((course) => [
            inst.institutionName,
            course.courseTitle,
            course.totalStudents.toString(),
            `${course.averageProgress.toFixed(1)}%`,
            course.totalTutorInteractions.toLocaleString(),
            course.totalTokens.toLocaleString(),
            formatCurrency(course.totalCost),
          ])
        ),
      };

      const dateRange = dateFrom || dateTo ? `_${dateFrom || 'inicio'}_${dateTo || 'fin'}` : '';

      await exportToPDF({
        title: 'Reporte Comprehensivo Global - Administración',
        subtitle:
          dateFrom || dateTo ? `Período: ${dateFrom || 'Inicio'} - ${dateTo || 'Fin'}` : undefined,
        orientation: 'landscape',
        summaries,
        tables: [institutionsTable, coursesTable],
        fileName: `Reporte_Global_Admin${dateRange}`,
      });
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      alert('Error al exportar a PDF. Por favor, intenta de nuevo.');
    }
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

export default ExportAdminReportButton;
