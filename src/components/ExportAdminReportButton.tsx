// components/ExportAdminReportButton.tsx
// Componente para exportar reportes administrativos globales a Excel y PDF

import React from 'react';
import Button from './Button';
import { IconDownload, IconFileText } from './Icons';
import type { InstitutionReport, GlobalMetrics } from '../services/adminReportsService';

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
  className = ''
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

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
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen Global
    if (globalMetrics) {
      const globalSummaryData = [
        { 'Métrica': 'Total Instituciones', 'Valor': globalMetrics.totalInstitutions },
        { 'Métrica': 'Total Cursos', 'Valor': globalMetrics.totalCourses },
        { 'Métrica': 'Total Estudiantes', 'Valor': globalMetrics.totalStudents },
        { 'Métrica': 'Progreso Promedio (%)', 'Valor': globalMetrics.averageProgress.toFixed(1) },
        { 'Métrica': 'Interacciones Totales Tutor', 'Valor': globalMetrics.totalTutorInteractions },
        { 'Métrica': 'Tokens Totales', 'Valor': globalMetrics.totalTokens },
        { 'Métrica': 'Costo Tutor IA', 'Valor': globalMetrics.totalCost },
        { 'Métrica': 'Costo Procesamiento', 'Valor': globalMetrics.processingCost || 0 },
        { 'Métrica': 'Costo Uso de IA', 'Valor': globalMetrics.aiUsageCost || 0 },
        { 'Métrica': 'Costo Total Combinado', 'Valor': globalMetrics.totalAllCosts || 0 },
      ];
      const wsGlobal = XLSX.utils.json_to_sheet(globalSummaryData);
      XLSX.utils.book_append_sheet(wb, wsGlobal, 'Resumen Global');
    }

    // Hoja 2: Instituciones
    const institutionsData = institutions.map((inst, index) => ({
      '#': index + 1,
      'Institución': inst.institutionName,
      'Cursos': inst.totalCourses,
      'Estudiantes': inst.totalStudents,
      'Profesores': inst.totalTeachers,
      'Progreso Promedio (%)': inst.averageProgress.toFixed(1),
      'Interacciones Tutor': inst.totalTutorInteractions,
      'Tokens': inst.totalTokens,
      'Costo Tutor': inst.totalCost,
      'Costo Procesamiento': inst.processingCost || 0,
      'Costo IA': inst.aiUsageCost || 0,
      'Costo Total': inst.totalAllCosts || inst.totalCost || 0
    }));
    const wsInstitutions = XLSX.utils.json_to_sheet(institutionsData);
    XLSX.utils.book_append_sheet(wb, wsInstitutions, 'Instituciones');

    // Hoja 3: Cursos por Institución
    const coursesData: any[] = [];
    institutions.forEach((inst) => {
      inst.courses.forEach((course) => {
        coursesData.push({
          'Institución': inst.institutionName,
          'Curso': course.courseTitle,
          'Estudiantes': course.totalStudents,
          'Progreso Promedio (%)': course.averageProgress.toFixed(1),
          'Interacciones Tutor': course.totalTutorInteractions,
          'Tokens': course.totalTokens,
          'Costo': course.totalCost
        });
      });
    });
    if (coursesData.length > 0) {
      const wsCourses = XLSX.utils.json_to_sheet(coursesData);
      XLSX.utils.book_append_sheet(wb, wsCourses, 'Cursos');
    }

    // Descargar
    const dateRange = dateFrom || dateTo 
      ? `_${dateFrom || 'inicio'}_${dateTo || 'fin'}`
      : '';
    const fileName = `Reporte_Global_Admin${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = async () => {
    try {
      const jsPDF = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const autoTablePlugin = autoTable.default || autoTable;
      await exportPDF(jsPDF, autoTablePlugin);
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      alert('Error al exportar a PDF. Asegúrate de que las librerías jspdf y jspdf-autotable estén instaladas: npm install jspdf jspdf-autotable');
    }
  };

  const exportPDF = async (jsPDF: any, autoTable: any) => {
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
    doc.text('Reporte Comprehensivo Global - Administración', 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 22);
    if (dateFrom || dateTo) {
      doc.text(`Período: ${dateFrom || 'Inicio'} - ${dateTo || 'Fin'}`, 14, 28);
    }

    let currentY = 35;

    // Resumen Global
    if (globalMetrics) {
      doc.setFontSize(14);
      doc.text('Resumen Global', 14, currentY);
      doc.setFontSize(10);
      currentY += 8;

      const globalData = [
        ['Métrica', 'Valor'],
        ['Total Instituciones', globalMetrics.totalInstitutions.toString()],
        ['Total Cursos', globalMetrics.totalCourses.toString()],
        ['Total Estudiantes', globalMetrics.totalStudents.toString()],
        ['Progreso Promedio', `${globalMetrics.averageProgress.toFixed(1)}%`],
        ['Interacciones Totales', globalMetrics.totalTutorInteractions.toLocaleString()],
        ['Tokens Totales', globalMetrics.totalTokens.toLocaleString()],
        ['Costo Tutor IA', formatCurrency(globalMetrics.totalCost)],
        ['Costo Procesamiento', formatCurrency(globalMetrics.processingCost || 0)],
        ['Costo Uso de IA', formatCurrency(globalMetrics.aiUsageCost || 0)],
        ['Costo Total Combinado', formatCurrency(globalMetrics.totalAllCosts || 0)]
      ];

      (doc as any).autoTable({
        head: [globalData[0]],
        body: globalData.slice(1),
        startY: currentY,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tabla de Instituciones
    doc.setFontSize(14);
    doc.text('Instituciones', 14, currentY);
    doc.setFontSize(10);
    currentY += 8;

    const institutionsData = institutions.map((inst) => [
      inst.institutionName,
      inst.totalCourses.toString(),
      inst.totalStudents.toString(),
      inst.totalTeachers.toString(),
      `${inst.averageProgress.toFixed(1)}%`,
      inst.totalTutorInteractions.toLocaleString(),
      inst.totalTokens.toLocaleString(),
      formatCurrency(inst.totalCost),
      formatCurrency(inst.processingCost || 0),
      formatCurrency(inst.aiUsageCost || 0),
      formatCurrency(inst.totalAllCosts || inst.totalCost || 0)
    ]);

    (doc as any).autoTable({
      head: [['Institución', 'Cursos', 'Estudiantes', 'Profesores', 'Progreso', 'Interacciones', 'Tokens', 'Costo Tutor', 'Costo Proc', 'Costo IA', 'Total']],
      body: institutionsData,
      startY: currentY,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { top: currentY }
    });

    // Si hay más datos, agregar página para cursos
    if (institutions.some(inst => inst.courses.length > 0)) {
      doc.addPage();
      currentY = 20;
      
      doc.setFontSize(14);
      doc.text('Cursos por Institución', 14, currentY);
      doc.setFontSize(10);
      currentY += 8;

      const coursesData: any[] = [];
      institutions.forEach((inst) => {
        inst.courses.forEach((course) => {
          coursesData.push([
            inst.institutionName,
            course.courseTitle,
            course.totalStudents.toString(),
            `${course.averageProgress.toFixed(1)}%`,
            course.totalTutorInteractions.toLocaleString(),
            course.totalTokens.toLocaleString(),
            formatCurrency(course.totalCost)
          ]);
        });
      });

      (doc as any).autoTable({
        head: [['Institución', 'Curso', 'Estudiantes', 'Progreso', 'Interacciones', 'Tokens', 'Costo']],
        body: coursesData,
        startY: currentY,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    }

    // Descargar
    const dateRange = dateFrom || dateTo 
      ? `_${dateFrom || 'inicio'}_${dateTo || 'fin'}`
      : '';
    const fileName = `Reporte_Global_Admin${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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

export default ExportAdminReportButton;

