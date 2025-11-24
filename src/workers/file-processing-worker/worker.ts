// workers/file-processing-worker/worker.ts
// Lógica principal del worker

import { getPendingJobs, updateJob, createChildJobs, getJob } from './firestoreService';
import { downloadFile, getFileMetadata } from './driveService';
import { detectPdfType, countPdfPages, extractTextFromPages } from './pdfProcessor';
import { processTextIntoChunks } from './chunkProcessor';
import { generateEmbeddingsBatch } from './geminiService';
import { saveChunksBatch } from './supabaseService';
import { updateMaterialRagStatus, getMaterialInfo } from './materialService';
import { checkAndUpdateMaterialCompletion } from './jobCompletionService';
import type { FileProcessingJob, PdfType } from '../../types/fileProcessing';

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '25', 10);

/**
 * Procesa un trabajo de tipo 'split'
 */
async function processSplitJob(job: FileProcessingJob): Promise<void> {
  console.log(`[Split] Procesando trabajo ${job.id} para archivo ${job.sourceFileName}`);

  try {
    // Descargar primeras páginas para análisis
    const fileBuffer = await downloadFile(job.sourceFileId);
    
    // Detectar tipo y contar páginas
    const pdfType = await detectPdfType(fileBuffer);
    const totalPages = await countPdfPages(fileBuffer);

    console.log(`[Split] Archivo: ${job.sourceFileName}, Tipo: ${pdfType}, Páginas: ${totalPages}`);

    // Actualizar trabajo con información
    await updateJob(job.id, {
      totalPages,
      pdfType,
      status: 'processing',
    });

    // Crear trabajos hijos
    const childJobs: Array<Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const numChunks = Math.ceil(totalPages / CHUNK_SIZE);

    for (let i = 0; i < numChunks; i++) {
      const pageStart = i * CHUNK_SIZE + 1;
      const pageEnd = Math.min((i + 1) * CHUNK_SIZE, totalPages);

      childJobs.push({
        status: 'pending',
        jobType: 'process_chunk',
        sourceFileId: job.sourceFileId,
        sourceFileName: job.sourceFileName,
        courseId: job.courseId,
        pageStart,
        pageEnd,
        pdfType,
        metadata: {
          ...job.metadata,
        },
      });
    }

    await createChildJobs(childJobs);

    // Marcar trabajo como completado
    await updateJob(job.id, {
      status: 'completed',
      chunksCreated: childJobs.length,
    });

    console.log(`[Split] Trabajo ${job.id} completado. Creados ${childJobs.length} trabajos hijos.`);
  } catch (error: any) {
    console.error(`[Split] Error procesando trabajo ${job.id}:`, error);
    await updateJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'Error desconocido',
    });
    throw error;
  }
}

/**
 * Procesa un trabajo de tipo 'process_chunk'
 */
