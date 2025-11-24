// components/ExportReportButton.tsx
// Componente para exportar reportes a Excel y PDF

import React from 'react';
import Button from './Button';
import { IconDownload, IconFileText } from './Icons';
import type { CourseComprehensiveReport, ComprehensiveStudentData } from '../services/comprehensiveReportService';

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
  className = ''
}) => {
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      await exportExcel(XLSX);
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      alert('Error al exportar a Excel. Asegúrate de que la librería xlsx esté instalada: npm install xlsx');
    }
  };

  const exportExcel = async (XLSX: any) => {
    // Crear datos para Excel
    const studentsData = report.students.map((student, index) => ({
      '#': index + 1,
      'Estudiante': student.studentName,
      'Email': student.studentEmail || '',
      'Progreso (%)': Math.round(student.academicProgress.completionPercentage),
      'Unidades Completadas': `${student.academicProgress.completedUnits}/${student.academicProgress.totalUnits}`,
      'Sesiones Completadas': `${student.academicProgress.completedSessions}/${student.academicProgress.totalSessions}`,
      'Quizzes Completados': `${student.academicProgress.completedQuizzes}/${student.academicProgress.totalQuizzes}`,
      'Tiempo Invertido (min)': student.academicProgress.timeSpentMinutes,
      'Interacciones Tutor': student.tutorMetrics.totalInteractions,
      ...(showCosts ? {
        'Tokens Usados': student.tutorMetrics.totalTokens,
        'Costo Total': student.tutorMetrics.totalCost
      } : {}),
      'Última Interacción': student.tutorMetrics.lastInteractionDate 
        ? new Date(student.tutorMetrics.lastInteractionDate).toLocaleDateString('es-ES')
        : 'Nunca',
      'Correlación': getCorrelationLabel(student.insights.tutorUsageVsProgress),
      'Eficiencia (%)': student.insights.efficiency.toFixed(1),
      'Nivel de Riesgo': student.insights.riskLevel === 'high' ? 'Alto' : student.insights.riskLevel === 'medium' ? 'Medio' : 'Bajo'
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Hoja de estudiantes
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Estudiantes');

    // Hoja de resumen
    const summaryData = [
      { 'Métrica': 'Total Estudiantes', 'Valor': report.aggregated.totalStudents },
      { 'Métrica': 'Progreso Promedio (%)', 'Valor': report.aggregated.averageProgress.toFixed(1) },
      { 'Métrica': 'Interacciones Promedio Tutor', 'Valor': report.aggregated.averageTutorInteractions.toFixed(1) },
      { 'Métrica': 'Correlación Positiva (%)', 'Valor': report.correlation.positiveCorrelation.toFixed(1) },
      { 'Métrica': 'Estudiantes Necesitan Atención', 'Valor': report.aggregated.studentsNeedingAttention },
      { 'Métrica': 'Eficiencia Promedio (%)', 'Valor': report.correlation.efficiencyScore.toFixed(1) },
      ...(showCosts ? [
        { 'Métrica': 'Costo Total Tutor', 'Valor': report.aggregated.totalCost.toFixed(4) },
        { 'Métrica': 'Tokens Totales', 'Valor': report.aggregated.totalTokens }
      ] : [])
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Descargar
    const fileName = `Reporte_${courseTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = async () => {
    try {
      const jsPDF = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      // jspdf-autotable puede exportarse de diferentes formas
      const autoTablePlugin = autoTable.default || autoTable;
      await exportPDF(jsPDF, autoTablePlugin);
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      alert('Error al exportar a PDF. Asegúrate de que las librerías jspdf y jspdf-autotable estén instaladas: npm install jspdf jspdf-autotable');
    }
  };

  const exportPDF = async (jsPDF: any, autoTable: any) => {
    // jspdf puede exportarse como default o named export
    // Intentar diferentes formas de importación
    let JSPDF: any;
    if (jsPDF.default) {
      JSPDF = jsPDF.default.jsPDF || jsPDF.default;
    } else if (jsPDF.jsPDF) {
      JSPDF = jsPDF.jsPDF;
    } else {
      JSPDF = jsPDF;
    }
    
    const doc = new JSPDF('l', 'mm', 'a4'); // Landscape
    
    // Título
    doc.setFontSize(18);
    doc.text('Informe Comprehensivo del Curso', 14, 15);
    doc.setFontSize(12);
    doc.text(courseTitle, 14, 22);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);

    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen General', 14, 38);
    doc.setFontSize(10);
    
    const summaryY = 45;
    let currentY = summaryY;
    doc.text(`Total Estudiantes: ${report.aggregated.totalStudents}`, 14, currentY);
    currentY += 6;
    doc.text(`Progreso Promedio: ${report.aggregated.averageProgress.toFixed(1)}%`, 14, currentY);
    currentY += 6;
    doc.text(`Interacciones Promedio: ${report.aggregated.averageTutorInteractions.toFixed(1)}`, 14, currentY);
    currentY += 6;
    doc.text(`Correlación Positiva: ${report.correlation.positiveCorrelation.toFixed(1)}%`, 14, currentY);
    currentY += 6;
    doc.text(`Estudiantes Necesitan Atención: ${report.aggregated.studentsNeedingAttention}`, 14, currentY);
    if (showCosts) {
      currentY += 6;
      doc.text(`Costo Total: $${report.aggregated.totalCost.toFixed(4)}`, 14, currentY);
      currentY += 6;
      doc.text(`Tokens Totales: ${report.aggregated.totalTokens.toLocaleString()}`, 14, currentY);
    }

    // Tabla de estudiantes
    const tableStartY = currentY + 10;
    const tableData = report.students.map((student, index) => [
      index + 1,
      student.studentName,
      `${Math.round(student.academicProgress.completionPercentage)}%`,
      `${student.academicProgress.completedUnits}/${student.academicProgress.totalUnits}`,
      `${student.academicProgress.completedSessions}/${student.academicProgress.totalSessions}`,
      student.tutorMetrics.totalInteractions,
      ...(showCosts ? [
        student.tutorMetrics.totalTokens.toLocaleString(),
        `$${student.tutorMetrics.totalCost.toFixed(4)}`
      ] : []),
      getCorrelationLabel(student.insights.tutorUsageVsProgress),
      student.insights.riskLevel === 'high' ? 'Alto' : student.insights.riskLevel === 'medium' ? 'Medio' : 'Bajo'
    ]);

    const headers = [
      '#',
      'Estudiante',
      'Progreso',
      'Unidades',
      'Sesiones',
      'Interacciones',
      ...(showCosts ? ['Tokens', 'Costo'] : []),
      'Correlación',
      'Riesgo'
    ];

    // jspdf-autotable se registra como plugin, se usa directamente en el doc
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: tableStartY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { top: tableStartY }
    });

    // Descargar
    const fileName = `Reporte_${courseTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const getCorrelationLabel = (type: string) => {
    const labels: Record<string, string> = {
      'high-usage-high-progress': '✅ Positiva',
      'high-usage-low-progress': '❌ Negativa',
      'low-usage-high-progress': '⚠️ Sin Tutor',
      'low-usage-low-progress': '🔴 Bajo'
    };
    return labels[type] || type;
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={exportToExcel}
        variant="secondary"
        leftIcon={<IconDownload className="w-4 h-4" />}
        size="sm"
      >
        Exportar Excel
      </Button>
      <Button
        onClick={exportToPDF}
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

