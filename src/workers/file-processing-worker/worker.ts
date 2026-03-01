// workers/file-processing-worker/worker.ts
// Lógica principal del worker

import { getPendingJobs, updateJob, createChildJobs, getJob } from './firestoreService';
import { downloadFile, getFileMetadata } from './driveService';
import { detectPdfType, countPdfPages, extractTextFromPages, type PageContent } from './pdfProcessor';
import { processPagesIntoChunks, processTextIntoChunks } from './chunkProcessor';
import { generateEmbeddingsBatch } from './geminiService';
import { saveChunksBatch } from './supabaseService';
import { updateMaterialRagStatus, getMaterialInfo } from './materialService';
import { checkAndUpdateMaterialCompletion } from './jobCompletionService';
import type { FileProcessingJob, PdfType } from './fileProcessing';

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '25', 10);

/**
 * Procesa un trabajo de tipo 'split'
 * MEJORADO: Validaciones adicionales para asegurar procesamiento completo
 */
async function processSplitJob(job: FileProcessingJob): Promise<void> {
  console.log(`[Split] Procesando trabajo ${job.id} para archivo ${job.sourceFileName}`);

  try {
    // VALIDAR: sourceFileName debe estar presente
    if (!job.sourceFileName) {
      throw new Error('sourceFileName es requerido para procesar el archivo');
    }

    // Determinar fuente del archivo
    const source = job.metadata?.source || 'bucket';
    const userId = job.metadata?.userId;
    const driveFileId = job.metadata?.driveFileId;

    console.log(`[Split] Fuente del archivo: ${source}, sourceFileName: "${job.sourceFileName}"`);

    // Descargar archivo para análisis
    let fileBuffer: Buffer;

    if (source === 'google_drive' && driveFileId && userId) {
      console.log(`[Split] Descargando desde Google Drive: ${driveFileId}`);
      fileBuffer = await downloadFile(driveFileId, 'google_drive', userId);
    } else if (job.sourceFileId) {
      console.log(`[Split] Descargando desde Supabase Storage: ${job.sourceFileId}`);
      fileBuffer = await downloadFile(job.sourceFileId, 'bucket');
    } else {
      throw new Error('No se pudo determinar la fuente del archivo');
    }

    // VALIDAR: El archivo debe tener contenido
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('El archivo descargado está vacío o no se pudo descargar correctamente');
    }

    console.log(`[Split] Archivo descargado: ${fileBuffer.length} bytes`);

    // Detectar tipo y contar páginas
    const pdfType = await detectPdfType(fileBuffer);
    const totalPages = await countPdfPages(fileBuffer);

    // VALIDAR: El PDF debe tener páginas
    if (totalPages === 0) {
      throw new Error('No se pudieron detectar páginas en el PDF. El archivo puede estar corrupto.');
    }

    console.log(`[Split] Archivo: ${job.sourceFileName}, Tipo: ${pdfType}, Páginas: ${totalPages}`);

    // ADVERTENCIA: Si el PDF tiene muy pocas páginas, puede ser un archivo incompleto
    if (totalPages < 50 && job.sourceFileName.toLowerCase().includes('williams')) {
      console.warn(`[Split] ⚠️ ADVERTENCIA: El PDF "${job.sourceFileName}" tiene solo ${totalPages} páginas. Williams Ginecología debería tener ~995 páginas. Verifica que el archivo esté completo.`);
    }

    // Actualizar trabajo con información
    await updateJob(job.id, {
      totalPages,
      pdfType,
      status: 'processing',
    });

    // Crear trabajos hijos
    const childJobs: Array<Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const numChunks = Math.ceil(totalPages / CHUNK_SIZE);

    console.log(`[Split] Creando ${numChunks} trabajos hijos para procesar ${totalPages} páginas (${CHUNK_SIZE} páginas por chunk)`);

    for (let i = 0; i < numChunks; i++) {
      const pageStart = i * CHUNK_SIZE + 1;
      const pageEnd = Math.min((i + 1) * CHUNK_SIZE, totalPages);

      childJobs.push({
        status: 'pending',
        jobType: 'process_chunk',
        sourceFileId: job.sourceFileId,
        sourceFileName: job.sourceFileName, // CRÍTICO: Asegurar que sourceFileName se pasa a todos los child jobs
        courseId: job.courseId,
        pageStart,
        pageEnd,
        pdfType,
        metadata: {
          ...job.metadata, // Incluir materialId, userId, etc.
        },
      });
    }

    // VALIDAR: Debe haber al menos un child job
    if (childJobs.length === 0) {
      throw new Error('No se pudieron crear trabajos hijos. El PDF puede estar vacío.');
    }

    console.log(`[Split] Creando ${childJobs.length} trabajos hijos...`);
    await createChildJobs(childJobs);

    // Marcar trabajo como completado
    await updateJob(job.id, {
      status: 'completed',
      chunksCreated: childJobs.length,
    });

    console.log(`[Split] ✅ Trabajo ${job.id} completado. Creados ${childJobs.length} trabajos hijos para procesar ${totalPages} páginas.`);
  } catch (error: any) {
    console.error(`[Split] ❌ Error procesando trabajo ${job.id}:`, error);
    await updateJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'Error desconocido',
    });
    throw error;
  }
}

