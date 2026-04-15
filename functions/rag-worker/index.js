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
 * Genera embeddings en lote usando Gemini REST API
 * (Usamos REST para soportar parámetros nuevos como outputDimensionality en versiones antiguas del SDK)
 */
async function generateEmbeddingsBatch(texts, title) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`;
        
        const requests = texts.map(text => ({
            model: 'models/text-embedding-004',
            taskType: 'RETRIEVAL_DOCUMENT',
            title: title || 'Documento',
            content: { parts: [{ text }] },
            outputDimensionality: 512
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en batch embedding: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.embeddings.map(e => e.values);
    } catch (error) {
        console.error('[RAG Worker] ❌ Error generando embeddings en lote:', error.message);
        throw error;
    }
}

/**
 * Extrae texto de una sola página (para paralelismo)
 */
async function extractSinglePage(pdfDoc, pageNum) {
    try {
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
        singlePagePdf.addPage(copiedPage);
        const singlePageBytes = await singlePagePdf.save();
        const singlePageBuffer = Buffer.from(singlePageBytes);
        const pageData = await pdfParse(singlePageBuffer);
        return { pageNum, text: pageData.text || '', success: true };
    } catch (e) {
        console.warn(`[RAG Worker] ⚠️ Error en página ${pageNum}: ${e.message}`);
        return { pageNum, text: '', success: false };
    }
}

/**
 * Extrae texto de un PDF página por página CON PARALELISMO
 */
async function extractTextPageByPage(pdfBuffer) {
    console.log('[RAG Worker] 📄 Iniciando extracción PARALELA...');

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    const PARALLEL_BATCH = 5; // Procesar 5 páginas a la vez
    
    console.log(`[RAG Worker] 📄 PDF tiene ${totalPages} páginas. Batch size: ${PARALLEL_BATCH}`);

    const pageTexts = new Array(totalPages);
    let failedPages = [];

    for (let i = 0; i < totalPages; i += PARALLEL_BATCH) {
        const batch = [];
        for (let j = i; j < Math.min(i + PARALLEL_BATCH, totalPages); j++) {
            batch.push(extractSinglePage(pdfDoc, j + 1));
        }
        
        const results = await Promise.all(batch);
        for (const res of results) {
            pageTexts[res.pageNum - 1] = { pageNum: res.pageNum, text: res.text };
            if (!res.success) failedPages.push(res.pageNum);
        }

        if ((i + PARALLEL_BATCH) % 50 === 0 || (i + PARALLEL_BATCH) >= totalPages) {
            console.log(`[RAG Worker]   ✓ Procesadas ${Math.min(i + PARALLEL_BATCH, totalPages)}/${totalPages} páginas`);
        }
    }

    if (failedPages.length > 0) {
        console.log(`[RAG Worker] ⚠️ ${failedPages.length} páginas no pudieron ser procesadas`);
    }

    const fullText = pageTexts.map(p => p.text).join('\n\n');
    console.log(`[RAG Worker] ✅ Extracción completada: ${fullText.length} caracteres`);

    return { text: fullText, numPages: totalPages, pageTexts };
}

/**
 * Función principal del RAG Worker
 */
functions.http('processRagJobs', async (req, res) => {
    // ========================================
    // CORS Configuration
    // ========================================
    const origin = req.headers.origin;
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
    res.set('Access-Control-Max-Age', '3600');

    if (origin) {
        res.set('Access-Control-Allow-Origin', origin);
    } else {
        res.set('Access-Control-Allow-Origin', '*');
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    // Configuración para archivos grandes (hasta 900MB)
    if (req.method === 'POST' && req.body) {
        try {
            if (typeof req.body === 'string') {
                req.body = JSON.parse(req.body);
            }
        } catch (e) {
            console.log('[RAG Worker] ⚠️ Body no parseable, continuando sin él:', e.message);
        }
    }

    let job = null;

    console.log('[RAG Worker] ========================================');
    console.log('[RAG Worker] 🚀 Iniciando ejecución del worker');
    console.log('[RAG Worker] 🤖 GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Configurado ✅' : 'NO CONFIGURADO ❌');
    console.log('[RAG Worker] ========================================');

    try {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        console.log('[RAG Worker] 🔍 Consultando jobs en Supabase...');

        const { data: jobs, error: jobsError } = await supabase
            .from('file_processing_jobs')
            .select('*')
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: true })
            .limit(10);

        if (jobsError) {
            console.error('[RAG Worker] ❌ Error consultando jobs:', jobsError);
            throw jobsError;
        }

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
            console.log('[RAG Worker] No hay jobs pendientes o stuck');
            return res.status(200).json({ success: true, message: 'No pending jobs' });
        }

        job = validJobs[0];

        if (job.status === 'processing') {
            await supabase
                .from('file_processing_jobs')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);
            job.status = 'pending';
        }

        console.log(`[RAG Worker] 🚀 PROCESANDO: ${job.file_name} (${job.id})`);

        if (typeof job.metadata === 'string') {
            try { job.metadata = JSON.parse(job.metadata); } catch (e) { }
        }

        const materialId = job.metadata?.materialId || job.material_id;
        if (!materialId) throw new Error('No se proporcionó materialId');

        if (!job.metadata) job.metadata = {};
        if (!job.metadata.materialId) job.metadata.materialId = materialId;

        const startedAt = new Date().toISOString();
        job.metadata = { ...job.metadata, startedAt };
        await supabase
            .from('file_processing_jobs')
            .update({
                status: 'processing',
                updated_at: startedAt,
                metadata: job.metadata
            })
            .eq('id', job.id);

        const { data: materialData, error: materialFetchError } = await supabase
            .from('materials')
            .select('course_id, unit_id, session_id')
            .eq('id', materialId)
            .single();

        if (materialFetchError || !materialData) throw new Error(`Material ${materialId} no encontrado`);
        const materialInfo = materialData;

        let pdfBuffer;
        const isGoogleDrive = job.metadata?.source === 'google_drive' || (!job.bucket_path?.includes('/') && job.metadata?.driveFileId);

        if (isGoogleDrive) {
            const driveFileId = job.metadata?.driveFileId || job.bucket_path || job.metadata?.sourceFileId;
            const userId = job.metadata?.userId || job.user_id;

            const { data: tokenData, error: tokenError } = await supabase
                .from('user_google_tokens')
                .select('access_token')
                .eq('user_id', userId)
                .in('service_type', ['drive', 'both'])
                .single();

            if (tokenError || !tokenData) throw new Error(`No se encontró token de Google Drive`);

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
        } else {
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('course-documents')
                .download(job.bucket_path);
            if (downloadError || !fileData) throw new Error(`Error descargando archivo`);
            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
        }

        const actualFileSizeMB = pdfBuffer.length / (1024 * 1024);
        if (pdfBuffer.length > MAX_FILE_SIZE) throw new Error(`Archivo demasiado grande`);

        let pdfResult;
        let pageTexts = [];

        if (actualFileSizeMB > 50) {
            pdfResult = await extractTextPageByPage(pdfBuffer);
            pageTexts = pdfResult.pageTexts;
        } else {
            const pdfData = await pdfParse(pdfBuffer);
            pdfResult = { text: pdfData.text, numPages: pdfData.numpages };
            const charsPerPage = Math.ceil(pdfData.text.length / pdfData.numpages);
            for (let i = 0; i < pdfData.numpages; i++) {
                pageTexts.push({
                    pageNum: i + 1,
                    text: pdfData.text.substring(i * charsPerPage, (i + 1) * charsPerPage)
                });
            }
        }

        const fullText = pdfResult.text;
        const numPages = pdfResult.numPages;
        if (!fullText || fullText.trim().length === 0) throw new Error('No se pudo extraer texto');

        const chunkSize = 30000;
        const chunks = [];
        let currentChunk = '';
        let currentChunkStartPage = 1;
        let currentChunkEndPage = 1;

        for (const pageData of pageTexts) {
            const pageText = pageData.text;
            const pageNum = pageData.pageNum;
            if (currentChunk.length + pageText.length > chunkSize && currentChunk.length > 0) {
                chunks.push({ content: currentChunk, pageStart: currentChunkStartPage, pageEnd: currentChunkEndPage });
                currentChunk = '';
                currentChunkStartPage = pageNum;
            }
            currentChunk += (currentChunk ? '\n\n' : '') + pageText;
            currentChunkEndPage = pageNum;
        }
        if (currentChunk.length > 0) {
            chunks.push({ content: currentChunk, pageStart: currentChunkStartPage, pageEnd: currentChunkEndPage });
        }

        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

        // RESUMABLE: Contar chunks existentes en lugar de borrar
        const { count: existingChunks } = await supabase
            .from('course_content_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('metadata->>material_id', materialId);

        const startFromChunk = existingChunks || 0;
        console.log(`[RAG Worker] 📊 Chunks existentes: ${startFromChunk}/${chunks.length}`);

        if (startFromChunk >= chunks.length) {
            console.log(`[RAG Worker] ✅ Todos los chunks ya fueron procesados!`);
            const completedAt = new Date().toISOString();
            await supabase.from('file_processing_jobs').update({
                status: 'completed',
                completed_at: completedAt,
                metadata: { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: chunks.length }
            }).eq('id', job.id);
            await supabase.from('materials').update({ rag_status: 'completed', updated_at: completedAt }).eq('id', materialId);
            return res.status(200).json({ success: true, jobId: job.id, message: 'Already completed' });
        }

        job.metadata = { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: startFromChunk };
        await supabase.from('file_processing_jobs').update({
            metadata: job.metadata,
            updated_at: new Date().toISOString()
        }).eq('id', job.id);

        const BATCH_SIZE = 10; // Batch más grande para mayor velocidad
        let processedCount = startFromChunk;

        for (let batchStart = startFromChunk; batchStart < chunks.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
            const batch = chunks.slice(batchStart, batchEnd);
            const chunksToInsert = [];

            console.log(`[RAG Worker] 🧠 Generando embeddings para lote ${batchStart}-${batchEnd}...`);
            
            try {
                const batchTexts = batch.map(c => c.content);
                const batchEmbeddings = await generateEmbeddingsBatch(batchTexts, job.file_name);
                
                for (let i = 0; i < batch.length; i++) {
                    const chunkData = batch[i];
                    const chunkIndex = batchStart + i;
                    const embedding = batchEmbeddings[i];
                    
                    if (embedding) {
                        chunksToInsert.push({
                            course_id: materialInfo.course_id,
                            unit_id: materialInfo.unit_id || null,
                            session_id: materialInfo.session_id || null,
                            content: chunkData.content,
                            embedding: embedding,
                            chunk_index: chunkIndex + 1,
                            metadata: {
                                material_id: materialId,
                                pageStart: chunkData.pageStart,
                                pageEnd: chunkData.pageEnd,
                                file_name: job.file_name
                            }
                        });
                        processedCount++;
                    }
                }
            } catch (e) {
                console.error(`❌ Error en lote de embeddings: ${e.message}`);
                throw e; // Detener si falla el lote
            }

            if (chunksToInsert.length > 0) {
                // Reintento simple para la inserción
                let success = false;
                let attempts = 0;
                while (!success && attempts < 3) {
                    const { error: insError } = await supabase.from('course_content_chunks').insert(chunksToInsert);
                    if (insError) {
                        attempts++;
                        console.warn(`⚠️ Intento ${attempts} fallido al insertar chunks: ${insError.message}`);
                        if (attempts >= 3) throw insError;
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s antes de reintentar
                    } else {
                        success = true;
                    }
                }
            }

            job.metadata = { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: processedCount };
            await supabase.from('file_processing_jobs').update({
                metadata: job.metadata,
                updated_at: new Date().toISOString()
            }).eq('id', job.id);

            console.log(`✅ ${processedCount}/${chunks.length} chunks`);

            // Pequeña pausa para no saturar la DB
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const completedAt = new Date().toISOString();
        job.metadata = { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: processedCount, completedAt };
        await supabase.from('file_processing_jobs').update({
            status: 'completed',
            completed_at: completedAt,
            metadata: job.metadata
        }).eq('id', job.id);

        await supabase.from('materials').update({ rag_status: 'completed', updated_at: completedAt }).eq('id', materialId);

        return res.status(200).json({ success: true, jobId: job.id });

    } catch (error) {
        console.error('❌ Error:', error);
        if (job?.id) {
            await supabase.from('file_processing_jobs').update({
                status: 'failed',
                error_message: error.message,
                updated_at: new Date().toISOString()
            }).eq('id', job.id);
        }
        return res.status(500).json({ success: false, error: error.message });
    }
});
