// workers/file-processing-worker/pdfProcessor.ts
// Procesador de PDFs (texto nativo y OCR)

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
 */
export async function extractTextFromPages(
  pdfBuffer: Buffer,
  pageStart: number,
  pageEnd: number,
  pdfType: PdfType
): Promise<string> {
  if (pdfType === 'text') {
    // Extraer texto nativo
    try {
      const data = await pdfParse(pdfBuffer);
      // pdf-parse no soporta rangos directamente, así que extraemos todo y filtramos
      // Nota: En producción, deberías usar una librería que soporte rangos
      const fullText = data.text;
      
      // Dividir por páginas (aproximado)
      const pages = fullText.split(/\f/);
      const selectedPages = pages.slice(pageStart - 1, pageEnd);
      
      return selectedPages.join('\n\n');
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