/**
 * Procesa un trabajo de tipo 'process_chunk'
 * MEJORADO: Validaciones adicionales para asegurar que sourceFileName se guarda
 */
async function processChunkJob(job: FileProcessingJob): Promise<void> {
  if (!job.pageStart || !job.pageEnd) {
    throw new Error('pageStart y pageEnd son requeridos para process_chunk');
  }

  // VALIDAR: sourceFileName debe estar presente
  if (!job.sourceFileName) {
    console.error(`[Chunk] ❌ ERROR: job.sourceFileName es undefined para trabajo ${job.id}`);
    throw new Error('sourceFileName es requerido para procesar chunks');
  }

  console.log(
    `[Chunk] Procesando trabajo ${job.id}: páginas ${job.pageStart}-${job.pageEnd} de ${job.sourceFileName}`
  );

  try {
    // Marcar como procesando
    await updateJob(job.id, {
      status: 'processing',
    });

    // Determinar fuente del archivo (bucket o Google Drive)
    const source = job.metadata?.source || 'bucket';
    const userId = job.metadata?.userId;
    const driveFileId = job.metadata?.driveFileId;

    console.log(`[Chunk] Fuente del archivo: ${source}, sourceFileName: "${job.sourceFileName}"`);

    // Descargar archivo desde la fuente correcta
    let fileBuffer: Buffer;

    if (source === 'google_drive' && driveFileId && userId) {
      console.log(`[Chunk] Descargando desde Google Drive: ${driveFileId}`);
      fileBuffer = await downloadFile(driveFileId, 'google_drive', userId);
    } else if (job.sourceFileId) {
      // Supabase Storage (bucketPath en sourceFileId)
      console.log(`[Chunk] Descargando desde Supabase Storage: ${job.sourceFileId}`);
      fileBuffer = await downloadFile(job.sourceFileId, 'bucket');
    } else {
      throw new Error('No se pudo determinar la fuente del archivo');
    }

    // VALIDAR: El archivo debe tener contenido
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('El archivo descargado está vacío o no se pudo descargar correctamente');
    }

    // Extraer texto del rango de páginas
    const pdfType = job.pdfType || 'unknown';
    const pages = await extractTextFromPages(fileBuffer, job.pageStart, job.pageEnd, pdfType);

    if (!pages || pages.length === 0) {
      throw new Error('No se pudo extraer texto de las páginas especificadas');
    }

    // Calcular el total de caracteres para el log
    const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);

    // Dividir en chunks preservando números de página
    const chunks = processPagesIntoChunks(pages, {
      sourceFileName: job.sourceFileName,
    });

    console.log(`[Chunk] Texto extraído: ${totalChars} caracteres en ${pages.length} páginas, dividido en ${chunks.length} chunks`);
    console.log(`[Chunk] ✅ sourceFileName usado: "${job.sourceFileName}"`);

    // VALIDAR: Verificar que chunks tienen sourceFileName en metadata
    if (chunks.length > 0 && !chunks[0].metadata.sourceFileName) {
      console.error(`[Chunk] ❌ ERROR: chunks no tienen sourceFileName en metadata!`);
      throw new Error('Los chunks generados no tienen sourceFileName en metadata');
    }

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
    // CRÍTICO: Asegurar que sourceFileName se incluye explícitamente en metadata
    const records = chunks.map((chunk, index) => {
      // VALIDAR: Verificar que chunk.metadata tiene sourceFileName
      if (!chunk.metadata.sourceFileName) {
        console.error(`[Chunk] ❌ ERROR: chunk.metadata no tiene sourceFileName para chunk ${index}`);
        throw new Error(`Chunk ${index} no tiene sourceFileName en metadata`);
      }

      return {
        courseId: job.courseId,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: {
          ...chunk.metadata, // Esto incluye sourceFileName, pageStart, pageEnd, chunkIndex
          pdfType,
          ocrUsed: pdfType === 'scanned',
          category: job.metadata?.category || 'other',
          material_id: job.metadata?.materialId, // Priorizar underscores para sistema RAG
          materialId: job.metadata?.materialId,  // Alias para compatibilidad con UI
          unit_id: materialInfo?.unit_id || undefined,
          session_id: materialInfo?.session_id || undefined,
          unitId: materialInfo?.unit_id || undefined,    // Alias camelCase
          sessionId: materialInfo?.session_id || undefined // Alias camelCase
        },
      };
    });

    // VALIDAR: Verificar que sourceFileName está en los records antes de guardar
    const firstRecord = records[0];
    if (firstRecord?.metadata?.sourceFileName) {
      console.log(`[Chunk] ✅ sourceFileName confirmado en records: "${firstRecord.metadata.sourceFileName}"`);
    } else {
      console.error(`[Chunk] ❌ ERROR: sourceFileName NO está en records!`, {
        hasMetadata: !!firstRecord?.metadata,
        metadataKeys: firstRecord?.metadata ? Object.keys(firstRecord.metadata) : [],
        chunkMetadataKeys: chunks[0]?.metadata ? Object.keys(chunks[0].metadata) : [],
      });
      throw new Error('sourceFileName no está presente en los records antes de guardar');
    }

    await saveChunksBatch(records);

    console.log(`[Chunk] ✅ ${records.length} chunks guardados en Supabase con sourceFileName: "${job.sourceFileName}"`);

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

    console.log(`[Chunk] ✅ Trabajo ${job.id} completado exitosamente`);
  } catch (error: any) {
    console.error(`[Chunk] ❌ Error procesando trabajo ${job.id}:`, error);
    await updateJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'Error desconocido',
    });
    throw error;
  }
}

