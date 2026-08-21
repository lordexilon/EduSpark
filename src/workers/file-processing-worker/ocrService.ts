// workers/file-processing-worker/ocrService.ts
// Servicio para OCR usando Google Cloud Vision API

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { PDFDocument } from 'pdf-lib';

let visionClient: ImageAnnotatorClient | null = null;

/**
 * Inicializa cliente de Vision API
 */
function initializeVision(): ImageAnnotatorClient {
  if (visionClient) return visionClient;

  visionClient = new ImageAnnotatorClient();
  return visionClient;
}

/**
 * Extrae texto de una página de PDF usando OCR
 */
export async function extractTextFromPdfPage(
  pdfBuffer: Buffer,
  pageIndex: number
): Promise<string> {
  const vision = initializeVision();
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Extraer página específica
  const pages = pdfDoc.getPages();
  if (pageIndex >= pages.length) {
    throw new Error(`Página ${pageIndex} no existe en el PDF`);
  }

  // Convertir página a imagen (esto requiere una librería adicional)
  // Por ahora, usamos un enfoque simplificado: procesar el PDF completo
  // En producción, deberías convertir cada página a imagen primero

  // Nota: Vision API puede procesar PDFs directamente, pero con límites
  // Para archivos grandes, es mejor convertir páginas a imágenes primero

  const [result] = await vision.documentTextDetection({
    image: {
      content: pdfBuffer,
    },
  });

  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation) {
    return '';
  }

  return fullTextAnnotation.text || '';
}

/**
 * Extrae texto de múltiples páginas usando OCR
 */
export async function extractTextFromPdfPages(
  pdfBuffer: Buffer,
  pageStart: number,
  pageEnd: number
): Promise<string> {
  const vision = initializeVision();
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();

  if (pageStart < 1 || pageEnd > totalPages || pageStart > pageEnd) {
    throw new Error(`Rango de páginas inválido: ${pageStart}-${pageEnd} (total: ${totalPages})`);
  }

  // Procesar páginas en lotes (máx 10 por request para evitar límites)
  const batchSize = 10;
  const allText: string[] = [];

  for (let i = pageStart; i <= pageEnd; i += batchSize) {
    const batchEnd = Math.min(i + batchSize - 1, pageEnd);

    // Crear un PDF temporal con solo estas páginas
    const tempPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: batchEnd - i + 1 }, (_, idx) => i - 1 + idx);
    const copiedPages = await tempPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => tempPdf.addPage(page));

    const tempPdfBytes = await tempPdf.save();

    // Procesar con Vision API
    const [result] = await vision.documentTextDetection({
      image: {
        content: Buffer.from(tempPdfBytes),
      },
    });

    const fullTextAnnotation = result.fullTextAnnotation;
    if (fullTextAnnotation?.text) {
      allText.push(fullTextAnnotation.text);
    }

    // Pequeño delay para evitar rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return allText.join('\n\n');
}
