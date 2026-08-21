// Tipos para el procesamiento de archivos (copia local para el worker)
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'split' | 'process_chunk' | 'index_text_content';
export type PdfType = 'text' | 'scanned' | 'unknown';
export type MaterialCategory = 'book' | 'bibliography' | 'syllabus' | 'exam' | 'pamphlet' | 'other';

export type RAGProcessingType = 'full' | 'readonly' | 'pending';

export interface CostEstimate {
  totalPages: number;
  pdfType: PdfType;
  estimatedCosts: {
    ocr: number;
    embeddings: number;
    cloudRun: number;
    firestore: number;
    total: number;
  };
  processingTime: {
    estimatedMinutes: number;
    estimatedHours: number;
  };
}

export interface FileProcessingJob {
  id: string;
  status: JobStatus;
  jobType: JobType;
  sourceFileId?: string;
  sourceFileName?: string;
  textContent?: string;
  courseId: string;
  pageStart?: number;
  pageEnd?: number;
  totalPages?: number;
  chunksCreated?: number;
  pdfType?: PdfType;
  createdAt: Date | string;
  updatedAt: Date | string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  errorMessage?: string;
  metadata?: {
    userId?: string;
    chunkSize?: number;
    fileSize?: number;
    estimatedCosts?: CostEstimate;
    actualCosts?: CostEstimate;
    category?: MaterialCategory;
    materialId?: string;
    unitId?: string;
    sessionId?: string;
    source?: 'bucket' | 'google_drive';
    driveFileId?: string;
  };
}

export interface FileAnalysis {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  pdfType: PdfType;
  requiresOCR: boolean;
  estimatedCosts: CostEstimate;
}

export interface CreateJobRequest {
  fileId: string;
  fileName: string;
  courseId: string;
  userId: string;
  category: MaterialCategory;
  materialId?: string;
  analysis?: FileAnalysis;
  chunkSize?: number;
}

export interface AnalyzeFileRequest {
  fileId: string;
  fileName: string;
}

export interface AnalyzeFileResponse {
  success: boolean;
  analysis?: FileAnalysis;
  error?: string;
}

export interface CreateJobResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}
