// services/firestoreService.ts
// Servicio para interactuar con el sistema de procesamiento de archivos (Migrado a Supabase)
// Mantenemos el nombre del archivo para compatibilidad, pero ahora usa Supabase

import { supabase } from '@/lib/supabase';
import type { FileProcessingJob, JobStatus } from '@/types/fileProcessing';

/**
 * Convierte un registro de Supabase a FileProcessingJob
 */
function convertFromSupabase(row: any): FileProcessingJob {
  // bucket_path puede ser el ID de Google Drive o la ruta del bucket
  // También verificar metadata.sourceFileId que puede tener el ID original
  const sourceFileId = row.metadata?.sourceFileId || row.bucket_path;
  
  const job = {
    id: row.id,
    status: row.status as JobStatus,
    sourceFileId: sourceFileId, // Usar metadata.sourceFileId si existe, sino bucket_path
    sourceFileName: row.file_name,
    courseId: row.course_id?.toString(),
    jobType: row.metadata?.jobType || 'split',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    startedAt: row.metadata?.startedAt ? new Date(row.metadata.startedAt) : undefined,
    completedAt: row.metadata?.completedAt ? new Date(row.metadata.completedAt) : undefined,
    errorMessage: row.error_message,
    metadata: row.metadata || {},
    // Campos adicionales mapeados desde metadata
    pageStart: row.metadata?.pageStart,
    pageEnd: row.metadata?.pageEnd,
    totalPages: row.metadata?.totalPages,
    chunksCreated: row.metadata?.chunksCreated,
    pdfType: row.metadata?.pdfType,
  } as FileProcessingJob;

  // Añadir chunksProcessed y chunksTotal como propiedades directas para facilitar acceso
  (job as any).chunksProcessed = row.metadata?.chunksProcessed || 0;
  (job as any).chunksTotal = row.metadata?.chunksTotal;

  return job;
}

/**
 * Crea un nuevo trabajo de procesamiento
 */
