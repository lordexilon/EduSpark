// services/costEstimator.ts
// Estimación de costos para procesamiento de archivos

import type { CostEstimate, PdfType } from '../types/fileProcessing';

/**
 * Precios de servicios (USD)
 */
const PRICING = {
  // Google Cloud Vision API (OCR)
  ocr: {
    first1000: 1.50, // Por 1,000 páginas
    additional: 0.60, // Por cada 1,000 páginas adicionales
  },
  // Gemini API (Embeddings)
  embeddings: {
    per1000Chars: 0.0001, // Por 1,000 caracteres
    avgCharsPerPage: 500, // Caracteres promedio por página
  },
  // Cloud Run
  cloudRun: {
    cpuPerSecond: 0.00002400, // Por vCPU-segundo
    memoryPerGbSecond: 0.00000250, // Por GB-segundo
    cpuAllocated: 2, // vCPU asignados (reducido de 4)
    memoryAllocated: 4, // GB asignados (reducido de 8GB para optimizar costos)
    minutesPerChunk: 2, // Minutos estimados por chunk (ajustado para chunks más grandes)
  },
  // Firestore
  firestore: {
    writesPer100k: 0.18, // Por 100,000 escrituras
    readsPer100k: 0.06, // Por 100,000 lecturas
  },
};

/**
 * Calcula el costo de OCR para un número de páginas
 */
function calculateOCRCost(pages: number): number {
  if (pages <= 0) return 0;
  
  if (pages <= 1000) {
    return (pages / 1000) * PRICING.ocr.first1000;
  }
  
  const first1000Cost = PRICING.ocr.first1000;
  const additionalPages = pages - 1000;
  const additionalCost = (additionalPages / 1000) * PRICING.ocr.additional;
  
  return first1000Cost + additionalCost;
}

/**
 * Calcula el costo de embeddings para un número de páginas
 */
function calculateEmbeddingsCost(pages: number): number {
  const totalChars = pages * PRICING.embeddings.avgCharsPerPage;
  return (totalChars / 1000) * PRICING.embeddings.per1000Chars;
}

/**
 * Calcula el costo de Cloud Run para procesar un archivo
 */
function calculateCloudRunCost(totalPages: number, chunkSize: number = 60): number {
  const chunks = Math.ceil(totalPages / chunkSize);
  const secondsPerChunk = PRICING.cloudRun.minutesPerChunk * 60;
  
  // Costo de CPU
  const cpuCost = chunks * secondsPerChunk * PRICING.cloudRun.cpuAllocated * PRICING.cloudRun.cpuPerSecond;
  
  // Costo de memoria
  const memoryCost = chunks * secondsPerChunk * PRICING.cloudRun.memoryAllocated * PRICING.cloudRun.memoryPerGbSecond;
  
  return cpuCost + memoryCost;
}

/**
 * Calcula el costo de Firestore
 */
function calculateFirestoreCost(totalPages: number, chunkSize: number = 60): number {
  const chunks = Math.ceil(totalPages / chunkSize);
  
  // Estimamos: 1 escritura por página procesada + 1 por chunk creado
  const writes = totalPages + chunks;
  const reads = chunks * 2; // Lecturas para verificar estado
  
  const writeCost = (writes / 100000) * PRICING.firestore.writesPer100k;
  const readCost = (reads / 100000) * PRICING.firestore.readsPer100k;
  
  return writeCost + readCost;
}

/**
 * Estima los costos de procesamiento de un archivo
 */
export function estimateCosts(
  totalPages: number,
  pdfType: PdfType,
  chunkSize: number = 60 // Optimizado: aumentado de 25 a 60 para reducir costos
): CostEstimate {
  const ocrCost = pdfType === 'scanned' ? calculateOCRCost(totalPages) : 0;
  const embeddingsCost = calculateEmbeddingsCost(totalPages);
  const cloudRunCost = calculateCloudRunCost(totalPages, chunkSize);
  const firestoreCost = calculateFirestoreCost(totalPages, chunkSize);
  
  const total = ocrCost + embeddingsCost + cloudRunCost + firestoreCost;
  
  // Tiempo estimado de procesamiento
  const chunks = Math.ceil(totalPages / chunkSize);
  const estimatedMinutes = chunks * PRICING.cloudRun.minutesPerChunk;
  const estimatedHours = estimatedMinutes / 60;
  
  return {
    totalPages,
    pdfType,
    estimatedCosts: {
      ocr: parseFloat(ocrCost.toFixed(4)),
      embeddings: parseFloat(embeddingsCost.toFixed(4)),
      cloudRun: parseFloat(cloudRunCost.toFixed(4)),
      firestore: parseFloat(firestoreCost.toFixed(4)),
      total: parseFloat(total.toFixed(4)),
    },
    processingTime: {
      estimatedMinutes: Math.round(estimatedMinutes),
      estimatedHours: parseFloat(estimatedHours.toFixed(2)),
    },
  };
}

/**
 * Formatea un costo en USD para mostrar
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

