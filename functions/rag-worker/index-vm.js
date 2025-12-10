/**
 * RAG Worker para VM - Servidor HTTP Standalone
 * Optimizado para archivos grandes (hasta 900MB) con procesamiento página por página
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

const app = express();
app.use(express.json());

// Constantes de configuración
const MAX_FILE_SIZE = 900 * 1024 * 1024; // 900MB
const DOWNLOAD_TIMEOUT = 60 * 60 * 1000; // 60 minutos
const PORT = process.env.PORT || 8080;

// Inicializar clientes
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log('[RAG Worker VM] 🚀 Iniciando servidor...');
console.log(`[RAG Worker VM] SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Configurado' : '❌ NO CONFIGURADO'}`);
console.log(`[RAG Worker VM] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Configurado' : '❌ NO CONFIGURADO'}`);

/**
 * Extrae texto de un PDF página por página
 */
async function extractTextPageByPage(pdfBuffer) {
    console.log('[RAG Worker VM] 📄 Iniciando extracción página por página...');

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    console.log(`[RAG Worker VM] 📄 PDF tiene ${totalPages} páginas`);

    const pageTexts = [];
    let failedPages = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
            const singlePagePdf = await PDFDocument.create();
            const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
            singlePagePdf.addPage(copiedPage);

            const singlePageBytes = await singlePagePdf.save();
            const singlePageBuffer = Buffer.from(singlePageBytes);

            try {
                const pageData = await pdfParse(singlePageBuffer);
                pageTexts.push({
                    pageNum: pageNum,
                    text: pageData.text || ''
                });
            } catch (parseError) {
                pageTexts.push({ pageNum: pageNum, text: '' });
                failedPages.push(pageNum);
            }

            if (pageNum % 100 === 0 || pageNum === totalPages) {
                console.log(`[RAG Worker VM]   ✓ Procesadas ${pageNum}/${totalPages} páginas`);
            }
        } catch (pageError) {
            pageTexts.push({ pageNum: pageNum, text: '' });
            failedPages.push(pageNum);
        }
    }

    if (failedPages.length > 0) {
        console.log(`[RAG Worker VM] ⚠️ ${failedPages.length} páginas no pudieron ser procesadas`);
    }

    const fullText = pageTexts.map(p => p.text).join('\n\n');
    console.log(`[RAG Worker VM] ✅ Extracción completada: ${fullText.length} caracteres`);

    return { text: fullText, numPages: totalPages, pageTexts };
}

/**
 * Función principal de procesamiento
 */