export async function createJob(job: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const { data, error } = await supabase
    .from('file_processing_jobs')
    .insert({
      material_id: job.metadata?.materialId,
      course_id: Number(job.courseId),
      user_id: job.metadata?.userId,
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

  if (error) throw error;
  return data.id;
}

/**
 * Actualiza un trabajo de procesamiento
 */
export async function updateJob(jobId: string, updates: Partial<FileProcessingJob>): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) updateData.status = updates.status;
  if (updates.errorMessage) updateData.error_message = updates.errorMessage;

  // Si hay actualizaciones de metadata, necesitamos hacer merge
  if (updates.metadata || updates.totalPages || updates.chunksCreated || updates.pdfType) {
    const { data: current } = await supabase
      .from('file_processing_jobs')
      .select('metadata')
      .eq('id', jobId)
      .single();

    const currentMeta = current?.metadata || {};

    updateData.metadata = {
      ...currentMeta,
      ...updates.metadata,
    };

    if (updates.totalPages) updateData.metadata.totalPages = updates.totalPages;
    if (updates.chunksCreated) updateData.metadata.chunksCreated = updates.chunksCreated;
    if (updates.pdfType) updateData.metadata.pdfType = updates.pdfType;
  }

  const { error } = await supabase
    .from('file_processing_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Cancela un trabajo de procesamiento
 * (En Supabase simplemente actualizamos el estado a failed o cancelled si existiera)
 */
export async function cancelJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('file_processing_jobs')
    .update({
      status: 'cancelled',
      error_message: 'Cancelado por el usuario',
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Elimina un trabajo de procesamiento
 */
export async function deleteJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('file_processing_jobs')
    .delete()
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Obtiene un trabajo por ID
 */
export async function getJob(jobId: string): Promise<FileProcessingJob | null> {
  const { data, error } = await supabase
    .from('file_processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) return null;
  return convertFromSupabase(data);
}

/**
 * Obtiene todos los trabajos de un archivo
 */
export async function getJobsByFileId(sourceFileId: string): Promise<FileProcessingJob[]> {
  const { data, error } = await supabase
    .from('file_processing_jobs')
    .select('*')
    .eq('bucket_path', sourceFileId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data || []).map(convertFromSupabase);
}

/**
 * Obtiene trabajos pendientes
 */
export async function getPendingJobs(): Promise<FileProcessingJob[]> {
  const { data, error } = await supabase
    .from('file_processing_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data || []).map(convertFromSupabase);
}

/**
 * Obtiene todos los trabajos de un usuario
 */
export async function getAllJobs(userId: string): Promise<FileProcessingJob[]> {
  console.log(`[FirestoreService] Obteniendo jobs para usuario: ${userId}`);
  const { data, error } = await supabase
    .from('file_processing_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[FirestoreService] Error obteniendo jobs:', error);
    return [];
  }
  
  const jobs = (data || []).map(convertFromSupabase);
  console.log(`[FirestoreService] Jobs encontrados: ${jobs.length}`, jobs.map(j => ({
    id: j.id,
    status: j.status,
    sourceFileId: j.sourceFileId,
    metadataSourceFileId: (j.metadata as any)?.sourceFileId,
    fileName: j.sourceFileName
  })));
  return jobs;
}

/**
 * Escucha cambios en trabajos de un archivo (tiempo real)
 */
export function subscribeToFileJobs(
  sourceFileId: string,
  callback: (jobs: FileProcessingJob[]) => void
): () => void {
  // Suscripción a cambios en la tabla filtrando por bucket_path
  const channel = supabase
    .channel(`file-jobs-${sourceFileId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'file_processing_jobs',
        filter: `bucket_path=eq.${sourceFileId}`,
      },
      async () => {
        // Cuando hay cambios, recargar los datos
        const jobs = await getJobsByFileId(sourceFileId);
        callback(jobs);
      }
    )
    .subscribe();

  // Carga inicial
  getJobsByFileId(sourceFileId).then(callback);

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Escucha cambios en todos los trabajos (tiempo real)
 */
export function subscribeToAllJobs(
  userId: string,
  callback: (jobs: FileProcessingJob[]) => void
): () => void {
  console.log(`[FirestoreService] Suscribiéndose a jobs para usuario: ${userId}`);
  
  // Suscripción a cambios en la tabla filtrando por user_id
  const channel = supabase
    .channel(`user-jobs-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'file_processing_jobs',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const oldChunksProcessed = (payload.old?.metadata as any)?.chunksProcessed;
        const newChunksProcessed = (payload.new?.metadata as any)?.chunksProcessed;
        const oldChunksTotal = (payload.old?.metadata as any)?.chunksTotal;
        const newChunksTotal = (payload.new?.metadata as any)?.chunksTotal;
        
        const progressChanged = oldChunksProcessed !== newChunksProcessed || oldChunksTotal !== newChunksTotal;
        
        console.log(`[FirestoreService] Cambio detectado en jobs:`, {
          eventType: payload.eventType,
          jobId: payload.new?.id || payload.old?.id,
          status: payload.new?.status || payload.old?.status,
          progressChanged,
          oldChunks: { processed: oldChunksProcessed, total: oldChunksTotal },
          newChunks: { processed: newChunksProcessed, total: newChunksTotal }
        });
        
        // Para eventos DELETE, usar un pequeño delay para asegurar que Supabase haya procesado
        const delay = payload.eventType === 'DELETE' ? 500 : 0;
        
        setTimeout(async () => {
          const jobs = await getAllJobs(userId);
          console.log(`[FirestoreService] Jobs recargados después de cambio (${payload.eventType}): ${jobs.length}`);
          callback(jobs);
        }, delay);
      }
    )
    .subscribe((status) => {
      console.log(`[FirestoreService] Estado de suscripción: ${status}`);
    });

  // Carga inicial
  getAllJobs(userId).then((jobs) => {
    console.log(`[FirestoreService] Carga inicial de jobs: ${jobs.length} jobs`);
    callback(jobs);
  });

  return () => {
    console.log(`[FirestoreService] Desuscribiéndose de jobs para usuario: ${userId}`);
    supabase.removeChannel(channel);
  };
}


