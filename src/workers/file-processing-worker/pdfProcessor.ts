// workers/file-processing-worker/pdfProcessor.ts
// Procesador de PDFs (texto nativo y OCR)
// OPTIMIZADO: Procesa página por página para evitar "Invalid string length"

import pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import { extractTextFromPdfPages } from './ocrService';
import type { PdfType } from '../../types/fileProcessing';

/**
 * Detecta el tipo de PDF (texto vs escaneado)
 */
export async function detectPdfType(pdfBuffer: Buffer): Promise<PdfType> {
  try {
    const data = await pdfParse(pdfBuffer);
    const textLength = data.text.length;
    const pdfSize = pdfBuffer.length;

    // Si el texto extraído es menos del 10% del tamaño del PDF, probablemente es escaneado
    const textRatio = textLength / pdfSize;

    if (textRatio < 0.1 && textLength < 100) {
      return 'scanned';
    } else if (textLength > 100) {
      return 'text';
    }

    return 'unknown';
  } catch (error) {
    console.error('Error detectando tipo de PDF:', error);
    return 'unknown';
  }
}

/**
 * Cuenta las páginas de un PDF
 */
export async function countPdfPages(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error contando páginas:', error);
    // Fallback: intentar con pdf-parse
    try {
      const data = await pdfParse(pdfBuffer);
      return data.numpages || 0;
    } catch (e) {
      console.error('Error en fallback de conteo:', e);
      return 0;
    }
  }
}

/**
 * Extrae texto de un rango de páginas
 * OPTIMIZADO: Procesa página por página para evitar "Invalid string length"
 * y capturar números de página reales
 */
export async function extractTextFromPages(
  pdfBuffer: Buffer,
  pageStart: number,
  pageEnd: number,
  pdfType: PdfType
): Promise<string> {
  if (pdfType === 'text') {
    // Extraer texto nativo página por página
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      // Validar rango
      const actualStart = Math.max(1, Math.min(pageStart, totalPages));
      const actualEnd = Math.max(actualStart, Math.min(pageEnd, totalPages));

      console.log(`📄 Extrayendo páginas ${actualStart}-${actualEnd} de ${totalPages}`);

      const pageTexts: string[] = [];

      // Procesar página por página
      for (let pageNum = actualStart; pageNum <= actualEnd; pageNum++) {
        try {
          // Crear un nuevo PDF con solo esta página
          const singlePagePdf = await PDFDocument.create();
          const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
          singlePagePdf.addPage(copiedPage);

          // Convertir a buffer
          const singlePageBytes = await singlePagePdf.save();
          const singlePageBuffer = Buffer.from(singlePageBytes);

          // Extraer texto de esta página
          const pageData = await pdfParse(singlePageBuffer);
          const pageText = pageData.text.trim();

          if (pageText.length > 0) {
            pageTexts.push(pageText);
          }

          // Log de progreso cada 10 páginas
          if (pageNum % 10 === 0) {
            console.log(`  ✓ Procesadas ${pageNum - actualStart + 1}/${actualEnd - actualStart + 1} páginas`);
          }
        } catch (pageError) {
          console.error(`⚠️ Error en página ${pageNum}:`, pageError);
          // Continuar con la siguiente página
          pageTexts.push(`[Error en página ${pageNum}]`);
        }
      }

      console.log(`✅ Extracción completada: ${pageTexts.length} páginas con texto`);
      return pageTexts.join('\n\n');

    } catch (error) {
      console.error('Error extrayendo texto nativo:', error);
      throw error;
    }
  } else if (pdfType === 'scanned') {
    // Usar OCR
    return await extractTextFromPdfPages(pdfBuffer, pageStart, pageEnd);
  } else {
    throw new Error('Tipo de PDF desconocido');
  }
}
