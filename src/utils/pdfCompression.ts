// utils/pdfCompression.ts
// Utilidad para comprimir PDFs antes de subirlos

import { PDFDocument } from 'pdf-lib';

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  info: string;
}

/**
 * Comprime un archivo PDF reduciendo su tamaño
 * @param file Archivo PDF original
 * @param maxSizeMB Tamaño máximo deseado en MB (por defecto 10MB)
 * @returns Archivo PDF comprimido
 */
export async function compressPDF(file: File, maxSizeMB: number = 10): Promise<CompressionResult> {
  const originalSize = file.size;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Si el archivo ya es pequeño, no comprimir
  if (originalSize <= maxSizeBytes) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      info: `PDF ya es pequeño (${(originalSize / 1024 / 1024).toFixed(2)}MB), no se comprimió`,
    };
  }

  try {
    // Leer el PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      // Ignorar errores menores para poder procesar PDFs corruptos
      ignoreEncryption: false,
      // No actualizar metadatos innecesarios
      updateMetadata: false,
    });

    // Crear un nuevo PDF optimizado
    const optimizedPdf = await PDFDocument.create();

    // Copiar todas las páginas
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const [copiedPage] = await optimizedPdf.copyPages(pdfDoc, [i]);
      optimizedPdf.addPage(copiedPage);
    }

    // Intentar reducir el tamaño eliminando objetos innecesarios
    // pdf-lib no tiene compresión directa, pero podemos optimizar metadatos
    const pdfBytes = await optimizedPdf.save({
      useObjectStreams: true, // Usar streams de objetos para reducir tamaño
      addDefaultPage: false,
    });

    // Crear nuevo File con el PDF optimizado
    const compressedFile = new File([pdfBytes], file.name, { type: 'application/pdf' });

    const compressedSize = compressedFile.size;
    const compressionRatio = compressedSize / originalSize;

    // Si aún es muy grande, intentar una segunda pasada más agresiva
    if (compressedSize > maxSizeBytes) {
      // Para PDFs muy grandes, podríamos reducir la calidad de imágenes
      // pero pdf-lib no tiene esta funcionalidad directamente
      // Por ahora, retornamos el mejor resultado posible
      return {
        file: compressedFile,
        originalSize,
        compressedSize,
        compressionRatio,
        info: `PDF comprimido de ${(originalSize / 1024 / 1024).toFixed(2)}MB a ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${(compressionRatio * 100).toFixed(1)}% del original). Nota: El archivo aún es grande.`,
      };
    }

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
      info: `PDF comprimido de ${(originalSize / 1024 / 1024).toFixed(2)}MB a ${(compressedSize / 1024 / 1024).toFixed(2)}MB (reducción del ${((1 - compressionRatio) * 100).toFixed(1)}%)`,
    };
  } catch (error: any) {
    console.warn('Error comprimiendo PDF, usando original:', error);
    // Si falla la compresión, usar el archivo original
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      info: `Error al comprimir PDF: ${error.message}. Se usará el archivo original.`,
    };
  }
}

/**
 * Verifica si un PDF debería ser comprimido
 * @param file Archivo PDF
 * @param thresholdMB Umbral en MB para decidir si comprimir (por defecto 5MB)
 * @returns true si el archivo debería ser comprimido
 */
export function shouldCompressPDF(file: File, thresholdMB: number = 5): boolean {
  if (file.type !== 'application/pdf') {
    return false;
  }
  const sizeMB = file.size / 1024 / 1024;
  return sizeMB > thresholdMB;
}
