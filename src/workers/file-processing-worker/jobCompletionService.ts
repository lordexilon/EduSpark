// workers/file-processing-worker/jobCompletionService.ts
// Servicio para verificar cuando todos los chunks de un archivo están completos

import { createClient } from '@supabase/supabase-js';
import { updateMaterialRagStatus } from './materialService';

function initializeSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verifica si todos los chunks de un archivo están completos
 * y actualiza el estado del material en Supabase
 */
export async function checkAndUpdateMaterialCompletion(
  sourceFileId: string,
  materialId?: string
): Promise<void> {
  if (!materialId) return;

  const supabase = initializeSupabase();

  // Buscar todos los trabajos relacionados con este archivo en Supabase
  // sourceFileId corresponde a bucket_path
  const { data: jobs, error } = await supabase
    .from('file_processing_jobs')
    .select('status, metadata')
    .eq('bucket_path', sourceFileId);

  if (error) {
    console.error('Error verificando completitud de trabajos:', error);
    return;
  }

  if (!jobs || jobs.length === 0) return;

  // Filtrar solo los jobs de tipo 'process_chunk'
  const chunkJobs = jobs.filter((job: any) => job.metadata?.jobType === 'process_chunk');

  if (chunkJobs.length === 0) return;

  // Verificar si todos están completos
  const allCompleted = chunkJobs.every((job: any) => job.status === 'completed');
  const anyFailed = chunkJobs.some((job: any) => job.status === 'failed');

  if (allCompleted && !anyFailed) {
    // Todos los chunks están completos
    await updateMaterialRagStatus(materialId, 'completed');
    console.log(`[Completion] Material ${materialId} marcado como completado`);
  } else if (anyFailed) {
    // Al menos un chunk falló
    // Verificar si ya se intentó reintentar o si es fallo definitivo
    await updateMaterialRagStatus(materialId, 'failed', 'Error en procesamiento de chunks');
    console.log(`[Completion] Material ${materialId} marcado como fallido`);
  }
}

