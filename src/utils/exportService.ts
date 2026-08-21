// =====================================================
// Servicio Utilitario para Exportaciones (PDF y Excel)
// Centraliza la lógica de exportación para reutilización
// =====================================================

// Tipos para jsPDF (la librería no exporta tipos correctamente en algunas versiones)
type JSPDF = any;

// =====================================================
// Tipos e Interfaces
// =====================================================

export interface ExportTableData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

export interface ExportSummaryData {
  label: string;
  value: string | number;
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  summaries?: ExportSummaryData[];
  tables?: ExportTableData[];
  fileName: string;
  showDate?: boolean;
}

export interface ExcelExportOptions {
  sheets: {
    name: string;
    data: Record<string, any>[];
  }[];
  fileName: string;
}

// =====================================================
// Funciones de Utilidad
// =====================================================

/**
 * Formatea un valor numérico como moneda
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
};

/**
 * Formatea una fecha para mostrar
 */
export const formatDate = (date: Date | string, locale: string = 'es-ES'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
};

/**
 * Sanitiza un nombre de archivo removiendo caracteres inválidos
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
};

// =====================================================
// Exportación a PDF
// =====================================================

/**
 * Obtiene la clase jsPDF correctamente importada
 */
const getJsPDF = async (): Promise<JSPDF> => {
  try {
    const jsPDFModule = await import('jspdf');

    // jspdf puede exportarse de diferentes formas dependiendo de la versión
    if (jsPDFModule.jsPDF) {
      return jsPDFModule.jsPDF;
    } else if (jsPDFModule.default) {
      return (jsPDFModule.default as any).jsPDF || jsPDFModule.default;
    }

    return jsPDFModule as any;
  } catch (error) {
    console.error('Error cargando jsPDF:', error);
    throw error;
  }
};

/**
 * Obtiene el plugin autoTable correctamente importado
 */
const getAutoTable = async (): Promise<any> => {
  try {
    const autoTableModule = await import('jspdf-autotable');
    // jspdf-autotable suele estar en .default o directamente
    return autoTableModule.default || autoTableModule;
  } catch (error) {
    console.error('Error cargando jspdf-autotable:', error);
    throw error;
  }
};

/**
 * Exporta datos a PDF usando jsPDF y jspdf-autotable
 */
export const exportToPDF = async (options: PDFExportOptions): Promise<void> => {
  try {
    const JSPDF = await getJsPDF();
    const autoTable = await getAutoTable();

    const orientation = options.orientation === 'landscape' ? 'l' : 'p';
    const doc = new JSPDF(orientation, 'mm', 'a4');

    let currentY = 15;

    // Título principal
    doc.setFontSize(18);
    doc.text(options.title, 14, currentY);
    currentY += 8;

    // Subtítulo (si existe)
    if (options.subtitle) {
      doc.setFontSize(12);
      doc.text(options.subtitle, 14, currentY);
      currentY += 6;
    }

    // Fecha (si se solicita)
    if (options.showDate !== false) {
      doc.setFontSize(10);
      doc.text(`Fecha: ${formatDate(new Date())}`, 14, currentY);
      currentY += 6;
    }

    // Resúmenes (si existen)
    if (options.summaries && options.summaries.length > 0) {
      currentY += 5;
      doc.setFontSize(14);
      doc.text('Resumen', 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      options.summaries.forEach((summary) => {
        const value =
          typeof summary.value === 'number' ? summary.value.toLocaleString('es-ES') : summary.value;
        doc.text(`${summary.label}: ${value}`, 14, currentY);
        currentY += 6;
      });
    }

    // Tablas (si existen)
    if (options.tables && options.tables.length > 0) {
      options.tables.forEach((table, index) => {
        // Agregar nueva página si no es la primera tabla
        if (index > 0) {
          doc.addPage();
          currentY = 20;
        }

        // Título de la tabla (si existe)
        if (table.title) {
          doc.setFontSize(14);
          doc.text(table.title, 14, currentY);
          currentY += 8;
        }

        // Agregar la tabla usando autoTable
        (doc as any).autoTable({
          head: [table.headers],
          body: table.rows,
          startY: currentY,
          styles: {
            fontSize: options.orientation === 'landscape' ? 8 : 9,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          margin: { top: currentY },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });
    }

    // Guardar el PDF
    const fileName = `${sanitizeFileName(options.fileName)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error exportando a PDF:', error);
    throw new Error(
      'Error al exportar a PDF. Asegúrate de que las librerías jspdf y jspdf-autotable estén instaladas.'
    );
  }
};

// =====================================================
// Exportación a Excel
// =====================================================

/**
 * Exporta datos a Excel usando xlsx
 */
export const exportToExcel = async (options: ExcelExportOptions): Promise<void> => {
  try {
    // Importación dinámica con fallback para diferentes formatos de módulo
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default || xlsxModule;

    if (!XLSX || !XLSX.utils) {
      console.error('Estructura de módulo XLSX no reconocida:', xlsxModule);
      throw new Error('No se pudo cargar la librería Excel correctamente.');
    }

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Agregar cada hoja
    options.sheets.forEach((sheet) => {
      const ws = XLSX.utils.json_to_sheet(sheet.data);

      // Ajustar ancho de columnas (opcional, mejora la experiencia)
      const maxWidth = 50;
      const colWidths =
        sheet.data.length > 0
          ? Object.keys(sheet.data[0]).map((key) => {
              const maxLength = Math.max(
                key.length,
                ...sheet.data.map((row: any) => String(row[key] || '').length)
              );
              return { wch: Math.min(maxLength + 2, maxWidth) };
            })
          : [];

      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });

    // Guardar el archivo Excel
    const fileName = `${sanitizeFileName(options.fileName)}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    throw new Error('Error al exportar a Excel. Asegúrate de que la librería xlsx esté instalada.');
  }
};

/**
 * Convierte datos de resumen en formato para Excel
 */
export const createSummarySheet = (summaries: ExportSummaryData[]): Record<string, any>[] => {
  return summaries.map((summary) => ({
    Métrica: summary.label,
    Valor:
      typeof summary.value === 'number' ? summary.value.toLocaleString('es-ES') : summary.value,
  }));
};

/**
 * Convierte datos de tabla en formato para Excel
 */
export const createTableSheet = (
  headers: string[],
  rows: (string | number)[][]
): Record<string, any>[] => {
  return rows.map((row) => {
    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index] ?? '';
    });
    return rowObj;
  });
};
