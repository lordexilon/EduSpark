// types/fileProcessing.ts
// Tipos para el sistema de procesamiento asíncrono de archivos

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'split' | 'process_chunk' | 'index_text_content';
export type PdfType = 'text' | 'scanned' | 'unknown';
export type MaterialCategory = 'book' | 'bibliography' | 'syllabus' | 'exam' | 'pamphlet' | 'other';

/**
 * Tipo de procesamiento RAG para materiales
 */
export type RAGProcessingType = 'full' | 'readonly' | 'pending';

/**
 * Estimación de costos de procesamiento
 */
export interface CostEstimate {
  totalPages: number;
  pdfType: PdfType;
  estimatedCosts: {
    ocr: number; // USD
    embeddings: number; // USD
    cloudRun: number; // USD
    firestore: number; // USD
    total: number; // USD
  };
  processingTime: {
    estimatedMinutes: number;
    estimatedHours: number;
  };
}

/**
 * Trabajo de procesamiento de archivo
 */
export interface FileProcessingJob {
  id: string; // Auto-generado por Firestore
  status: JobStatus;
  jobType: JobType;
  sourceFileId?: string; // ID del archivo en Google Drive (opcional para index_text_content)
  sourceFileName?: string; // Nombre del archivo (opcional para index_text_content)
  textContent?: string; // Contenido de texto directo (para index_text_content)
  courseId: string; // ID del curso en Supabase
  pageStart?: number; // Solo para jobType: 'process_chunk'
  pageEnd?: number; // Solo para jobType: 'process_chunk'
  totalPages?: number; // Solo para jobType: 'split'
  chunksCreated?: number; // Solo para jobType: 'split'
  pdfType?: PdfType; // Detectado en análisis
  createdAt: Date | string; // Timestamp
  updatedAt: Date | string; // Timestamp
  startedAt?: Date | string; // Timestamp
  completedAt?: Date | string; // Timestamp
  errorMessage?: string;
  metadata?: {
    userId?: string;
    chunkSize?: number; // Default: 25
    fileSize?: number; // En bytes
    estimatedCosts?: CostEstimate;
    actualCosts?: CostEstimate; // Al finalizar
    category?: MaterialCategory; // Categoría del material
    materialId?: string; // ID del material en Supabase (opcional)
  };
}

/**
 * Análisis previo de archivo
 */
export interface FileAnalysis {
  fileId: string;
  fileName: string;
  fileSize: number; // En bytes
  totalPages: number;
  pdfType: PdfType;
  requiresOCR: boolean;
  estimatedCosts: CostEstimate;
}

/**
 * Request para crear un trabajo de procesamiento
 */
export interface CreateJobRequest {
  fileId: string;
  fileName: string;
  courseId: string;
  userId: string;
  category: MaterialCategory; // Categoría del material (requerido)
  materialId?: string; // ID del material en Supabase (opcional, se crea si no existe)
  analysis?: FileAnalysis; // Opcional pero recomendado
  chunkSize?: number; // Default: 25
}

/**
 * Request para analizar un archivo
 */
export interface AnalyzeFileRequest {
  fileId: string;
  fileName: string;
}

/**
 * Response de análisis de archivo
 */
export interface AnalyzeFileResponse {
  success: boolean;
  analysis?: FileAnalysis;
  error?: string;
}

/**
 * Response de creación de trabajo
 */
export interface CreateJobResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

