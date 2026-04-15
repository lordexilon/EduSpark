# 📊 Servicio de Exportación (PDF y Excel)

Servicio utilitario centralizado para exportar datos a PDF y Excel en el sistema EduSpark.

## 📦 Dependencias

Este servicio requiere las siguientes dependencias (ya instaladas en el proyecto):

```bash
npm install jspdf jspdf-autotable xlsx
npm install --save-dev @types/jspdf  # Tipos TypeScript
```

## 🚀 Uso Básico

### Exportación a PDF

```typescript
import { exportToPDF, formatCurrency } from '@/utils/exportService';

await exportToPDF({
  title: 'Reporte de Curso',
  subtitle: 'Curso de Matemáticas',
  orientation: 'landscape', // 'portrait' | 'landscape'
  showDate: true,
  summaries: [
    { label: 'Total Estudiantes', value: 25 },
    { label: 'Progreso Promedio', value: '75%' },
    { label: 'Costo Total', value: formatCurrency(1234.56) }
  ],
  tables: [
    {
      title: 'Estudiantes',
      headers: ['#', 'Nombre', 'Progreso', 'Nota'],
      rows: [
        [1, 'Juan Pérez', '80%', 8.5],
        [2, 'María García', '90%', 9.0]
      ]
    }
  ],
  fileName: 'Reporte_Curso_Matematicas'
});
```

### Exportación a Excel

```typescript
import { exportToExcel, createSummarySheet, createTableSheet } from '@/utils/exportService';

await exportToExcel({
  sheets: [
    {
      name: 'Resumen',
      data: createSummarySheet([
        { label: 'Total Estudiantes', value: 25 },
        { label: 'Progreso Promedio', value: 75 }
      ])
    },
    {
      name: 'Estudiantes',
      data: [
        { '#': 1, 'Nombre': 'Juan Pérez', 'Progreso': '80%', 'Nota': 8.5 },
        { '#': 2, 'Nombre': 'María García', 'Progreso': '90%', 'Nota': 9.0 }
      ]
    }
  ],
  fileName: 'Reporte_Curso_Matematicas'
});
```

## 📝 Funciones Disponibles

### `exportToPDF(options: PDFExportOptions)`

Exporta datos a un archivo PDF usando jsPDF y jspdf-autotable.

**Opciones:**
- `title` (string, requerido): Título principal del documento
- `subtitle` (string, opcional): Subtítulo
- `orientation` ('portrait' | 'landscape', opcional): Orientación de la página
- `summaries` (ExportSummaryData[], opcional): Array de resúmenes a mostrar
- `tables` (ExportTableData[], opcional): Array de tablas a incluir
- `fileName` (string, requerido): Nombre del archivo (sin extensión)
- `showDate` (boolean, opcional): Si mostrar la fecha (default: true)

### `exportToExcel(options: ExcelExportOptions)`

Exporta datos a un archivo Excel usando xlsx.

**Opciones:**
- `sheets` (Array, requerido): Array de hojas a incluir
  - `name` (string): Nombre de la hoja
  - `data` (Record<string, any>[]): Datos en formato de objetos
- `fileName` (string, requerido): Nombre del archivo (sin extensión)

### Funciones de Utilidad

#### `formatCurrency(amount: number, currency?: string): string`

Formatea un número como moneda. Default: USD.

```typescript
formatCurrency(1234.56); // "$1,234.56"
formatCurrency(1234.56, 'EUR'); // "€1.234,56"
```

#### `formatDate(date: Date | string, locale?: string): string`

Formatea una fecha para mostrar.

```typescript
formatDate(new Date()); // "15/1/2025"
formatDate('2025-01-15', 'en-US'); // "1/15/2025"
```

#### `sanitizeFileName(fileName: string): string`

Sanitiza un nombre de archivo removiendo caracteres inválidos.

```typescript
sanitizeFileName('Reporte Curso 2025'); // "Reporte_Curso_2025"
```

#### `createSummarySheet(summaries: ExportSummaryData[]): Record<string, any>[]`

Convierte datos de resumen en formato para Excel.

#### `createTableSheet(headers: string[], rows: (string | number)[][]): Record<string, any>[]`

Convierte datos de tabla en formato para Excel.

## 📋 Tipos e Interfaces

```typescript
interface ExportTableData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

interface ExportSummaryData {
  label: string;
  value: string | number;
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  summaries?: ExportSummaryData[];
  tables?: ExportTableData[];
  fileName: string;
  showDate?: boolean;
}

interface ExcelExportOptions {
  sheets: {
    name: string;
    data: Record<string, any>[];
  }[];
  fileName: string;
}
```

## 🔄 Migración desde Componentes Existentes

Los componentes `ExportReportButton` y `ExportAdminReportButton` ya están implementados y funcionando. Este servicio utilitario está disponible para:

1. **Nuevas funcionalidades de exportación**: Usa este servicio directamente
2. **Refactorización futura**: Los componentes existentes pueden migrar a usar este servicio
3. **Casos de uso personalizados**: Para exportaciones fuera de los componentes estándar

## ⚠️ Notas Importantes

- Los archivos se descargan automáticamente en el navegador del usuario
- Los nombres de archivo se sanitizan automáticamente
- Las fechas se agregan automáticamente al nombre del archivo
- Las tablas en PDF se ajustan automáticamente al ancho de página
- Las columnas en Excel se ajustan automáticamente al contenido

## 📚 Ejemplos de Uso en Componentes

### En un Componente React

```typescript
import React from 'react';
import Button from '@/components/Common/Button';
import { exportToPDF, exportToExcel } from '@/utils/exportService';

const MyExportComponent: React.FC = () => {
  const handleExportPDF = async () => {
    try {
      await exportToPDF({
        title: 'Mi Reporte',
        tables: [/* ... */],
        fileName: 'mi_reporte'
      });
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel({
        sheets: [/* ... */],
        fileName: 'mi_reporte'
      });
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el Excel');
    }
  };

  return (
    <div>
      <Button onClick={handleExportPDF}>Exportar PDF</Button>
      <Button onClick={handleExportExcel}>Exportar Excel</Button>
    </div>
  );
};
```

