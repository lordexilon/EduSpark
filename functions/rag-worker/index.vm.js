/**
 * RAG Worker para VM - Servidor HTTP Standalone
 * Optimizado para archivos grandes (hasta 900MB) con procesamiento PARALELO
 * v2.0 - Con paralelismo para extracción de páginas
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Configuración
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '10mb' }));

// Constantes
const MAX_FILE_SIZE = 900 * 1024 * 1024; // 900MB
const DOWNLOAD_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const PARALLEL_PAGES = 4; // Procesar 4 páginas en paralelo (más conservador para PDFs muy grandes)
const PROGRESS_UPDATE_INTERVAL = 50; // Actualizar progreso cada 50 páginas
const SPLIT_THRESHOLD_MB = 50; // Dividir PDFs > 50 MB
const PAGES_PER_CHUNK = 500; // Páginas por chunk al dividir

// Flag para evitar ejecuciones concurrentes
let isProcessing = false;
let currentJobId = null;

// Inicializar clientes
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Refresca el token de Google usando el refresh_token
 */
async function refreshGoogleToken(userId, refreshToken) {
    console.log('[RAG Worker VM] 🔄 Refrescando token de Google...');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados en .env');
    }

    const response = await axios.post('https://oauth2.googleapis.com/token',
        new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
    );

    const { access_token, expires_in } = response.data;

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    await supabase
        .from('user_google_tokens')
        .update({
            access_token: access_token,
            expires_at: expiresAt
        })
        .eq('user_id', userId);

    console.log('[RAG Worker VM] ✅ Token refrescado exitosamente');
    return access_token;
}

/**
 * Obtiene el token de acceso de Google, refrescando si es necesario
 */