async function processRagJobs() {
    console.log(`\n[RAG Worker VM] ========================================`);
    console.log(`[RAG Worker VM] 🔍 Buscando jobs pendientes...`);

    try {
        const { data: jobs, error: jobsError } = await supabase
            .from('file_processing_jobs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1);

        if (jobsError) throw jobsError;

        if (!jobs || jobs.length === 0) {
            console.log('[RAG Worker VM] No hay jobs pendientes');
            return { success: true, message: 'No pending jobs' };
        }

        const job = jobs[0];
        console.log(`[RAG Worker VM] 🚀 Procesando job: ${job.id}`);
        console.log(`[RAG Worker VM] 📄 Archivo: ${job.file_name}`);

        // Normalizar metadata
        if (typeof job.metadata === 'string') {
            try { job.metadata = JSON.parse(job.metadata); } catch (e) { }
        }

        const materialId = job.metadata?.materialId || job.material_id;
        if (!materialId) {
            throw new Error('No se proporcionó materialId');
        }

        if (!job.metadata) job.metadata = {};
        job.metadata.materialId = materialId;

        // Marcar como processing
        await supabase
            .from('file_processing_jobs')
            .update({
                status: 'processing',
                updated_at: new Date().toISOString(),
                metadata: { ...job.metadata, startedAt: new Date().toISOString() }
            })
            .eq('id', job.id);

        console.log(`[RAG Worker VM] ✅ Job marcado como 'processing'`);

        // Obtener info del material
        const { data: materialData, error: materialError } = await supabase
            .from('materials')
            .select('course_id, unit_id, session_id')
            .eq('id', materialId)
            .single();

        if (materialError || !materialData) {
            throw new Error(`Material ${materialId} no encontrado`);
        }

        const materialInfo = materialData;
        console.log(`[RAG Worker VM] 📋 Material: course_id=${materialInfo.course_id}`);

        // Descargar PDF
        let pdfBuffer;
        const isGoogleDrive = job.metadata?.source === 'google_drive' ||
            (!job.bucket_path?.includes('/') && job.metadata?.driveFileId);

        if (isGoogleDrive) {
            const driveFileId = job.metadata?.driveFileId || job.bucket_path;
            const userId = job.metadata?.userId || job.user_id;

            console.log(`[RAG Worker VM] 📥 Descargando desde Google Drive: ${driveFileId}`);

            const { data: tokenData, error: tokenError } = await supabase
                .from('user_google_tokens')
                .select('access_token')
                .eq('user_id', userId)
                .in('service_type', ['drive', 'both'])
                .single();

            if (tokenError || !tokenData) {
                throw new Error(`No se encontró token de Google Drive`);
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
        } else {
            console.log(`[RAG Worker VM] 📥 Descargando desde Supabase: ${job.bucket_path}`);

            const { data: fileData, error: downloadError } = await supabase.storage
                .from('course-documents')
                .download(job.bucket_path);

            if (downloadError || !fileData) {
                throw new Error(`Error descargando: ${downloadError?.message}`);
            }

            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
        }

        const fileSizeMB = pdfBuffer.length / (1024 * 1024);
        console.log(`[RAG Worker VM] ✅ PDF descargado: ${fileSizeMB.toFixed(2)} MB`);

        // Extraer texto página por página
        console.log(`[RAG Worker VM] 📄 Extrayendo texto...`);
        const pdfResult = await extractTextPageByPage(pdfBuffer);
        const pageTexts = pdfResult.pageTexts;
        const numPages = pdfResult.numPages;

        if (!pdfResult.text || pdfResult.text.trim().length === 0) {
            throw new Error('No se pudo extraer texto del PDF');
        }

        console.log(`[RAG Worker VM] ✅ Texto extraído: ${pdfResult.text.length} caracteres de ${numPages} páginas`);

        // Crear chunks con páginas reales
        const chunkSize = 30000;
        const chunks = [];
        let currentChunk = '';
        let currentChunkStartPage = 1;
        let currentChunkEndPage = 1;

        for (const pageData of pageTexts) {
            if (currentChunk.length + pageData.text.length > chunkSize && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk,
                    pageStart: currentChunkStartPage,
                    pageEnd: currentChunkEndPage
                });
                currentChunk = '';
                currentChunkStartPage = pageData.pageNum;
            }
            currentChunk += (currentChunk ? '\n\n' : '') + pageData.text;
            currentChunkEndPage = pageData.pageNum;
        }

        if (currentChunk.length > 0) {
            chunks.push({
                content: currentChunk,
                pageStart: currentChunkStartPage,
                pageEnd: currentChunkEndPage
            });
        }

        console.log(`[RAG Worker VM] ✅ Creados ${chunks.length} chunks`);

        // Actualizar metadata con total
        await supabase
            .from('file_processing_jobs')
            .update({
                metadata: { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: 0 },
                updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        // Generar embeddings
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        console.log(`[RAG Worker VM] 🔄 Generando embeddings...`);

        let processedCount = 0;
        const BATCH_SIZE = 10;

        for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
            const batch = chunks.slice(batchStart, batchEnd);

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
                            file_name: job.file_name
                        }
                    });
                    processedCount++;
                } catch (err) {
                    console.error(`[RAG Worker VM] ❌ Error en chunk ${chunkIndex + 1}: ${err.message}`);
                }
            }

            if (chunksToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('course_content_chunks')
                    .insert(chunksToInsert);

                if (insertError) {
                    console.error(`[RAG Worker VM] ❌ Error insertando: ${insertError.message}`);
                }
            }

            // Actualizar progreso
            await supabase
                .from('file_processing_jobs')
                .update({
                    metadata: { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: processedCount },
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);

            console.log(`[RAG Worker VM] ✅ ${processedCount}/${chunks.length} chunks procesados`);
        }

        // Marcar como completado
        await supabase
            .from('file_processing_jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: { ...job.metadata, chunksTotal: chunks.length, chunksProcessed: processedCount }
            })
            .eq('id', job.id);

        await supabase
            .from('materials')
            .update({ rag_status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', materialId);

        console.log(`[RAG Worker VM] ========================================`);
        console.log(`[RAG Worker VM] 🎉 PROCESAMIENTO COMPLETADO`);
        console.log(`[RAG Worker VM] Chunks: ${processedCount}`);
        console.log(`[RAG Worker VM] Páginas: 1-${numPages}`);
        console.log(`[RAG Worker VM] ========================================\n`);

        return { success: true, chunksProcessed: processedCount, totalPages: numPages };

    } catch (error) {
        console.error(`[RAG Worker VM] ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Endpoints
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
app.listen(PORT, () => {
    console.log(`[RAG Worker VM] ✅ Servidor escuchando en puerto ${PORT}`);

    // Ejecutar inmediatamente al iniciar
    processRagJobs();

    // Ejecutar cada 2 minutos
    setInterval(() => {
        processRagJobs();
    }, 2 * 60 * 1000);
});
