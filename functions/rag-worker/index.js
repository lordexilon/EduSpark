/**
 * RAG Worker - Cloud Function para procesamiento de PDFs
 * Optimizado para archivos grandes (hasta 900MB)
 * Incluye procesamiento página por página para evitar "Invalid string length"
 */

const functions = require('@google-cloud/functions-framework');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

// Constantes de configuración
const MAX_FILE_SIZE = 900 * 1024 * 1024; // 900MB
const DOWNLOAD_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const PARSE_TIMEOUT = 60 * 60 * 1000; // 60 minutos para archivos muy grandes

// Inicializar clientes
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extrae texto de un PDF página por página
 * Esto evita el error "Invalid string length" con archivos grandes
 * @param {Buffer} pdfBuffer - Buffer del PDF
 * @returns {Object} - { text: string, numPages: number, pageTexts: string[] }
 */
async function extractTextPageByPage(pdfBuffer) {
    console.log('[RAG Worker] 📄 Iniciando extracción página por página...');

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    console.log(`[RAG Worker] 📄 PDF tiene ${totalPages} páginas`);

    const pageTexts = [];
    let failedPages = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
            // Crear un nuevo documento con solo esta página
            const singlePagePdf = await PDFDocument.create();
            const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
            singlePagePdf.addPage(copiedPage);

            // Convertir a buffer
            const singlePageBytes = await singlePagePdf.save();
            const singlePageBuffer = Buffer.from(singlePageBytes);

            // Extraer texto de esta página
            try {
                const pageData = await pdfParse(singlePageBuffer);
                pageTexts.push({
                    pageNum: pageNum,
                    text: pageData.text || ''
                });
            } catch (parseError) {
                console.warn(`[RAG Worker] ⚠️ Error parseando página ${pageNum}: ${parseError.message}`);
                pageTexts.push({
                    pageNum: pageNum,
                    text: ''
                });
                failedPages.push(pageNum);
            }

            // Log de progreso cada 50 páginas
            if (pageNum % 50 === 0 || pageNum === totalPages) {
                console.log(`[RAG Worker]   ✓ Procesadas ${pageNum}/${totalPages} páginas`);
            }
        } catch (pageError) {
            console.warn(`[RAG Worker] ⚠️ Error en página ${pageNum}: ${pageError.message}`);
            pageTexts.push({
                pageNum: pageNum,
                text: ''
            });
            failedPages.push(pageNum);
        }
    }

    if (failedPages.length > 0) {
        console.log(`[RAG Worker] ⚠️ ${failedPages.length} páginas no pudieron ser procesadas`);
    }

    // Combinar todo el texto
    const fullText = pageTexts.map(p => p.text).join('\n\n');

    console.log(`[RAG Worker] ✅ Extracción completada: ${fullText.length} caracteres de ${totalPages} páginas`);

    return {
        text: fullText,
        numPages: totalPages,
        pageTexts: pageTexts
    };
}

/**
 * Función principal del RAG Worker
 */