async function getValidGoogleToken(userId) {
    const { data: tokenData, error } = await supabase
        .from('user_google_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .in('service_type', ['drive', 'both'])
        .single();

    if (error || !tokenData) {
        throw new Error('Token de Drive no encontrado para el usuario');
    }

    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    const now = new Date();

    if (expiresAt && expiresAt <= now) {
        if (tokenData.refresh_token) {
            return await refreshGoogleToken(userId, tokenData.refresh_token);
        } else {
            throw new Error('Token expirado y no hay refresh_token disponible');
        }
    }

    return tokenData.access_token;
}

/**
 * Divide un PDF grande usando qpdf (sin cargar todo en memoria)
 */
async function splitPDFWithQPDF(pdfPath, pagesPerChunk = PAGES_PER_CHUNK) {
    console.log(`[RAG Worker VM] 📄 Dividiendo PDF con qpdf...`);

    // 1. Obtener número total de páginas
    const { stdout: pagesOutput } = await execAsync(`qpdf --show-npages "${pdfPath}"`);
    const totalPages = parseInt(pagesOutput.trim());

    console.log(`[RAG Worker VM] Total páginas: ${totalPages}`);
    console.log(`[RAG Worker VM] Páginas por chunk: ${pagesPerChunk}`);

    const numChunks = Math.ceil(totalPages / pagesPerChunk);
    console.log(`[RAG Worker VM] Chunks a crear: ${numChunks}`);

    const chunks = [];
    const tempDir = path.join('/tmp', `pdf_chunks_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // 2. Dividir PDF en chunks
    for (let i = 0; i < numChunks; i++) {
        const start = i * pagesPerChunk + 1;
        const end = Math.min((i + 1) * pagesPerChunk, totalPages);
        const chunkPath = path.join(tempDir, `chunk_${String(i).padStart(3, '0')}.pdf`);

        console.log(`[RAG Worker VM] Creando chunk ${i + 1}/${numChunks}: páginas ${start}-${end}`);

        // qpdf divide SIN cargar todo en memoria
        await execAsync(
            `qpdf "${pdfPath}" --pages "${pdfPath}" ${start}-${end} -- "${chunkPath}"`
        );

        chunks.push({
            index: i,
            path: chunkPath,
            startPage: start,
            endPage: end,
            numPages: end - start + 1
        });
    }

    console.log(`[RAG Worker VM] ✅ ${numChunks} chunks creados`);
    return { chunks, tempDir, totalPages };
}

/**
 * Procesa un PDF dividido en chunks
 */
async function processLargePDF(pdfPath, job, materialData) {
    console.log('[RAG Worker VM] 🔨 Procesando PDF grande mediante división...');

    const { chunks, tempDir, totalPages } = await splitPDFWithQPDF(pdfPath);

    let allChunks = [];
    let totalChunksProcessed = 0;

    // Procesar cada chunk
    for (const chunk of chunks) {
        console.log(
            `[RAG Worker VM] 📦 Procesando chunk ${chunk.index + 1}/${chunks.length} ` +
            `(páginas ${chunk.startPage}-${chunk.endPage})`
        );

        // Leer chunk (solo ~40-50 MB)
        const chunkBuffer = fs.readFileSync(chunk.path);

        // Extraer texto del chunk
        const chunkData = await pdfParse(chunkBuffer);
        const pageTexts = [];

        // Dividir texto en páginas aproximadas
        const avgCharsPerPage = Math.ceil(chunkData.text.length / chunk.numPages);
        for (let i = 0; i < chunk.numPages; i++) {
            const pageStart = i * avgCharsPerPage;
            const pageEnd = (i + 1) * avgCharsPerPage;
            pageTexts.push({
                pageNum: chunk.startPage + i,
                text: chunkData.text.substring(pageStart, pageEnd)
            });
        }

        // Crear chunks de texto
        const textChunks = createTextChunks(pageTexts);

        // pageTexts ya tiene pageNum correcto (chunk.startPage + i)
        // createTextChunks usa esos pageNum directamente
        // NO necesitamos ajustar offset aquí

        allChunks.push(...textChunks);

        // Actualizar progreso
        await supabase.from('file_processing_jobs').update({
            metadata: {
                ...job.metadata,
                phase: 'extracting_chunks',
                chunksProcessed: chunk.index + 1,
                chunksTotal: chunks.length,
                totalPages: totalPages
            },
            updated_at: new Date().toISOString()
        }).eq('id', job.id);
    }

    // Limpiar archivos temporales
    console.log('[RAG Worker VM] 🧹 Limpiando archivos temporales...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(pdfPath);

    console.log(`[RAG Worker VM] ✅ Total de ${allChunks.length} chunks de texto creados`);

    return {
        chunks: allChunks,
        totalPages: totalPages
    };
}

/**
 * Crea chunks de texto a partir de páginas extraídas
 */
function createTextChunks(pageTexts, chunkSize = 30000) {
    const chunks = [];
    let currentChunk = '';
    let startPage = pageTexts[0]?.pageNum || 1;

    for (const page of pageTexts) {
        if (currentChunk.length + page.text.length > chunkSize && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk,
                pageStart: startPage,
                pageEnd: page.pageNum - 1
            });
            currentChunk = '';
            startPage = page.pageNum;
        }
        currentChunk += (currentChunk ? '\n\n' : '') + page.text;
    }

    if (currentChunk) {
        const lastPage = pageTexts[pageTexts.length - 1]?.pageNum || startPage;
        chunks.push({
            content: currentChunk,
            pageStart: startPage,
            pageEnd: lastPage
        });
    }

    return chunks;
}

/**
 * Extrae texto de una sola página
 */
async function extractSinglePage(pdfDoc, pageNum) {
    try {
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
        singlePagePdf.addPage(copiedPage);

        const singlePageBytes = await singlePagePdf.save();
        const singlePageBuffer = Buffer.from(singlePageBytes);

        try {
            const pageData = await pdfParse(singlePageBuffer);
            return { pageNum, text: pageData.text || '', success: true };
        } catch (parseError) {
            return { pageNum, text: '', success: false, error: parseError.message };
        }
    } catch (pageError) {
        return { pageNum, text: '', success: false, error: pageError.message };
    }
}

/**
 * Extrae texto de un PDF página por página CON PARALELISMO
 */
async function extractTextPageByPageParallel(pdfBuffer, jobId, jobMetadata) {
    console.log('[RAG Worker VM] 📄 Iniciando extracción PARALELA...');

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    console.log(`[RAG Worker VM] 📄 PDF tiene ${totalPages} páginas`);
    console.log(`[RAG Worker VM] ⚡ Procesando ${PARALLEL_PAGES} páginas en paralelo`);

    const pageTexts = new Array(totalPages);
    let failedPages = [];
    let processedCount = 0;

    // Procesar en batches paralelos
    for (let i = 0; i < totalPages; i += PARALLEL_PAGES) {
        const batch = [];
        const batchEnd = Math.min(i + PARALLEL_PAGES, totalPages);

        // Crear promesas para el batch actual
        for (let j = i; j < batchEnd; j++) {
            batch.push(extractSinglePage(pdfDoc, j + 1));
        }

        // Ejecutar batch en paralelo
        const results = await Promise.all(batch);

        // Guardar resultados
        for (const result of results) {
            pageTexts[result.pageNum - 1] = { pageNum: result.pageNum, text: result.text };
            if (!result.success) {
                failedPages.push(result.pageNum);
            }
        }

        processedCount = batchEnd;

        // Log y actualizar progreso cada PROGRESS_UPDATE_INTERVAL páginas
        if (processedCount % PROGRESS_UPDATE_INTERVAL === 0 || processedCount === totalPages) {
            const progress = Math.round((processedCount / totalPages) * 100);
            console.log(`[RAG Worker VM] ✓ Páginas: ${processedCount}/${totalPages} (${progress}%)`);

            // Actualizar progreso en la DB
            await supabase.from('file_processing_jobs').update({
                metadata: {
                    ...jobMetadata,
                    pagesProcessed: processedCount,
                    totalPages: totalPages,
                    phase: 'extracting'
                },
                updated_at: new Date().toISOString()
            }).eq('id', jobId);
        }
    }

    if (failedPages.length > 0) {
        console.log(`[RAG Worker VM] ⚠️ ${failedPages.length} páginas no pudieron ser procesadas`);
    }

    console.log(`[RAG Worker VM] ✅ Extracción completada: ${totalPages} páginas`);

    const fullText = pageTexts.map(p => p?.text || '').join('\n\n');
    return {
        text: fullText,
        numPages: totalPages,
        pageTexts: pageTexts.filter(p => p) // Filtrar nulls
    };
}

/**
 * Lógica principal de procesamiento
 */
async function processRagJobs() {
    if (isProcessing) {
        console.log(`[RAG Worker VM] ⏸️ Ya hay un job en proceso (${currentJobId}), saltando...`);
        return { success: true, message: 'Already processing', currentJobId };
    }

    console.log('[RAG Worker VM] 🔍 Buscando jobs pendientes...');

    let job = null;

    try {
        const now = new Date();

        const { data: jobs, error: jobsError } = await supabase
            .from('file_processing_jobs')
            .select('*')
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: true })
            .limit(10);

        if (jobsError) throw jobsError;

        const validJobs = (jobs || []).filter(j => {
            if (j.status === 'pending') return true;
            if (j.status === 'processing') {
                const updatedAt = j.updated_at ? new Date(j.updated_at) : new Date(j.created_at);
                const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
                return hoursSinceUpdate > 2;
            }
            return false;
        });

        if (validJobs.length === 0) {
            console.log('[RAG Worker VM] No hay jobs pendientes');
            return { success: true, message: 'No pending jobs' };
        }

        job = validJobs[0];

        isProcessing = true;
        currentJobId = job.id;

        console.log(`[RAG Worker VM] 🚀 Procesando job ${job.id} (${job.file_name})`);

        if (typeof job.metadata === 'string') {
            try { job.metadata = JSON.parse(job.metadata); } catch (e) { }
        }

        await supabase.from('file_processing_jobs').update({
            status: 'processing',
            updated_at: new Date().toISOString()
        }).eq('id', job.id);

        const materialId = job.metadata?.materialId || job.material_id;
        const { data: materialData } = await supabase
            .from('materials')
            .select('*')
            .eq('id', materialId)
            .single();

        if (!materialData) throw new Error(`Material ${materialId} no encontrado`);

        // Descargar PDF
        let pdfBuffer;
        if (job.metadata?.source === 'google_drive') {
            const driveFileId = job.metadata?.driveFileId || job.bucket_path;
            const userId = job.metadata?.userId || job.user_id;
            console.log(`[RAG Worker VM] 📥 Descargando de Drive: ${driveFileId}`);

            const accessToken = await getValidGoogleToken(userId);

            const response = await axios.get(
                `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    responseType: 'arraybuffer',
                    timeout: DOWNLOAD_TIMEOUT,
                    maxContentLength: MAX_FILE_SIZE
                }
            );
            pdfBuffer = Buffer.from(response.data);
            console.log(`[RAG Worker VM] ✅ Descarga: ${(pdfBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
        } else {
            console.log(`[RAG Worker VM] 📥 Descargando de Storage: ${job.bucket_path}`);
            const { data: fileData, error: dlError } = await supabase.storage
                .from('course-documents')
                .download(job.bucket_path);

            if (dlError) throw dlError;
            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
        }

        // Procesar PDF
        const fileSizeMB = pdfBuffer.length / (1024 * 1024);
        console.log(`[RAG Worker VM] PDF tamaño: ${fileSizeMB.toFixed(2)} MB`);

        let chunks;
        let totalPages;

        // Verificar si este material ya tiene chunks procesados (resume desde crash)
        const { data: existingChunks, error: chunksError } = await supabase
            .from('course_content_chunks')
            .select('id, content, page_start, page_end')
            .eq('material_id', materialId)
            .limit(10);

        const hasExistingChunks = existingChunks && existingChunks.length > 0;

        if (hasExistingChunks) {
            console.log(`[RAG Worker VM] ⚠️ Detectados ${existingChunks.length} chunks existentes. Verificando si necesita embeddings...`);

            // Contar chunks sin embeddings
            const { count: chunksWithoutEmbeddings } = await supabase
                .from('course_content_chunks')
                .select('id', { count: 'exact', head: true })
                .eq('material_id', materialId)
                .is('embedding', null);

            if (chunksWithoutEmbeddings === 0) {
                console.log(`[RAG Worker VM] ✅ Material ya completamente procesado. Marcando job como completado.`);

                await supabase.from('file_processing_jobs').update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    metadata: { ...job.metadata, phase: 'completed' }
                }).eq('id', job.id);

                await supabase.from('materials').update({ rag_status: 'completed' }).eq('id', materialId);

                return { success: true, message: 'Material already fully processed' };
            }

            console.log(`[RAG Worker VM] 🔄 Encontrados ${chunksWithoutEmbeddings} chunks sin embeddings. Saltando extracción...`);

            // Obtener TODOS los chunks para generar embeddings
            const { data: allChunks } = await supabase
                .from('course_content_chunks')
                .select('id, content, page_start, page_end')
                .eq('material_id', materialId)
                .order('page_start', { ascending: true });

            chunks = allChunks.map(c => ({
                content: c.content,
                pageStart: c.page_start,
                pageEnd: c.page_end,
                chunkId: c.id // Importante: guardamos el ID para actualizar después
            }));

            // Obtener total de páginas del último chunk
            totalPages = allChunks[allChunks.length - 1]?.page_end || 0;

            console.log(`[RAG Worker VM] ✅ Cargados ${chunks.length} chunks existentes para generar embeddings`);

        } else {
            console.log(`[RAG Worker VM] 📄 No hay chunks existentes. Procesando PDF completo...`);

            // Decidir estrategia según tamaño
            if (fileSizeMB > SPLIT_THRESHOLD_MB) {
                console.log(`[RAG Worker VM] �� Archivo grande (>${SPLIT_THRESHOLD_MB}MB), usando qpdf para división...`);

                // Guardar PDF temporalmente para qpdf
                const tempPdfPath = path.join('/tmp', `temp_${job.id}.pdf`);
                fs.writeFileSync(tempPdfPath, pdfBuffer);

                // Procesar con división
                const result = await processLargePDF(tempPdfPath, job, materialData);
                chunks = result.chunks;
                totalPages = result.totalPages;

            } else {
                console.log(`[RAG Worker VM] Archivo pequeño (<${SPLIT_THRESHOLD_MB}MB), procesamiento normal...`);

                let pdfResult;
                // Usar extracción paralela para archivos medianos
                if (fileSizeMB > 20) {
                    pdfResult = await extractTextPageByPageParallel(pdfBuffer, job.id, job.metadata);
                } else {
                    // Para archivos pequeños, usar el método simple
                    const data = await pdfParse(pdfBuffer);
                    pdfResult = { text: data.text, numPages: data.numpages, pageTexts: [] };
                    const charsPerPage = Math.ceil(data.text.length / data.numpages);
                    for (let i = 0; i < data.numpages; i++) {
                        pdfResult.pageTexts.push({
                            pageNum: i + 1,
                            text: data.text.substring(i * charsPerPage, (i + 1) * charsPerPage)
                        });
                    }
                }

                console.log(`[RAG Worker VM] ✅ Texto extraído: ${pdfResult.numPages} páginas`);
                totalPages = pdfResult.numPages;

                // Crear chunks de texto
                chunks = createTextChunks(pdfResult.pageTexts, 30000);
            }

            console.log(`[RAG Worker VM] ✅ Creados ${chunks.length} chunks de texto`);
        }

        // Actualizar metadata con fase de embedding
        await supabase.from('file_processing_jobs').update({
            metadata: { ...job.metadata, chunksTotal: chunks.length, phase: 'embedding', pagesProcessed: totalPages, totalPages: totalPages },
            updated_at: new Date().toISOString()
        }).eq('id', job.id);

        // Embeddings en batches
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        let processedCount = 0;
        const BATCH_SIZE = 10; // Aumentado para mayor velocidad

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const chunksToInsert = [];

            // Procesar embeddings en paralelo dentro del batch
            const embeddingPromises = batch.map(async (chunk, j) => {
                try {
                    const result = await model.embedContent(chunk.content);
                    return {
                        course_id: materialData.course_id,
                        unit_id: materialData.unit_id,
                        session_id: materialData.session_id,
                        content: chunk.content,
                        embedding: result.embedding.values,
                        chunk_index: i + j + 1,
                        metadata: {
                            material_id: materialId,
                            pageStart: chunk.pageStart,
                            pageEnd: chunk.pageEnd,
                            file_name: job.file_name
                        }
                    };
                } catch (e) {
                    console.error(`[RAG Worker VM] Error embedding chunk ${i + j + 1}: ${e.message}`);
                    return null;
                }
            });

            const results = await Promise.all(embeddingPromises);
            const validChunks = results.filter(r => r !== null);

            if (validChunks.length > 0) {
                await supabase.from('course_content_chunks').insert(validChunks);
            }

            processedCount += validChunks.length;
            const progress = Math.round((processedCount / chunks.length) * 100);
            console.log(`[RAG Worker VM] 📊 Embeddings: ${processedCount}/${chunks.length} (${progress}%)`);

            await supabase.from('file_processing_jobs').update({
                metadata: { ...job.metadata, chunksProcessed: processedCount, chunksTotal: chunks.length, phase: 'embedding' },
                updated_at: new Date().toISOString()
            }).eq('id', job.id);
        }

        // Finalizar
        const { error: jobUpdateError } = await supabase.from('file_processing_jobs').update({
            status: 'completed',
            metadata: { ...job.metadata, phase: 'completed', chunksProcessed: (job.metadata?.chunksTotal || chunks.length) },
            updated_at: new Date().toISOString()
        }).eq('id', job.id);

        if (jobUpdateError) {
            console.error(`[RAG Worker VM] ❌ Error actualizando job a completed:`, jobUpdateError.message);
        } else {
            console.log(`[RAG Worker VM] ✅ Job ${job.id} marcado como completed en DB`);
        }

        const { error: materialUpdateError } = await supabase.from('materials').update({
            rag_status: 'completed'
        }).eq('id', materialId);

        if (materialUpdateError) {
            console.error(`[RAG Worker VM] ❌ Error actualizando material:`, materialUpdateError.message);
        }

        console.log(`[RAG Worker VM] ✅ Job ${job.id} completado!`);

        isProcessing = false;
        currentJobId = null;

        return { success: true, jobId: job.id };

    } catch (error) {
        console.error('[RAG Worker VM] ❌ Error fatal:', error);
        if (job) {
            await supabase.from('file_processing_jobs').update({
                status: 'failed',
                error: error.message,
                updated_at: new Date().toISOString()
            }).eq('id', job.id);

            if (job.metadata?.materialId) {
                await supabase.from('materials').update({
                    rag_status: 'failed',
                    updated_at: new Date().toISOString()
                }).eq('id', job.metadata.materialId);
            }
        }

        isProcessing = false;
        currentJobId = null;

        return { success: false, error: error.message };
    }
}

// Endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '2.0-parallel',
        timestamp: new Date().toISOString(),
        isProcessing,
        currentJobId,
        config: {
            parallelPages: PARALLEL_PAGES,
            batchSize: 10
        }
    });
});

app.post('/', async (req, res) => {
    const result = await processRagJobs();
    res.json(result);
});

app.get('/', async (req, res) => {
    const result = await processRagJobs();
    res.json(result);
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`[RAG Worker VM] ✅ Servidor v2.0-parallel escuchando en puerto ${PORT}`);
    console.log(`[RAG Worker VM] ⚡ Paralelismo: ${PARALLEL_PAGES} páginas simultáneas`);
    console.log(`[RAG Worker VM] Config: Supabase=${process.env.SUPABASE_URL ? '✓' : '✗'} OAuth=${process.env.GOOGLE_CLIENT_ID ? '✓' : '✗'}`);

    await processRagJobs();

    setInterval(async () => {
        await processRagJobs();
    }, 2 * 60 * 1000);
});