/**
 * Procesa un trabajo de tipo 'index_text_content'
 */
export async function processTextContentJob(job: FileProcessingJob): Promise<void> {
  console.log(`[TextContent] Procesando trabajo ${job.id} para contenido directo`);

  try {
    if (!job.textContent) {
      throw new Error('No se proporcionó contenido de texto (textContent)');
    }

    // Marcar como procesando (opcional para jobs directos)
    try {
      await updateJob(job.id, {
        status: 'processing',
      });
    } catch (err) {
      // Ignorar error si no hay credenciales de Firestore (procesamiento directo)
      console.log('[TextContent] Skipping Firestore update (direct processing)');
    }

    // Limpiar HTML si es necesario
    const cleanText = job.textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    if (!cleanText || cleanText.length === 0) {
      throw new Error('El contenido de texto está vacío después de limpiar');
    }

    // Dividir en chunks
    const chunks = processTextIntoChunks(cleanText, {
      sourceFileName: job.sourceFileName || 'Contenido Directo',
      pageStart: 1,
      pageEnd: 1,
    });

    console.log(`[TextContent] Texto procesado: ${cleanText.length} caracteres, dividido en ${chunks.length} chunks`);

    // Generar embeddings
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    console.log(`[TextContent] Embeddings generados: ${embeddings.length}`);

    // Guardar en Supabase
    const records = chunks.map((chunk, index) => ({
      courseId: job.courseId,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        ...chunk.metadata,
        category: job.metadata?.category || 'other',
        materialId: job.metadata?.materialId,
      },
    }));

    await saveChunksBatch(records);

    console.log(`[TextContent] ${records.length} chunks guardados en Supabase`);

    // Marcar como completado
    try {
      await updateJob(job.id, {
        status: 'completed',
      });
    } catch (err) {
      console.log('[TextContent] Skipping Firestore update (direct processing)');
    }

    console.log(`[TextContent] Trabajo ${job.id} completado exitosamente`);
  } catch (error: any) {
    console.error(`[TextContent] Error procesando trabajo ${job.id}:`, error);
    try {
      await updateJob(job.id, {
        status: 'failed',
        errorMessage: error.message || 'Error desconocido',
      });
    } catch (err) {
      console.log('[TextContent] Skipping Firestore update (direct processing)');
    }
    throw error;
  }
}

/**
 * Procesa un trabajo según su tipo
 */
export async function processJob(job: FileProcessingJob): Promise<void> {
  console.log(`[Worker] Procesando trabajo ${job.id} de tipo ${job.jobType}`);

  switch (job.jobType) {
    case 'split':
      await processSplitJob(job);
      break;
    case 'process_chunk':
      await processChunkJob(job);
      break;
    case 'index_text_content':
      await processTextContentJob(job);
      break;
  }
}

/**
 * Función principal del worker que busca y procesa trabajos pendientes
 */
export async function runWorker(): Promise<void> {
  try {
    const pendingJobs = await getPendingJobs();

    if (pendingJobs.length === 0) {
      // No loggear cada vez para no llenar los logs
      // console.log('[Worker] No hay trabajos pendientes');
      return;
    }

    console.log(`[Worker] Encontrados ${pendingJobs.length} trabajos pendientes`);

    for (const job of pendingJobs) {
      try {
        await processJob(job);
      } catch (error) {
        console.error(`[Worker] Error FATAL procesando trabajo ${job.id}:`, error);
        // Continuar con el siguiente trabajo
      }
    }
  } catch (error) {
    console.error('[Worker] Error en el ciclo principal:', error);
  }
}