async function processChunkJob(job: FileProcessingJob): Promise<void> {
  if (!job.pageStart || !job.pageEnd) {
    throw new Error('pageStart y pageEnd son requeridos para process_chunk');
  }

  console.log(
    `[Chunk] Procesando trabajo ${job.id}: páginas ${job.pageStart}-${job.pageEnd} de ${job.sourceFileName}`
  );

  try {
    // Marcar como procesando
    await updateJob(job.id, {
      status: 'processing',
    });

    // Descargar archivo (o rango si es muy grande)
    const fileMetadata = await getFileMetadata(job.sourceFileId);
    let fileBuffer: Buffer;

    // Para archivos grandes (>100MB), considerar descargar solo el rango necesario
    // Por ahora, descargamos el archivo completo
    fileBuffer = await downloadFile(job.sourceFileId);

    // Extraer texto del rango de páginas
    const pdfType = job.pdfType || 'unknown';
    const text = await extractTextFromPages(fileBuffer, job.pageStart, job.pageEnd, pdfType);

    if (!text || text.trim().length === 0) {
      throw new Error('No se pudo extraer texto de las páginas especificadas');
    }

    // Dividir en chunks pequeños
    const chunks = processTextIntoChunks(text, {
      sourceFileName: job.sourceFileName,
      pageStart: job.pageStart,
      pageEnd: job.pageEnd,
    });

    console.log(`[Chunk] Texto extraído: ${text.length} caracteres, dividido en ${chunks.length} chunks`);

    // Generar embeddings
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    console.log(`[Chunk] Embeddings generados: ${embeddings.length}`);

    // Obtener información del material (unit_id, session_id) si está disponible
    let materialInfo: { course_id: number | string; unit_id: string | null; session_id: string | null } | null = null;
    if (job.metadata?.materialId) {
      try {
        materialInfo = await getMaterialInfo(job.metadata.materialId);
        if (materialInfo) {
          console.log(`[Chunk] Material vinculado: unit_id=${materialInfo.unit_id}, session_id=${materialInfo.session_id}`);
        }
      } catch (err) {
        console.warn(`[Chunk] No se pudo obtener información del material:`, err);
        // Continuar sin la información del material
      }
    }

    // Guardar en Supabase
    const records = chunks.map((chunk, index) => ({
      courseId: job.courseId,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        ...chunk.metadata,
        pdfType,
        ocrUsed: pdfType === 'scanned',
        category: job.metadata?.category || 'other', // Incluir categoría del material
        materialId: job.metadata?.materialId, // ID del material
        unitId: materialInfo?.unit_id || undefined, // ID de la unidad
        sessionId: materialInfo?.session_id || undefined, // ID de la sesión
      },
    }));

    await saveChunksBatch(records);

    console.log(`[Chunk] ${records.length} chunks guardados en Supabase`);

    // Marcar como completado
    await updateJob(job.id, {
      status: 'completed',
    });

    // Verificar si todos los chunks están completos y actualizar material
    if (job.metadata?.materialId) {
      try {
        await checkAndUpdateMaterialCompletion(job.sourceFileId, job.metadata.materialId);
      } catch (err) {
        console.error('Error verificando completitud del material:', err);
        // No lanzar error para no interrumpir el procesamiento
      }
    }

    console.log(`[Chunk] Trabajo ${job.id} completado exitosamente`);
  } catch (error: any) {
    console.error(`[Chunk] Error procesando trabajo ${job.id}:`, error);
    await updateJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'Error desconocido',
    });
    throw error;
  }
}

/**
 * Procesa un trabajo
 */
export async function processJob(job: FileProcessingJob): Promise<void> {
  console.log(`[Worker] Procesando trabajo ${job.id} (tipo: ${job.jobType})`);

  try {
    if (job.jobType === 'split') {
      await processSplitJob(job);
    } else if (job.jobType === 'process_chunk') {
      await processChunkJob(job);
    } else {
      throw new Error(`Tipo de trabajo desconocido: ${job.jobType}`);
    }
  } catch (error: any) {
    console.error(`[Worker] Error procesando trabajo ${job.id}:`, error);
    throw error;
  }
}

/**
 * Ciclo principal del worker
 */
export async function runWorker(): Promise<void> {
  console.log('[Worker] Iniciando ciclo de procesamiento...');

  try {
    // Obtener trabajos pendientes
    const pendingJobs = await getPendingJobs();

    if (pendingJobs.length === 0) {
      console.log('[Worker] No hay trabajos pendientes');
      return;
    }

    console.log(`[Worker] Encontrados ${pendingJobs.length} trabajos pendientes`);

    // Procesar trabajos (uno a la vez para evitar sobrecarga)
    for (const job of pendingJobs) {
      try {
        await processJob(job);
      } catch (error: any) {
        console.error(`[Worker] Error procesando trabajo ${job.id}:`, error);
        // Continuar con el siguiente trabajo
      }
    }

    console.log('[Worker] Ciclo de procesamiento completado');
  } catch (error: any) {
    console.error('[Worker] Error en ciclo de procesamiento:', error);
    throw error;
  }
}

