// workers/file-processing-worker/jobCompletionService.ts
// Servicio para verificar cuando todos los chunks de un archivo están completos

import { getFirestore } from 'firebase-admin/firestore';
import { updateMaterialRagStatus } from './materialService';

/**
 * Verifica si todos los chunks de un archivo están completos
 * y actualiza el estado del material en Supabase
 */
export async function checkAndUpdateMaterialCompletion(
  sourceFileId: string,
  materialId?: string
): Promise<void> {
  if (!materialId) return;

  const db = getFirestore();
  
  // Buscar todos los trabajos relacionados con este archivo
  const jobsSnapshot = await db
    .collection('file_processing_jobs')
    .where('sourceFileId', '==', sourceFileId)
    .where('jobType', '==', 'process_chunk')
    .get();

  if (jobsSnapshot.empty) return;

  const jobs = jobsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Verificar si todos están completos
  const allCompleted = jobs.every(job => job.status === 'completed');
  const anyFailed = jobs.some(job => job.status === 'failed');

  if (allCompleted && !anyFailed) {
    // Todos los chunks están completos
    await updateMaterialRagStatus(materialId, 'completed');
    console.log(`[Completion] Material ${materialId} marcado como completado`);
  } else if (anyFailed) {
    // Al menos un chunk falló
    await updateMaterialRagStatus(materialId, 'failed');
    console.log(`[Completion] Material ${materialId} marcado como fallido`);
  }
}