functions.http('processRagJobs', async (req, res) => {
    // Configuración para archivos grandes (hasta 900MB)
    // Manejar errores de parsing del body (Cloud Scheduler puede enviar JSON malformado)
    if (req.method === 'POST' && req.body) {
        try {
            // Intentar parsear el body si viene como string
            if (typeof req.body === 'string') {
                req.body = JSON.parse(req.body);
            }
        } catch (e) {
            // Ignorar errores de parsing, no es crítico para el procesamiento
            console.log('[RAG Worker] ⚠️ Body no parseable, continuando sin él:', e.message);
        }
    }

    let job = null; // Declarar fuera para acceso en catch

    try {
        // 1. Obtener jobs pendientes O jobs en processing que están stuck (más de 2 horas sin actualizar)
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 horas atrás

        const { data: jobs, error: jobsError } = await supabase
            .from('file_processing_jobs')
            .select('*')
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: true })
            .limit(10); // Obtener más para filtrar después

        if (jobsError) throw jobsError;

        // Filtrar jobs válidos:
        // - Jobs 'pending': siempre procesar
        // - Jobs 'processing': solo si llevan más de 2 horas sin actualizarse (stuck)
        const validJobs = (jobs || []).filter(j => {
            if (j.status === 'pending') {
                console.log(`[RAG Worker] ✅ Job pendiente encontrado: ${j.id} (${j.file_name})`);
                return true; // Siempre procesar pendientes
            }

            if (j.status === 'processing') {
                // Solo procesar si lleva más de 2 horas sin actualizarse
                const updatedAt = j.updated_at ? new Date(j.updated_at) : new Date(j.created_at);
                const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

                console.log(`[RAG Worker] 🔍 Verificando job 'processing': ${j.id}`);
                console.log(`[RAG Worker]   - Archivo: ${j.file_name}`);
                console.log(`[RAG Worker]   - Horas desde actualización: ${hoursSinceUpdate.toFixed(2)}`);

                if (hoursSinceUpdate > 2) {
                    console.log(`[RAG Worker] 🔄 Job 'processing' detectado como stuck: ${j.id}`);
                    return true; // Es un job stuck, procesarlo
                }

                console.log(`[RAG Worker] ⏸️ Job 'processing' ${j.id} está activo`);
                return false; // Está procesando activamente, no tocar
            }

            return false;
        });

        if (validJobs.length === 0) {
            console.log('[RAG Worker] No hay jobs pendientes o stuck');
            return res.status(200).json({ success: true, message: 'No pending jobs' });
        }

        job = validJobs[0];

        // Si el job estaba en 'processing' y es stuck, resetear a 'pending' antes de procesar
        if (job.status === 'processing') {
            console.log(`[RAG Worker] 🔄 Reseteando job stuck ${job.id} de 'processing' a 'pending'`);
            await supabase
                .from('file_processing_jobs')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);
            job.status = 'pending';
        }

        console.log(`[RAG Worker] ========================================`);
        console.log(`[RAG Worker] 🚀 INICIANDO PROCESAMIENTO DE JOB`);
        console.log(`[RAG Worker] Job ID: ${job.id}`);
        console.log(`[RAG Worker] Archivo: ${job.file_name}`);
        console.log(`[RAG Worker] Usuario: ${job.user_id}`);
        console.log(`[RAG Worker] ========================================`);

        // Normalizar metadata si viene como string
        if (typeof job.metadata === 'string') {
            try {
                job.metadata = JSON.parse(job.metadata);
                console.log(`[RAG Worker] ✅ Metadata parseado desde string`);
            } catch (e) {
                console.error(`[RAG Worker] ❌ Error parseando metadata:`, e);
            }
        }

        // Obtener materialId
        const materialId = job.metadata?.materialId || job.material_id;

        if (!materialId) {
            throw new Error('No se proporcionó materialId en los metadatos del job');
        }

        // Asegurar que materialId esté en metadata
        if (!job.metadata) job.metadata = {};
        if (!job.metadata.materialId) {
            job.metadata.materialId = materialId;
        }

        // 2. Marcar como processing
        const startedAt = new Date().toISOString();
        await supabase
            .from('file_processing_jobs')
            .update({
                status: 'processing',
                updated_at: startedAt,
                metadata: { ...job.metadata, startedAt }
            })
            .eq('id', job.id);

        console.log(`[RAG Worker] ✅ Job marcado como 'processing'`);

        // 2.5. Obtener información del material
        console.log(`[RAG Worker] 📋 Obteniendo información del material ${materialId}...`);
        const { data: materialData, error: materialFetchError } = await supabase
            .from('materials')
            .select('course_id, unit_id, session_id')
            .eq('id', materialId)
            .single();

        if (materialFetchError || !materialData) {
            throw new Error(`Material ${materialId} no encontrado`);
        }

        const materialInfo = materialData;
        console.log(`[RAG Worker] 📋 Material encontrado: course_id=${materialInfo.course_id}`);

        // 3. Descargar PDF
        let pdfBuffer;
        console.log(`[RAG Worker] Iniciando descarga del archivo...`);

        const isGoogleDrive = job.metadata?.source === 'google_drive' ||
            (!job.bucket_path?.includes('/') && job.metadata?.driveFileId);

        if (isGoogleDrive) {
            // Descargar desde Google Drive
            const driveFileId = job.metadata?.driveFileId || job.bucket_path || job.metadata?.sourceFileId;
            const userId = job.metadata?.userId || job.user_id;

            if (!driveFileId) throw new Error('No se encontró el ID del archivo de Google Drive');
            if (!userId) throw new Error('No se encontró el ID del usuario');

            console.log(`[RAG Worker] 📥 Descargando desde Google Drive: ${driveFileId}`);

            // Obtener token del usuario
            const { data: tokenData, error: tokenError } = await supabase
                .from('user_google_tokens')
                .select('access_token, refresh_token, expires_at')
                .eq('user_id', userId)
                .in('service_type', ['drive', 'both'])
                .single();

            if (tokenError || !tokenData) {
                throw new Error(`No se encontró token de Google Drive para el usuario ${userId}`);
            }

            const response = await axios.get(
                `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
                {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                    responseType: 'arraybuffer',
                    timeout: DOWNLOAD_TIMEOUT,
                    maxContentLength: MAX_FILE_SIZE
                }
            );

            pdfBuffer = Buffer.from(response.data);
            console.log(`[RAG Worker] ✅ Archivo descargado desde Google Drive`);

        } else {
            // Descargar desde Supabase Storage
            console.log(`[RAG Worker] 📥 Descargando desde Supabase Storage: ${job.bucket_path}`);

            if (!job.bucket_path) {
                throw new Error('No se especificó bucket_path');
            }

            const { data: fileData, error: downloadError } = await supabase.storage
                .from('course-documents')
                .download(job.bucket_path);

            if (downloadError || !fileData) {
                throw new Error(`Error descargando archivo: ${downloadError?.message}`);
            }

            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
            console.log(`[RAG Worker] ✅ Archivo descargado desde Supabase Storage`);
        }

        const actualFileSizeMB = pdfBuffer.length / (1024 * 1024);
        console.log(`[RAG Worker] PDF descargado: ${actualFileSizeMB.toFixed(2)} MB`);

        // Validar tamaño
        if (pdfBuffer.length > MAX_FILE_SIZE) {
            throw new Error(`Archivo demasiado grande: ${actualFileSizeMB.toFixed(2)}MB`);
        }

        // Validar formato PDF
        const pdfHeader = pdfBuffer.slice(0, 4).toString();
        if (pdfHeader !== '%PDF') {
            throw new Error('El archivo no es un PDF válido');
        }

        // 4. Extraer texto del PDF PÁGINA POR PÁGINA
        console.log(`[RAG Worker] Extrayendo texto del PDF de ${actualFileSizeMB.toFixed(2)}MB...`);

        let pdfResult;
        let pageTexts = [];

        // Para archivos grandes (>50MB), usar extracción página por página
        if (actualFileSizeMB > 50) {
            console.log(`[RAG Worker] 📄 Archivo grande detectado, usando extracción página por página...`);
            try {
                pdfResult = await extractTextPageByPage(pdfBuffer);
                pageTexts = pdfResult.pageTexts;
            } catch (extractError) {
                console.error(`[RAG Worker] ❌ Error en extracción página por página: ${extractError.message}`);
                throw new Error(`Error extrayendo texto del PDF: ${extractError.message}`);
            }
        } else {
            // Para archivos pequeños, usar extracción tradicional
            console.log(`[RAG Worker] 📄 Archivo pequeño, usando extracción tradicional...`);
            try {
                const pdfData = await pdfParse(pdfBuffer);
                pdfResult = {
                    text: pdfData.text,
                    numPages: pdfData.numpages
                };

                // Crear pageTexts simulados para consistencia
                const charsPerPage = Math.ceil(pdfData.text.length / pdfData.numpages);
                for (let i = 0; i < pdfData.numpages; i++) {
                    pageTexts.push({
                        pageNum: i + 1,
                        text: pdfData.text.substring(i * charsPerPage, (i + 1) * charsPerPage)
                    });
                }
            } catch (parseError) {
                console.error(`[RAG Worker] ❌ Error parseando PDF: ${parseError.message}`);
                throw new Error(`Error extrayendo texto del PDF: ${parseError.message}. El archivo puede estar corrupto, ser una imagen escaneada sin OCR, o tener un formato no soportado.`);
            }
        }

        const fullText = pdfResult.text;
        const numPages = pdfResult.numPages;

        if (!fullText || fullText.trim().length === 0) {
            throw new Error('No se pudo extraer texto del PDF');
        }

        console.log(`[RAG Worker] Texto extraído: ${fullText.length} caracteres de ${numPages} páginas`);

        // 5. Dividir en chunks con información de páginas REALES
        const chunkSize = 30000;
        const chunks = [];
        let currentChunk = '';
        let currentChunkStartPage = 1;
        let currentChunkEndPage = 1;

        for (const pageData of pageTexts) {
            const pageText = pageData.text;
            const pageNum = pageData.pageNum;

            // Si agregar esta página excede el tamaño del chunk, guardar el chunk actual
            if (currentChunk.length + pageText.length > chunkSize && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk,
                    pageStart: currentChunkStartPage,
                    pageEnd: currentChunkEndPage
                });
                currentChunk = '';
                currentChunkStartPage = pageNum;
            }

            // Agregar el texto de esta página al chunk actual
            currentChunk += (currentChunk ? '\n\n' : '') + pageText;
            currentChunkEndPage = pageNum;
        }

        // Guardar el último chunk
        if (currentChunk.length > 0) {
            chunks.push({
                content: currentChunk,
                pageStart: currentChunkStartPage,
                pageEnd: currentChunkEndPage
            });
        }

        console.log(`[RAG Worker] Creados ${chunks.length} chunks con páginas reales`);

        // 6. Generar embeddings y guardar
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        console.log(`[RAG Worker] Generando embeddings para ${chunks.length} chunks...`);

        // Actualizar metadata con total de chunks
        await supabase
            .from('file_processing_jobs')
            .update({
                metadata: {
                    ...job.metadata,
                    chunksTotal: chunks.length,
                    chunksProcessed: 0
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        const BATCH_SIZE = 10;
        let processedCount = 0;

        for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
            const batch = chunks.slice(batchStart, batchEnd);

            console.log(`[RAG Worker] 🔄 Procesando chunks ${batchStart + 1} a ${batchEnd}...`);

            const chunksToInsert = [];

            for (let i = 0; i < batch.length; i++) {
                const chunkData = batch[i];
                const chunkIndex = batchStart + i;

                try {
                    const result = await model.embedContent(chunkData.content);

                    chunksToInsert.push({
                        course_id: materialInfo.course_id,
                        unit_id: materialInfo.unit_id || null,
                        session_id: materialInfo.session_id || null,
                        content: chunkData.content,
                        embedding: result.embedding.values,
                        chunk_index: chunkIndex + 1,
                        metadata: {
                            material_id: materialId,
                            pageStart: chunkData.pageStart,
                            pageEnd: chunkData.pageEnd,
                            file_name: job.file_name,
                            chunk_size: chunkData.content.length
                        }
                    });

                    processedCount++;
                } catch (embeddingError) {
                    console.error(`[RAG Worker] ❌ Error en chunk ${chunkIndex + 1}: ${embeddingError.message}`);
                }
            }

            // Insertar chunks en Supabase
            if (chunksToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('course_content_chunks')
                    .insert(chunksToInsert);

                if (insertError) {
                    console.error(`[RAG Worker] ❌ Error insertando chunks: ${insertError.message}`);
                    throw insertError;
                }
            }

            // Actualizar progreso
            await supabase
                .from('file_processing_jobs')
                .update({
                    metadata: {
                        ...job.metadata,
                        chunksTotal: chunks.length,
                        chunksProcessed: processedCount
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);

            console.log(`[RAG Worker] ✅ ${processedCount}/${chunks.length} chunks procesados`);
        }

        // 7. Marcar como completado
        const completedAt = new Date().toISOString();
        await supabase
            .from('file_processing_jobs')
            .update({
                status: 'completed',
                completed_at: completedAt,
                updated_at: completedAt,
                metadata: {
                    ...job.metadata,
                    chunksTotal: chunks.length,
                    chunksProcessed: processedCount,
                    completedAt
                }
            })
            .eq('id', job.id);

        // Actualizar material
        await supabase
            .from('materials')
            .update({
                rag_status: 'completed',
                updated_at: completedAt
            })
            .eq('id', materialId);

        console.log(`[RAG Worker] ✅ Procesamiento completado exitosamente`);
        console.log(`[RAG Worker] Total de chunks procesados: ${processedCount}`);
        console.log(`[RAG Worker] Páginas REALES: 1-${numPages}`);

        return res.status(200).json({
            success: true,
            jobId: job.id,
            chunksProcessed: processedCount,
            totalPages: numPages,
            message: 'Procesamiento completado exitosamente'
        });

    } catch (error) {
        console.error('[RAG Worker] ❌ Error en procesamiento:', error);

        const errorMessage = error.message || error.toString();

        // Actualizar job como failed
        if (job?.id) {
            try {
                await supabase
                    .from('file_processing_jobs')
                    .update({
                        status: 'failed',
                        error: errorMessage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', job.id);

                console.log(`[RAG Worker] Job ${job.id} marcado como failed`);

                // Actualizar material si existe
                if (job.metadata?.materialId) {
                    await supabase
                        .from('materials')
                        .update({
                            rag_status: 'failed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', job.metadata.materialId);
                }
            } catch (updateError) {
                console.error('[RAG Worker] Error actualizando estado del job:', updateError);
            }
        }

        return res.status(500).json({
            success: false,
            error: errorMessage,
            jobId: job?.id
        });
    }
});
