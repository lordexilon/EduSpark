// @ts-nocheck
// workers/file-processing-worker/supabaseService.ts
// Servicio para interactuar con Supabase (Base de datos y Storage)

import { createClient } from '@supabase/supabase-js';
// Importar tipos locales del worker
import type { FileProcessingJob, JobStatus } from './fileProcessing';
import { withRetry, withTimeout, CircuitBreaker, isServerError, isNetworkError } from './retryUtils';

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Circuit breaker para operaciones de Supabase
const supabaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minuto
  halfOpenMaxAttempts: 3
});

/**
 * Inicializa cliente de Supabase
 */
function initializeSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
  }

  supabaseClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Descarga un archivo desde el bucket de Supabase
 */
export async function downloadFileFromBucket(bucketPath: string): Promise<Buffer> {
  const supabase = initializeSupabase();

  // El bucket donde se almacenan los archivos migrados
  const bucketName = 'course-documents';

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(bucketPath);

  if (error) {
    throw new Error(`Error descargando archivo de Supabase Storage (${bucketPath}): ${JSON.stringify(error)}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Obtiene metadata de un archivo en Supabase Storage
 */
export async function getFileMetadataFromBucket(bucketPath: string): Promise<{
  id: string;
  name: string;
  size: number;
  mimeType: string;
}> {
  const supabase = initializeSupabase();
  const bucketName = 'materials';

  // Supabase no tiene un método directo simple para metadata sin descargar o listar
  // Pero podemos intentar listar el archivo para obtener su metadata

  // Extraer el nombre del archivo del path (asumiendo formato "folder/filename")
  const pathParts = bucketPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const folderPath = pathParts.slice(0, -1).join('/');

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folderPath, {
      limit: 1,
      search: fileName,
    });

  if (error || !data || data.length === 0) {
    console.warn(`No se pudo obtener metadata para ${bucketPath}, devolviendo defaults`);
    return {
      id: bucketPath,
      name: fileName,
      size: 0,
      mimeType: 'application/pdf', // Default
    };
  }

  const file = data[0];
  return {
    id: file.id || bucketPath,
    name: file.name,
    size: file.metadata?.size || 0,
    mimeType: file.metadata?.mimetype || 'application/pdf',
  };
}

/**
 * Obtiene trabajos pendientes desde la tabla file_processing_jobs
 * Con circuit breaker y retry con backoff exponencial para manejar errores 522
 */
export async function getPendingJobs(): Promise<FileProcessingJob[]> {
  // Verificar si el circuito está abierto
  if (!supabaseCircuitBreaker.canAttempt()) {
    const state = supabaseCircuitBreaker.getState();
    console.warn(`[Supabase] Circuit breaker está ${state}, saltando consulta de trabajos pendientes`);
    return [];
  }

  try {
    const result = await withRetry(
      async () => {
        // Timeout de 10 segundos para evitar esperas largas
        return await withTimeout(
          async () => {
            const supabase = initializeSupabase();

            const { data, error } = await supabase
              .from<any>('file_processing_jobs')
              .select('*')
              .eq('status', 'pending')
              .limit(10);

            if (error) {
              // Detectar errores del servidor (522, 503, 504)
              if (isServerError(error) || error.status === 522 || error.status === 503 || error.status === 504) {
                const serverError = new Error(`Error del servidor Supabase (${error.status}): ${error.message}`);
                (serverError as any).status = error.status;
                throw serverError;
              }
              
              // Detectar errores de red
              if (isNetworkError(error)) {
                const networkError = new Error(`Error de red: ${error.message}`);
                (networkError as any).status = error.status || 0;
                throw networkError;
              }

              throw error;
            }

            if (!data) {
              return [];
            }

            return data.map((row: any) => ({
              id: row.id,
              status: row.status as JobStatus,
              sourceFileId: row.bucket_path,
              sourceFileName: row.file_name,
              courseId: String(row.course_id),
              jobType: row.metadata?.jobType || 'split',
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
              metadata: row.metadata || {},
              pageStart: row.metadata?.pageStart,
              pageEnd: row.metadata?.pageEnd,
              totalPages: row.metadata?.totalPages,
              pdfType: row.metadata?.pdfType,
            })) as FileProcessingJob[];
          },
          10000, // 10 segundos timeout
          'Consulta de trabajos pendientes excedió el timeout'
        );
      },
      {
        maxRetries: 3,
        initialDelay: 2000, // 2 segundos inicial
        maxDelay: 30000, // Máximo 30 segundos entre reintentos
        backoffMultiplier: 2,
        retryableErrors: (error: any) => {
          // Solo reintentar en errores del servidor o de red
          return isServerError(error) || isNetworkError(error);
        }
      }
    );

    // Si llegamos aquí, la operación fue exitosa
    supabaseCircuitBreaker.recordSuccess();
    return result;

  } catch (error: any) {
    // Registrar el fallo en el circuit breaker
    supabaseCircuitBreaker.recordFailure();
    
    const state = supabaseCircuitBreaker.getState();
    console.error(`[Supabase] Error obteniendo trabajos pendientes (circuit breaker: ${state}):`, {
      message: error.message,
      status: error.status,
      stack: error.stack?.substring(0, 200)
    });

    // Si el error es 522 o similar, retornar array vacío en lugar de lanzar error
    // Esto evita que el worker se detenga completamente
    if (isServerError(error)) {
      console.warn('[Supabase] Error del servidor detectado, retornando array vacío para evitar saturación');
      return [];
    }

    // Para otros errores, también retornar array vacío para no detener el worker
    return [];
  }
}

/**
 * Actualiza un trabajo en la tabla file_processing_jobs
 * Con retry y timeout para manejar errores temporales
 */
export async function updateJob(
  jobId: string,
  updates: Partial<FileProcessingJob>
): Promise<void> {
  try {
    await withRetry(
      async () => {
        return await withTimeout(
          async () => {
            const supabase = initializeSupabase();

            // Preparar objeto de actualización
            const updateData: any = {
              updated_at: new Date().toISOString(),
            };

            if (updates.status) updateData.status = updates.status;
            if (updates.errorMessage) updateData.error_message = updates.errorMessage;

            // Actualizar metadata con campos adicionales
            if (updates.totalPages || updates.pdfType || updates.chunksCreated || updates.metadata) {
              // Primero obtener metadata actual para hacer merge
              const { data: currentJob } = await supabase
                .from<any>('file_processing_jobs')
                .select('metadata')
                .eq('id', jobId)
                .single();

              const currentMetadata = currentJob?.metadata || {};

              updateData.metadata = {
                ...currentMetadata,
                ...updates.metadata,
              };

              if (updates.totalPages) updateData.metadata.totalPages = updates.totalPages;
              if (updates.pdfType) updateData.metadata.pdfType = updates.pdfType;
              if (updates.chunksCreated) updateData.metadata.chunksCreated = updates.chunksCreated;
              if (updates.jobType) updateData.metadata.jobType = updates.jobType;
            }

            const { error } = await supabase
              .from('file_processing_jobs')
              .update(updateData)
              .eq('id', jobId);

            if (error) {
              if (isServerError(error) || isNetworkError(error)) {
                const retryableError = new Error(`Error actualizando trabajo: ${error.message}`);
                (retryableError as any).status = error.status;
                throw retryableError;
              }
              throw error;
            }
          },
          8000, // 8 segundos timeout
          `Actualización de trabajo ${jobId} excedió el timeout`
        );
      },
      {
        maxRetries: 2, // Menos reintentos para updates (son más críticos)
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: (error: any) => isServerError(error) || isNetworkError(error)
      }
    );
  } catch (error: any) {
    console.error(`Error actualizando trabajo ${jobId} después de reintentos:`, error);
    throw error;
  }
}

/**
 * Crea múltiples trabajos hijos en la tabla file_processing_jobs
 */
export async function createChildJobs(
  jobs: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  const supabase = initializeSupabase();

  const records: any[] = jobs.map(job => ({
    material_id: job.metadata?.materialId,
    course_id: Number(job.courseId),
    user_id: job.metadata?.userId,
    bucket_path: job.sourceFileId,
    file_name: job.sourceFileName,
    status: 'pending',
    metadata: {
      ...job.metadata,
      jobType: job.jobType,
      pageStart: job.pageStart,
      pageEnd: job.pageEnd,
      pdfType: job.pdfType,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from<any>('file_processing_jobs')
    .insert(records);

  if (error) {
    console.error('Error creando trabajos hijos:', error);
    throw error;
  }
}

/**
 * Obtiene un trabajo por ID
 */
export async function getJob(jobId: string): Promise<FileProcessingJob | null> {
  const supabase = initializeSupabase();

  const { data, error } = await supabase
    .from<any>('file_processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status as JobStatus,
    sourceFileId: data.bucket_path,
    sourceFileName: data.file_name,
    courseId: String(data.course_id),
    jobType: data.metadata?.jobType || 'split',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    metadata: data.metadata || {},
    pageStart: data.metadata?.pageStart,
    pageEnd: data.metadata?.pageEnd,
    totalPages: data.metadata?.totalPages,
    pdfType: data.metadata?.pdfType,
  } as FileProcessingJob;
}

/**
 * Crea un nuevo trabajo
 */
export async function createJob(
  job: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const supabase = initializeSupabase();

  const { data, error } = await supabase
    .from<any>('file_processing_jobs')
    .insert({
      material_id: job.metadata?.materialId,
      course_id: Number(job.courseId),
      bucket_path: job.sourceFileId,
      file_name: job.sourceFileName,
      status: 'pending',
      metadata: {
        ...job.metadata,
        jobType: job.jobType,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error || new Error('No se pudo crear el trabajo');
  }

  return data.id;
}

/**
 * Guarda un chunk con embedding en Supabase
 */
export async function saveChunk(
  courseId: string,
  content: string,
  embedding: number[],
  metadata: {
    sourceFileName: string;
    pageStart: number;
    pageEnd: number;
    chunkIndex: number;
    pdfType?: string;
    ocrUsed?: boolean;
    category?: string; // Categoría del material (book, bibliography, syllabus, other)
    materialId?: string; // ID del material en Supabase
    unitId?: string; // ID de la unidad
    sessionId?: string; // ID de la sesión
  }
): Promise<void> {
  const supabase = initializeSupabase();

  // Convertir courseId a número si es posible (para compatibilidad con INTEGER)
  const courseIdValue = isNaN(Number(courseId)) ? courseId : Number(courseId);

  const chunkData: any = {
    course_id: courseIdValue,
    content,
    embedding: embedding, // Array de números directamente
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
    },
    chunk_index: metadata.chunkIndex,
    created_at: new Date().toISOString(),
  };

  // Agregar unit_id y session_id si están disponibles
  if (metadata.unitId) {
    chunkData.unit_id = metadata.unitId;
  }
  if (metadata.sessionId) {
    chunkData.session_id = metadata.sessionId;
  }
  // Guardar material_id en metadata para referencia
  if (metadata.materialId) {
    chunkData.metadata.material_id = metadata.materialId;
  }

  const { error } = await supabase.from('course_content_chunks').insert(chunkData);

  if (error) {
    throw new Error(`Error guardando chunk: ${error.message}`);
  }
}

/**
 * Guarda múltiples chunks en batch
 */
export async function saveChunksBatch(
  chunks: Array<{
    courseId: string;
    content: string;
    embedding: number[];
    metadata: {
      sourceFileName: string;
      pageStart: number;
      pageEnd: number;
      chunkIndex: number;
      pdfType?: string;
      ocrUsed?: boolean;
      category?: string; // Categoría del material
      materialId?: string; // ID del material en Supabase
      unitId?: string; // ID de la unidad
      sessionId?: string; // ID de la sesión
    };
  }>
): Promise<void> {
  const supabase = initializeSupabase();

  const records = chunks.map(chunk => {
    // Convertir courseId a número si es posible (para compatibilidad con INTEGER)
    const courseIdValue = isNaN(Number(chunk.courseId)) ? chunk.courseId : Number(chunk.courseId);

    const record: any = {
      course_id: courseIdValue,
      content: chunk.content,
      embedding: chunk.embedding, // Array de números directamente
      metadata: {
        ...chunk.metadata,
        createdAt: new Date().toISOString(),
      },
      chunk_index: chunk.metadata.chunkIndex,
      created_at: new Date().toISOString(),
    };

    // Agregar unit_id y session_id si están disponibles
    if (chunk.metadata.unitId) {
      record.unit_id = chunk.metadata.unitId;
    }
    if (chunk.metadata.sessionId) {
      record.session_id = chunk.metadata.sessionId;
    }
    // Guardar material_id en metadata para referencia
    if (chunk.metadata.materialId) {
      record.metadata.material_id = chunk.metadata.materialId;
    }

    return record;
  });

  const { error } = await supabase.from('course_content_chunks').insert(records as any);

  if (error) {
    throw new Error(`Error guardando chunks: ${error.message}`);
  }
}
