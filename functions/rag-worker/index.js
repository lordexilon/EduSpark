process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

            // También verificar si el progreso de chunks no ha avanzado
            const chunksProcessed = j.metadata?.chunksProcessed || 0;
            const chunksTotal = j.metadata?.chunksTotal || 0;

            console.log(`[RAG Worker] 🔍 Verificando job 'processing': ${j.id}`);
            console.log(`[RAG Worker]   - Archivo: ${j.file_name}`);
            console.log(`[RAG Worker]   - Updated_at: ${j.updated_at || 'N/A'}`);
            console.log(`[RAG Worker]   - Created_at: ${j.created_at}`);
            console.log(`[RAG Worker]   - Horas desde actualización: ${hoursSinceUpdate.toFixed(2)}`);
            console.log(`[RAG Worker]   - Chunks: ${chunksProcessed}/${chunksTotal}`);

            if (hoursSinceUpdate > 2) {
                console.log(`[RAG Worker] 🔄 Job 'processing' detectado como stuck: ${j.id} (${hoursSinceUpdate.toFixed(1)} horas sin actualizar)`);
                return true; // Es un job stuck, procesarlo
            }

            console.log(`[RAG Worker] ⏸️ Job 'processing' ${j.id} está activo (${hoursSinceUpdate.toFixed(2)} horas desde actualización)`);
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
        const { error: resetError } = await supabase
            .from('file_processing_jobs')
            .update({
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        if (resetError) {
            console.warn(`[RAG Worker] ⚠️ Error reseteando job a pending (continuando de todas formas):`, resetError);
        } else {
            job.status = 'pending'; // Actualizar en memoria también
            console.log(`[RAG Worker] ✅ Job reseteado a 'pending'`);
        }
    }
    console.log(`[RAG Worker] ========================================`);
    console.log(`[RAG Worker] 🚀 INICIANDO PROCESAMIENTO DE JOB`);
    console.log(`[RAG Worker] Job ID: ${job.id}`);
    console.log(`[RAG Worker] Archivo: ${job.file_name}`);
    console.log(`[RAG Worker] Usuario: ${job.user_id}`);
    console.log(`[RAG Worker] Creado: ${job.created_at}`);
    console.log(`[RAG Worker] Material ID (campo superior): ${job.material_id}`);
    console.log(`[RAG Worker] Metadata completo:`, JSON.stringify(job.metadata, null, 2));
    console.log(`[RAG Worker] Material ID (en metadata): ${job.metadata?.materialId}`);
    console.log(`[RAG Worker] ========================================`);

    // Normalizar metadata si viene como string (puede pasar con Supabase)
    if (typeof job.metadata === 'string') {
        try {
            job.metadata = JSON.parse(job.metadata);
            console.log(`[RAG Worker] ✅ Metadata parseado desde string`);
        } catch (e) {
            console.error(`[RAG Worker] ❌ Error parseando metadata:`, e);
        }
    }

    // Obtener materialId: primero de metadata.materialId, luego de material_id (campo superior)
    const materialId = job.metadata?.materialId || job.material_id;

    if (!materialId) {
        const errorMessage = 'No se proporcionó materialId en los metadatos del job ni en el campo material_id. El job debe tener un materialId para procesar chunks.';
        console.error(`[RAG Worker] ❌ ${errorMessage}`);
        console.error(`[RAG Worker] ❌ Job completo recibido:`, JSON.stringify(job, null, 2));
        throw new Error(errorMessage);
    }

    // Asegurar que materialId esté en metadata para el resto del código
    if (!job.metadata) {
        job.metadata = {};
    }
    if (!job.metadata.materialId) {
        job.metadata.materialId = materialId;
        console.log(`[RAG Worker] ✅ MaterialId agregado a metadata desde campo superior: ${materialId}`);
    }

    // 2. Marcar como processing y actualizar startedAt
    const startedAt = new Date().toISOString();
    const { error: updateError } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'processing',
            updated_at: startedAt,
            metadata: {
                ...job.metadata,
                startedAt: startedAt
            }
        })
        .eq('id', job.id);

    if (updateError) {
        console.error(`[RAG Worker] ❌ Error actualizando estado a processing:`, updateError);
        throw updateError;
    }

    console.log(`[RAG Worker] ✅ Job marcado como 'processing'`);

    // 2.5. Obtener información del material para saber dónde guardar los chunks
    // materialId es REQUERIDO - debe estar presente en todos los jobs nuevos
    console.log(`[RAG Worker] 📋 Usando materialId: ${materialId}`);

    console.log(`[RAG Worker] 📋 Obteniendo información del material ${materialId}...`);
    const { data: materialData, error: materialFetchError } = await supabase
        .from('materials')
        .select('course_id, unit_id, session_id')
        .eq('id', materialId)
        .single();

    if (materialFetchError) {
        console.error(`[RAG Worker] ❌ Error obteniendo información del material:`, materialFetchError);
        throw new Error(`Error obteniendo información del material: ${materialFetchError.message}`);
    }

    if (!materialData) {
        throw new Error(`Material ${materialId} no encontrado en la base de datos`);
    }

    const materialInfo = materialData;
    console.log(`[RAG Worker] 📋 Material encontrado:`, {
        materialId: materialId,
        course_id: materialInfo.course_id,
        unit_id: materialInfo.unit_id,
        session_id: materialInfo.session_id
    });

    // 3. Descargar PDF con timeout y validación de tamaño
    let pdfBuffer;

    console.log(`[RAG Worker] Iniciando descarga del archivo...`);

    // Determinar la fuente del archivo
    // Si metadata.source es 'google_drive' o si bucket_path parece ser un ID de Google Drive (no contiene '/')
    const isGoogleDrive = job.metadata?.source === 'google_drive' ||
        (!job.bucket_path?.includes('/') && job.metadata?.driveFileId);

    if (isGoogleDrive) {
        // Descargar desde Google Drive
        const driveFileId = job.metadata?.driveFileId || job.bucket_path || job.metadata?.sourceFileId;
        const userId = job.metadata?.userId || job.user_id;

        if (!driveFileId) {
            throw new Error('No se encontró el ID del archivo de Google Drive. Verifica que metadata.driveFileId o bucket_path estén configurados.');
        }

        if (!userId) {
            throw new Error('No se encontró el ID del usuario. Verifica que metadata.userId o user_id estén configurados.');
        }

        console.log(`[RAG Worker] 📥 Descargando desde Google Drive:`);
        console.log(`[RAG Worker]    - File ID: ${driveFileId}`);
        console.log(`[RAG Worker]    - User ID: ${userId}`);

        // Obtener token del usuario
        const { data: tokenData, error: tokenError } = await supabase
            .from('user_google_tokens')
            .select('access_token, refresh_token, expires_at')
            .eq('user_id', userId)
            .in('service_type', ['drive', 'both'])
            .single();

        if (tokenError || !tokenData) {
            console.error(`[RAG Worker] ❌ Error obteniendo token de Google Drive:`, tokenError);
            throw new Error(`No se encontró token de Google Drive para el usuario ${userId}. El usuario debe conectar su cuenta de Google Drive primero.`);
        }

        // Verificar si el token está expirado
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            console.warn(`[RAG Worker] ⚠️ Token expirado, pero intentando usar de todas formas...`);
        }

        // Descargar archivo de Drive con timeout
        console.log(`[RAG Worker] Descargando archivo desde Google Drive API...`);
        try {
            const response = await axios.get(
                `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
                {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                    responseType: 'arraybuffer',
                    timeout: DOWNLOAD_TIMEOUT,
                    maxContentLength: MAX_FILE_SIZE,
                    maxBodyLength: MAX_FILE_SIZE
                }
            );

            pdfBuffer = Buffer.from(response.data);
            console.log(`[RAG Worker] ✅ Archivo descargado exitosamente desde Google Drive`);
        } catch (downloadErr) {
            console.error(`[RAG Worker] ❌ Error descargando desde Google Drive:`, downloadErr.message);
            if (downloadErr.response?.status === 401) {
                throw new Error('Token de Google Drive inválido o expirado. El usuario debe reconectar su cuenta de Google Drive.');
            } else if (downloadErr.response?.status === 404) {
                throw new Error(`Archivo no encontrado en Google Drive (ID: ${driveFileId}). Verifica que el archivo exista y sea accesible.`);
            } else if (downloadErr.response?.status === 403) {
                throw new Error('Sin permisos para acceder al archivo en Google Drive. Verifica los permisos del archivo.');
            }
            throw new Error(`Error descargando archivo desde Google Drive: ${downloadErr.message}`);
        }

    } else {
        // Descargar desde Supabase Storage
        console.log(`[RAG Worker] 📥 Descargando desde Supabase Storage:`);
        console.log(`[RAG Worker]    - Bucket: course-documents`);
        console.log(`[RAG Worker]    - Path: ${job.bucket_path}`);

        if (!job.bucket_path) {
            throw new Error('No se especificó bucket_path para descargar desde Supabase Storage');
        }

        // Crear timeout para la descarga
        const downloadPromise = supabase.storage
            .from('course-documents')
            .download(job.bucket_path);

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout: La descarga del archivo tardó más de ${DOWNLOAD_TIMEOUT / 60000} minutos`)), DOWNLOAD_TIMEOUT);
        });

        try {
            const result = await Promise.race([
                downloadPromise,
                timeoutPromise
            ]);

            const { data: fileData, error: downloadError } = result;

            if (downloadError) {
                console.error(`[RAG Worker] ❌ Error descargando desde Supabase Storage:`, downloadError);
                throw downloadError;
            }

            if (!fileData) {
                throw new Error('No se recibieron datos del archivo desde Supabase Storage');
            }

            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
            console.log(`[RAG Worker] ✅ Archivo descargado exitosamente desde Supabase Storage`);
        } catch (err) {
            if (err.message?.includes('Timeout')) {
                throw err;
            }
            console.error(`[RAG Worker] ❌ Error en descarga desde Supabase Storage:`, err);
            throw new Error(`Error descargando archivo desde Supabase Storage: ${err.message || err}`);
        }
    }

    const actualFileSizeMB = pdfBuffer.length / (1024 * 1024);
    console.log(`[RAG Worker] PDF descargado: ${pdfBuffer.length} bytes (${actualFileSizeMB.toFixed(2)} MB)`);

    // Validar tamaño del archivo
    if (pdfBuffer.length > MAX_FILE_SIZE) {
        throw new Error(`Archivo demasiado grande: ${actualFileSizeMB.toFixed(2)}MB. El límite máximo es ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }

    // 4. Validar que el archivo sea un PDF válido antes de procesar
    console.log(`[RAG Worker] Validando formato PDF...`);
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
        throw new Error('El archivo no es un PDF válido. El archivo puede estar corrupto o no ser un PDF.');
    }

    // 4.5. DIVISIÓN DE ARCHIVOS GRANDES - Verificar si requiere división
    if (job.metadata?.requiresSplitting && !job.metadata?.isSubJob) {
        console.log(`[RAG Worker] 📄 Archivo grande detectado (${actualFileSizeMB.toFixed(2)}MB), iniciando división...`);

        try {
            // Dividir el PDF en partes
            const parts = await splitPDF(pdfBuffer, 100); // 100 páginas por parte

            console.log(`[RAG Worker] ✂️ PDF dividido en ${parts.length} partes`);

            // Crear sub-jobs para cada parte
            const subJobIds = [];

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                // Convertir la parte a base64 para guardarla en metadata
                // NOTA: Para archivos muy grandes (>1MB por parte), considerar usar Cloud Storage
                const partBase64 = part.buffer.toString('base64');
                const partSizeMB = part.buffer.length / (1024 * 1024);

                console.log(`[RAG Worker] 📦 Creando sub-job ${i + 1}/${parts.length} (${partSizeMB.toFixed(2)}MB, páginas ${part.startPage}-${part.endPage})`);

                const subJobId = `${job.id}_part${i + 1}`;

                const subJobData = {
                    id: subJobId,
                    user_id: job.user_id,
                    bucket_path: job.bucket_path,
                    file_name: `${job.file_name} (Parte ${i + 1}/${parts.length})`,
                    status: 'pending',
                    material_id: materialId,
                    course_id: job.course_id,
                    metadata: {
                        ...job.metadata,
                        isSubJob: true,
                        parentJobId: job.id,
                        partNumber: i + 1,
                        totalParts: parts.length,
                        startPage: part.startPage,
                        endPage: part.endPage,
                        pageCount: part.pageCount,
                        pdfPartBase64: partBase64,
                        requiresSplitting: false // Las partes no requieren división
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Crear sub-job en Supabase
                const { error: subJobError } = await supabase
                    .from('file_processing_jobs')
                    .insert(subJobData);

                if (subJobError) {
                    console.error(`[RAG Worker] ❌ Error creando sub-job ${subJobId}:`, subJobError);
                    throw new Error(`Error creando sub-job ${subJobId}: ${subJobError.message}`);
                } else {
                    subJobIds.push(subJobId);
                    console.log(`[RAG Worker] ✅ Sub-job creado: ${subJobId}`);
                }
            }

            // Actualizar job principal con referencia a sub-jobs
            await supabase
                .from('file_processing_jobs')
                .update({
                    status: 'processing',
                    metadata: {
                        ...job.metadata,
                        subJobIds: subJobIds,
                        subJobsCompleted: 0,
                        subJobsTotal: parts.length
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);

            console.log(`[RAG Worker] ✅ Job principal actualizado con ${subJobIds.length} sub-jobs`);

            // Marcar material como 'processing'
            await supabase
                .from('materials')
                .update({ rag_status: 'processing' })
                .eq('id', materialId);

            console.log(`[RAG Worker] ✅ Material ${materialId} marcado como 'processing'`);

            // Retornar éxito - los sub-jobs se procesarán en las siguientes ejecuciones del scheduler
            return res.status(200).json({
                success: true,
                message: `Job dividido en ${parts.length} partes`,
                subJobs: subJobIds
            });

        } catch (splitError) {
            console.error(`[RAG Worker] ❌ Error dividiendo PDF:`, splitError);

            await supabase
                .from('file_processing_jobs')
                .update({
                    status: 'failed',
                    error: `Error dividiendo PDF: ${splitError.message}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);

            return res.status(500).json({
                success: false,
                error: splitError.message
            });
        }
    }

    // Si es un sub-job, usar la parte del PDF desde metadata
    if (job.metadata?.isSubJob && job.metadata?.pdfPartBase64) {
        console.log(`[RAG Worker] 📄 Procesando sub-job ${job.metadata.partNumber}/${job.metadata.totalParts}`);
        console.log(`[RAG Worker] 📄 Páginas: ${job.metadata.startPage}-${job.metadata.endPage} (${job.metadata.pageCount} páginas)`);

        // Decodificar la parte del PDF desde base64
        pdfBuffer = Buffer.from(job.metadata.pdfPartBase64, 'base64');
        const partSizeMB = pdfBuffer.length / (1024 * 1024);
        console.log(`[RAG Worker] ✅ Parte del PDF cargada desde metadata (${partSizeMB.toFixed(2)}MB)`);
    }

    // 4. Extraer texto del PDF con manejo de errores mejorado
    console.log(`[RAG Worker] Extrayendo texto del PDF (esto puede tardar varios minutos para archivos grandes de ${actualFileSizeMB.toFixed(2)}MB)...`);

    let pdfData;
    try {
        // Añadir timeout para la extracción de texto (más tiempo para archivos grandes)
        const parsePromise = pdfParse(pdfBuffer, {
            // Opciones para archivos grandes: procesar en modo más eficiente
            max: 0, // Sin límite de páginas
            version: 'v1.10.100'
        });
        const parseTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: La extracción de texto tardó más de 10 minutos')), PARSE_TIMEOUT);
        });

        pdfData = await Promise.race([parsePromise, parseTimeout]);
    } catch (parseError) {
        // Detectar diferentes tipos de errores de PDF
        const errorMessage = parseError.message || parseError.toString();
        const errorStack = parseError.stack || '';

        console.error('[RAG Worker] Error parseando PDF:', errorMessage);
        console.error('[RAG Worker] Stack:', errorStack);

        if (parseError.message?.includes('Timeout') || errorMessage.includes('Timeout')) {
            throw new Error(`El archivo es muy grande (${actualFileSizeMB.toFixed(2)}MB) y la extracción de texto está tardando demasiado. Considera comprimir el PDF o dividirlo en partes más pequeñas.`);
        }

        // Detectar PDF inválido o corrupto
        if (errorMessage.includes('InvalidPDF') ||
            errorMessage.includes('Invalid PDF') ||
            errorMessage.includes('InvalidPDFException') ||
            errorStack.includes('InvalidPDF') ||
            errorMessage.includes('corrupt') ||
            errorMessage.includes('malformed')) {
            throw new Error(`El PDF está corrupto o es inválido. Por favor, verifica que el archivo no esté dañado. Si el archivo se descargó desde Google Drive, intenta descargarlo nuevamente o subirlo directamente desde tu computadora.`);
        }

        // Detectar errores de formato
        if (errorMessage.includes('format') || errorMessage.includes('Format')) {
            throw new Error(`El archivo no tiene un formato PDF válido. Verifica que el archivo sea realmente un PDF y no esté corrupto.`);
        }

        // Error genérico con más contexto
        throw new Error(`Error extrayendo texto del PDF: ${errorMessage}. El archivo puede estar corrupto, ser una imagen escaneada sin OCR, o tener un formato no soportado.`);
    }

    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length === 0) {
        throw new Error('No se pudo extraer texto del PDF. El archivo puede estar corrupto, ser una imagen escaneada sin OCR, o tener texto protegido. Intenta usar un PDF con texto seleccionable.');
    }

    console.log(`[RAG Worker] Texto extraído: ${fullText.length} caracteres (${(fullText.length / 1024).toFixed(2)} KB)`);

    // 5. Dividir en chunks (optimizado para archivos grandes)
    const chunkSize = 30000;
    const chunks = [];
    const totalChunks = Math.ceil(fullText.length / chunkSize);

    console.log(`[RAG Worker] Dividiendo texto en chunks (tamaño: ${chunkSize} caracteres, estimado: ~${totalChunks} chunks)...`);

    for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.substring(i, i + chunkSize));
        // Log cada 100 chunks para archivos muy grandes
        if (chunks.length % 100 === 0) {
            console.log(`[RAG Worker] Procesados ${chunks.length}/${totalChunks} chunks...`);
        }
    }

    console.log(`[RAG Worker] Creados ${chunks.length} chunks (${(fullText.length / 1024 / 1024).toFixed(2)} MB de texto)`);

    // 6. Generar embeddings y guardar (optimizado para archivos grandes)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    console.log(`[RAG Worker] Generando embeddings para ${chunks.length} chunks (esto puede tardar varios minutos)...`);

    // VERIFICAR CHUNKS YA PROCESADOS - Resumir desde donde quedó
    let chunksAlreadyProcessed = 0;
    let startFromIndex = 0;

    try {
        console.log(`[RAG Worker] 🔍 Verificando chunks ya procesados para material_id: ${materialId}...`);
        // Consultar chunks ya procesados usando el material_id del metadata
        // Intentar múltiples métodos de consulta para mayor robustez
        let chunksToCheck = null;

        // Método 1: Consulta directa (más común)
        const { data: existingChunks, error: checkError } = await supabase
            .from('course_content_chunks')
            .select('chunk_index, metadata')
            .eq('metadata->>material_id', materialId.toString())
            .order('chunk_index', { ascending: true });

        if (!checkError && existingChunks) {
            chunksToCheck = existingChunks;
        } else {
            console.warn(`[RAG Worker] ⚠️ Primera consulta falló, intentando método alternativo...`, checkError?.message);

            // Método 2: Búsqueda amplia y filtrado manual (más lento pero más robusto)
            const { data: allChunks, error: allError } = await supabase
                .from('course_content_chunks')
                .select('chunk_index, metadata')
                .order('chunk_index', { ascending: true })
                .limit(50000); // Límite razonable para archivos grandes

            if (!allError && allChunks) {
                // Filtrar manualmente por material_id
                chunksToCheck = allChunks.filter(c => {
                    const metaMatId = c.metadata?.material_id;
                    if (!metaMatId) return false;
                    // Comparar como string para mayor compatibilidad
                    return metaMatId.toString() === materialId.toString();
                });
            }
        }

        if (chunksToCheck && chunksToCheck.length > 0) {
            // Encontrar el índice más alto de chunk ya procesado
            const maxChunkIndex = Math.max(...chunksToCheck.map(c => c.chunk_index || 0));
            chunksAlreadyProcessed = chunksToCheck.length;
            startFromIndex = maxChunkIndex; // Continuar desde el siguiente chunk

            console.log(`[RAG Worker] ✅ Encontrados ${chunksAlreadyProcessed} chunks ya procesados. Continuando desde chunk ${startFromIndex + 1}/${chunks.length}`);

            // Si ya se procesaron todos los chunks, saltar el procesamiento
            if (chunksAlreadyProcessed >= chunks.length) {
                console.log(`[RAG Worker] ✅ Todos los chunks ya están procesados. Marcando job como completado...`);
                await supabase
                    .from('file_processing_jobs')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                        metadata: {
                            ...job.metadata,
                            chunksTotal: chunks.length,
                            chunksProcessed: chunks.length,
                            resumed: true,
                            completedAt: new Date().toISOString()
                        }
                    })
                    .eq('id', job.id);

                return res.status(200).json({
                    success: true,
                    message: 'Job ya estaba completado (todos los chunks procesados)',
                    chunksProcessed: chunks.length,
                    chunksTotal: chunks.length
                });
            }
        } else {
            console.log(`[RAG Worker] 📝 No se encontraron chunks previos. Iniciando procesamiento desde el principio.`);
        }
    } catch (resumeError) {
        console.warn(`[RAG Worker] ⚠️ Error en verificación de chunks previos (continuando desde 0):`, resumeError.message);
    }

    // Establecer chunksTotal al inicio del procesamiento
    try {
        await supabase
            .from('file_processing_jobs')
            .update({
                metadata: {
                    ...job.metadata,
                    chunksTotal: chunks.length,
                    chunksProcessed: chunksAlreadyProcessed,
                    resumed: chunksAlreadyProcessed > 0
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
        console.log(`[RAG Worker] 📊 Progreso establecido: ${chunksAlreadyProcessed}/${chunks.length} chunks (${chunksAlreadyProcessed > 0 ? 'resumiendo' : 'iniciando'})`);
    } catch (updateError) {
        console.warn('[RAG Worker] ⚠️ Error estableciendo progreso inicial (no crítico):', updateError.message);
    }

    // Procesar en lotes optimizados para evitar timeouts en Supabase
    const EMBEDDING_BATCH_SIZE = 20; // Procesar 20 embeddings a la vez
    const INSERT_BATCH_SIZE = 5; // Insertar solo 5 chunks a la vez (reducido para evitar timeouts)
    const PROGRESS_UPDATE_INTERVAL = 5; // Actualizar progreso cada 5 chunks (más frecuente)
    let processedCount = chunksAlreadyProcessed; // Iniciar desde los ya procesados
    let failedChunks = 0;

    // Función para insertar chunks en Supabase con retry y manejo de timeouts mejorado
    const insertChunksBatch = async (chunksToInsert, retries = 5) => {
        // Si el batch es muy grande, dividirlo inmediatamente
        if (chunksToInsert.length > 5) {
            console.log(`[RAG Worker] Dividiendo batch grande de ${chunksToInsert.length} chunks en batches más pequeños...`);
            const mid = Math.floor(chunksToInsert.length / 2);
            await insertChunksBatch(chunksToInsert.slice(0, mid), retries);
            await insertChunksBatch(chunksToInsert.slice(mid), retries);
            return;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Añadir timeout explícito de 30 segundos por operación
                const insertPromise = supabase
                    .from('course_content_chunks')
                    .insert(chunksToInsert);

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout: La inserción tardó más de 30 segundos')), 30000)
                );

                const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

                if (error) {
                    // Si es timeout, dividir el batch inmediatamente
                    if (error.message?.includes('timeout') ||
                        error.message?.includes('statement timeout') ||
                        error.message?.includes('canceling statement') ||
                        error.message?.includes('Timeout:')) {

                        if (chunksToInsert.length > 1) {
                            console.warn(`[RAG Worker] ⚠️ Timeout insertando batch de ${chunksToInsert.length} chunks (intento ${attempt}/${retries}), dividiendo batch...`);
                            const mid = Math.floor(chunksToInsert.length / 2);
                            if (mid > 0) {
                                await insertChunksBatch(chunksToInsert.slice(0, mid), retries);
                            }
                            if (chunksToInsert.length - mid > 0) {
                                await insertChunksBatch(chunksToInsert.slice(mid), retries);
                            }
                            return;
                        } else {
                            // Si es un solo chunk y aún falla, esperar más tiempo antes de reintentar
                            if (attempt < retries) {
                                const waitTime = 5000 * attempt; // Backoff más largo para chunks individuales
                                console.warn(`[RAG Worker] Esperando ${waitTime}ms antes de reintentar chunk individual...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                                continue;
                            }
                        }
                    }
                    throw error;
                }

                // Éxito
                console.log(`[RAG Worker] ✅ Insertados ${chunksToInsert.length} chunks exitosamente`);
                return;
            } catch (err) {
                const isTimeout = err.message?.includes('timeout') ||
                    err.message?.includes('statement timeout') ||
                    err.message?.includes('canceling statement') ||
                    err.message?.includes('Timeout:');

                if (attempt === retries) {
                    console.error(`[RAG Worker] ❌ Error insertando batch después de ${retries} intentos:`, err.message);
                    // Si es timeout y aún tenemos chunks, intentar dividir
                    if (isTimeout && chunksToInsert.length > 1) {
                        console.warn(`[RAG Worker] Último intento: dividiendo batch de ${chunksToInsert.length} chunks...`);
                        const mid = Math.floor(chunksToInsert.length / 2);
                        if (mid > 0) {
                            await insertChunksBatch(chunksToInsert.slice(0, mid), retries);
                        }
                        if (chunksToInsert.length - mid > 0) {
                            await insertChunksBatch(chunksToInsert.slice(mid), retries);
                        }
                        return;
                    }
                    throw err;
                }

                // Esperar antes de reintentar (backoff exponencial más largo)
                const waitTime = 3000 * Math.pow(2, attempt - 1);
                console.warn(`[RAG Worker] Error en intento ${attempt}/${retries}, esperando ${waitTime}ms antes de reintentar...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    };

    // Procesar chunks en batches para embeddings - RESUMIR desde donde quedó
    // Solo procesar chunks que aún no han sido procesados
    for (let embeddingBatchStart = startFromIndex; embeddingBatchStart < chunks.length; embeddingBatchStart += EMBEDDING_BATCH_SIZE) {
        const embeddingBatchEnd = Math.min(embeddingBatchStart + EMBEDDING_BATCH_SIZE, chunks.length);
        const embeddingBatch = chunks.slice(embeddingBatchStart, embeddingBatchEnd);

        console.log(`[RAG Worker] 🔄 Procesando batch de chunks ${embeddingBatchStart + 1} a ${embeddingBatchEnd} de ${chunks.length} total...`);

        // Función helper para generar embedding con retry
        const generateEmbeddingWithRetry = async (chunk, chunkIndex, maxRetries = 3) => {
            let lastError = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const result = await model.embedContent(chunk);
                    if (attempt > 1) {
                        console.log(`[RAG Worker] ✅ Chunk ${chunkIndex + 1} exitoso en intento ${attempt}`);
                    }
                    return {
                        chunkIndex,
                        chunk,
                        embedding: result.embedding.values,
                        success: true
                    };
                } catch (embeddingError) {
                    lastError = embeddingError;
                    const errorMsg = embeddingError.message || embeddingError.toString();
                    const isNetworkError = errorMsg.includes('fetch failed') ||
                        errorMsg.includes('ECONNRESET') ||
                        errorMsg.includes('ETIMEDOUT') ||
                        errorMsg.includes('timeout') ||
                        errorMsg.includes('network');

                    if (attempt < maxRetries && isNetworkError) {
                        // Exponential backoff: 2^attempt segundos (2s, 4s, 8s)
                        const delay = Math.pow(2, attempt) * 1000;
                        console.warn(`[RAG Worker] ⚠️ Chunk ${chunkIndex + 1} falló (intento ${attempt}/${maxRetries}): ${errorMsg}. Reintentando en ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    } else {
                        // Último intento falló o no es error de red
                        console.error(`[RAG Worker] ❌ Chunk ${chunkIndex + 1} falló después de ${attempt} intentos: ${errorMsg}`);
                        return {
                            chunkIndex,
                            chunk,
                            embedding: null,
                            success: false,
                            error: errorMsg
                        };
                    }
                }
            }

            // Si llegamos aquí, todos los intentos fallaron
            return {
                chunkIndex,
                chunk,
                embedding: null,
                success: false,
                error: lastError?.message || 'Error desconocido después de múltiples intentos'
            };
        };

        // Generar embeddings en paralelo con retry
        const embeddingPromises = embeddingBatch.map(async (chunk, index) => {
            const chunkIndex = embeddingBatchStart + index;
            return await generateEmbeddingWithRetry(chunk, chunkIndex);
        });

        // Esperar a que se generen todos los embeddings del batch
        const embeddingResults = await Promise.allSettled(embeddingPromises);

        // Preparar chunks para insertar (solo los exitosos)
        const chunksToInsert = [];
        for (const result of embeddingResults) {
            if (result.status === 'fulfilled' && result.value.success) {
                const { chunkIndex, chunk, embedding } = result.value;
                chunksToInsert.push({
                    course_id: materialInfo.course_id, // INTEGER, requerido
                    unit_id: materialInfo.unit_id || null, // UUID, opcional
                    session_id: materialInfo.session_id || null, // UUID, opcional
                    content: chunk, // TEXT, requerido
                    embedding: embedding, // vector(768)
                    chunk_index: chunkIndex + 1, // INTEGER (no chunk_number)
                    metadata: {
                        material_id: materialId, // Usar la variable materialId en lugar de job.metadata?.materialId
                        page_start: Math.floor((chunkIndex * chunkSize) / 3000) + 1,
                        page_end: Math.floor(((chunkIndex + 1) * chunkSize) / 3000) + 1,
                        file_name: job.file_name,
                        chunk_size: chunkSize
                    }
                });
            } else {
                failedChunks++;
                const errorMsg = result.status === 'fulfilled' ? result.value.error : result.reason?.message || 'Error desconocido';
                console.warn(`[RAG Worker] ⚠️ Chunk ${result.status === 'fulfilled' ? result.value.chunkIndex + 1 : 'desconocido'} falló: ${errorMsg}`);
            }
        }

        // Actualizar progreso después de generar embeddings (antes de insertar)
        // Esto muestra el progreso incluso antes de que se inserten en la BD
        const currentProgress = processedCount + chunksToInsert.length;
        if (currentProgress % PROGRESS_UPDATE_INTERVAL === 0 || chunksToInsert.length > 0) {
            try {
                await supabase
                    .from('file_processing_jobs')
                    .update({
                        updated_at: new Date().toISOString(),
                        metadata: {
                            ...job.metadata,
                            chunksProcessed: currentProgress,
                            chunksTotal: chunks.length
                        }
                    })
                    .eq('id', job.id);

                const progressPercent = Math.round((currentProgress / chunks.length) * 100);
                console.log(`[RAG Worker] 📊 Progreso (embeddings generados): ${currentProgress}/${chunks.length} chunks (${progressPercent}%)`);
            } catch (updateError) {
                console.warn('[RAG Worker] ⚠️ Error actualizando progreso (no crítico):', updateError.message);
            }
        }

        // Insertar chunks en batches más pequeños para evitar timeouts
        for (let insertBatchStart = 0; insertBatchStart < chunksToInsert.length; insertBatchStart += INSERT_BATCH_SIZE) {
            const insertBatchEnd = Math.min(insertBatchStart + INSERT_BATCH_SIZE, chunksToInsert.length);
            const insertBatch = chunksToInsert.slice(insertBatchStart, insertBatchEnd);

            try {
                await insertChunksBatch(insertBatch);
                processedCount += insertBatch.length;

                // Añadir un pequeño delay entre batches para no sobrecargar Supabase
                if (insertBatchStart + INSERT_BATCH_SIZE < chunksToInsert.length) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre batches
                }

                // Actualizar progreso después de cada batch de inserción exitoso
                // Actualizar cada PROGRESS_UPDATE_INTERVAL chunks o al final
                if (processedCount % PROGRESS_UPDATE_INTERVAL === 0 || processedCount === chunks.length) {
                    const progressPercent = ((processedCount / chunks.length) * 100).toFixed(1);
                    console.log(`[RAG Worker] 📊 Progreso (chunks insertados): ${processedCount}/${chunks.length} chunks (${progressPercent}%)`);

                    // Actualizar metadata del job con progreso
                    try {
                        await supabase
                            .from('file_processing_jobs')
                            .update({
                                metadata: {
                                    ...job.metadata,
                                    chunksProcessed: processedCount,
                                    chunksTotal: chunks.length
                                },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', job.id);
                    } catch (updateError) {
                        console.warn('[RAG Worker] ⚠️ Error actualizando progreso (no crítico):', updateError.message);
                    }
                }
            } catch (insertError) {
                console.error(`[RAG Worker] ❌ Error insertando batch de chunks ${insertBatchStart + 1}-${insertBatchEnd}:`, insertError.message);
                failedChunks += insertBatch.length;

                // Si el error es un timeout, intentar dividir el batch y continuar
                if (insertError.message?.includes('timeout') ||
                    insertError.message?.includes('statement timeout') ||
                    insertError.message?.includes('canceling statement')) {
                    console.warn(`[RAG Worker] ⚠️ Timeout en batch, intentando dividir y continuar...`);
                    try {
                        // Intentar insertar uno por uno
                        for (const chunk of insertBatch) {
                            try {
                                await insertChunksBatch([chunk]);
                                processedCount++;
                            } catch (singleError) {
                                console.error(`[RAG Worker] ❌ Error insertando chunk individual:`, singleError.message);
                                failedChunks++;
                            }
                        }
                    } catch (retryError) {
                        console.error(`[RAG Worker] ❌ Error en reintento de batch dividido:`, retryError.message);
                    }
                }
                // Continuar con el siguiente batch en lugar de fallar todo
            }
        }
    }

    const completedAt = new Date().toISOString();
    const processingTime = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000 / 60); // minutos

    console.log(`[RAG Worker] ========================================`);
    console.log(`[RAG Worker] ✅ PROCESAMIENTO COMPLETADO EXITOSAMENTE`);
    console.log(`[RAG Worker] Job ID: ${job.id}`);
    console.log(`[RAG Worker] Archivo: ${job.file_name}`);
    console.log(`[RAG Worker] Chunks procesados: ${processedCount}/${chunks.length}${failedChunks > 0 ? ` (${failedChunks} fallidos)` : ''}`);
    console.log(`[RAG Worker] Tiempo de procesamiento: ${processingTime} minutos`);
    console.log(`[RAG Worker] ========================================`);

    // 7. Marcar job como completado
    const { error: completeError } = await supabase
        .from('file_processing_jobs')
        .update({
            status: 'completed',
            updated_at: completedAt,
            metadata: {
                ...job.metadata,
                completedAt: completedAt,
                chunksProcessed: processedCount,
                chunksTotal: chunks.length,
                processingTimeMinutes: processingTime
            }
        })
        .eq('id', job.id);

    if (completeError) {
        console.error(`[RAG Worker] ❌ Error marcando job como completado:`, completeError);
        throw completeError;
    }

    console.log(`[RAG Worker] ✅ Job marcado como 'completed' en Supabase`);

    // 8. CONSOLIDACIÓN DE SUB-JOBS - Si es un sub-job, verificar si todos completaron
    if (job.metadata?.isSubJob && job.metadata?.parentJobId) {
        console.log(`[RAG Worker] 📊 Sub-job completado, verificando job principal...`);

        try {
            // Obtener job principal
            const { data: parentJob, error: parentError } = await supabase
                .from('file_processing_jobs')
                .select('*')
                .eq('id', job.metadata.parentJobId)
                .single();

            if (!parentError && parentJob) {
                const subJobsCompleted = (parentJob.metadata?.subJobsCompleted || 0) + 1;
                const subJobsTotal = parentJob.metadata?.subJobsTotal || 0;

                console.log(`[RAG Worker] 📊 Progreso del job principal: ${subJobsCompleted}/${subJobsTotal} partes completadas`);

                // Actualizar contador de sub-jobs completados
                await supabase
                    .from('file_processing_jobs')
                    .update({
                        metadata: {
                            ...parentJob.metadata,
                            subJobsCompleted: subJobsCompleted
                        },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', parentJob.id);

                // Si todos los sub-jobs completaron, marcar el job principal como completado
                if (subJobsCompleted >= subJobsTotal) {
                    console.log(`[RAG Worker] 🎉 Todos los sub-jobs completados, consolidando job principal...`);

                    // Obtener total de chunks de todos los sub-jobs
                    const { data: subJobs, error: subJobsError } = await supabase
                        .from('file_processing_jobs')
                        .select('metadata')
                        .in('id', parentJob.metadata.subJobIds);

                    if (!subJobsError && subJobs) {
                        const totalChunks = subJobs.reduce((sum, sj) => {
                            const chunksProcessed = sj.metadata?.chunksProcessed || 0;
                            return sum + chunksProcessed;
                        }, 0);

                        console.log(`[RAG Worker] 📊 Total de chunks procesados en todas las partes: ${totalChunks}`);

                        // Marcar job principal como completado
                        await supabase
                            .from('file_processing_jobs')
                            .update({
                                status: 'completed',
                                metadata: {
                                    ...parentJob.metadata,
                                    chunksProcessed: totalChunks,
                                    chunksTotal: totalChunks,
                                    completedAt: new Date().toISOString()
                                },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', parentJob.id);

                        console.log(`[RAG Worker] ✅ Job principal ${parentJob.id} marcado como completado`);

                        // Marcar material como completado
                        const parentMaterialId = parentJob.metadata?.materialId || parentJob.material_id;
                        if (parentMaterialId) {
                            await supabase
                                .from('materials')
                                .update({
                                    rag_status: 'completed',
                                    processed_at: new Date().toISOString()
                                })
                                .eq('id', parentMaterialId);

                            console.log(`[RAG Worker] ✅ Material ${parentMaterialId} marcado como completado`);
                        }
                    }
                }
            } else if (parentError) {
                console.error(`[RAG Worker] ❌ Error obteniendo job principal:`, parentError);
            }
        } catch (consolidationError) {
            console.error(`[RAG Worker] ❌ Error en consolidación de sub-jobs:`, consolidationError);
            // No fallar el procesamiento si la consolidación falla
        }
    }

    // 9. Actualizar material (solo si NO es un sub-job, ya que los sub-jobs actualizan el material del parent)
    if (job.metadata?.materialId && !job.metadata?.isSubJob) {
        const { error: materialError } = await supabase
            .from('materials')
            .update({
                rag_status: 'completed',
                processed_at: completedAt
            })
            .eq('id', job.metadata.materialId);

        if (materialError) {
            console.warn(`[RAG Worker] ⚠️ Error actualizando material (no crítico):`, materialError);
        } else {
            console.log(`[RAG Worker] ✅ Material actualizado con rag_status='completed'`);
        }
    }

    res.status(200).json({
        success: true,
        jobId: job.id,
        chunksProcessed: chunks.length
    });

} catch (error) {
    console.error(`[RAG Worker] ========================================`);
    console.error(`[RAG Worker] ❌ ERROR EN PROCESAMIENTO`);
    if (job) {
        console.error(`[RAG Worker] Job ID: ${job.id}`);
        console.error(`[RAG Worker] Archivo: ${job.file_name}`);
        console.error(`[RAG Worker] Estado antes del error: ${job.status || 'unknown'}`);
    }
    console.error(`[RAG Worker] Error:`, error.message || error);
    console.error(`[RAG Worker] Stack:`, error.stack);
    console.error(`[RAG Worker] ========================================`);

    // Determinar tipo de error para mensaje más claro
    let errorMessage = error.message || 'Error desconocido';
    const errorDetails = {
        code: error.code,
        status: error.response?.status,
        message: error.message,
        stack: error.stack
    };

    console.error('[RAG Worker] Detalles del error:', JSON.stringify(errorDetails, null, 2));

    // Manejar error 25P02 (Transaction Aborted) - resetear a pending en lugar de failed
    if (error.code === '25P02' || error.message?.includes('transaction is aborted') || error.message?.includes('commands ignored until end of transaction block')) {
        console.log(`[RAG Worker] ⚠️ Error 25P02 detectado (Transaction Aborted) - reseteando job a 'pending' para reintento`);

        if (job?.id) {
            try {
                const resetResult = await supabase
                    .from('file_processing_jobs')
                    .update({
                        status: 'pending', // Resetear a pending para reintento
                        error_message: null, // Limpiar error anterior
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', job.id);

                if (resetResult.error) {
                    console.error('[RAG Worker] Error reseteando job a pending:', resetResult.error);
                    // Si falla el reset, marcar como failed
                    errorMessage = `Error de transacción en base de datos. El job se intentará procesar nuevamente en la próxima ejecución.`;
                } else {
                    console.log(`[RAG Worker] ✅ Job ${job.id} reseteado a 'pending' - se reintentará automáticamente`);
                    return res.status(200).json({
                        success: false,
                        message: 'Error de transacción detectado. Job reseteado a pending para reintento automático.',
                        willRetry: true,
                        jobId: job.id
                    });
                }
            } catch (resetError) {
                console.error('[RAG Worker] Error crítico reseteando job:', resetError);
            }
        }

        // Si no se pudo resetear, continuar con el flujo normal de error
        errorMessage = `Error de transacción en base de datos. El job se intentará procesar nuevamente en la próxima ejecución.`;
    } else if (error.message?.includes('Timeout') || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = `Timeout: El procesamiento del archivo tardó demasiado. Para archivos muy grandes (hasta ${MAX_FILE_SIZE / (1024 * 1024)}MB), el procesamiento puede tardar hasta 60 minutos. Intenta nuevamente o considera dividir el archivo.`;
    } else if (error.message?.includes('too large') || error.message?.includes('demasiado grande')) {
        errorMessage = `Archivo demasiado grande: ${errorMessage}. El límite máximo es ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    } else if (error.response?.status === 413 || error.statusCode === 413) {
        errorMessage = 'El archivo excede el límite de tamaño permitido (413 Request Entity Too Large)';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
    } else if (error.message?.includes('memory') || error.message?.includes('Memory') || error.message?.includes('heap')) {
        errorMessage = 'Error de memoria: El archivo es demasiado grande para procesar en una sola ejecución. Considera dividirlo en partes más pequeñas.';
    } else if (error.message?.includes('No Google Drive token found') || error.message?.includes('token')) {
        errorMessage = 'Error de autenticación: No se encontró el token de Google Drive. Por favor, reconecta tu cuenta de Google Drive.';
    } else if (error.message?.includes('No se pudo extraer texto')) {
        errorMessage = error.message; // Ya es descriptivo
    } else if (error.message?.includes('corrupto') || error.message?.includes('inválido') || error.message?.includes('InvalidPDF') || error.message?.includes('Invalid PDF')) {
        errorMessage = error.message; // Ya es descriptivo para PDFs corruptos
    } else if (error.message?.includes('timeout') || error.message?.includes('statement timeout') || error.message?.includes('canceling statement')) {
        errorMessage = `Timeout en base de datos: El procesamiento está generando demasiados chunks y Supabase está tardando demasiado en insertarlos. Esto puede ocurrir con archivos muy grandes (más de 500MB). El job se marcará como fallido, pero puedes intentar procesar el archivo nuevamente o dividirlo en partes más pequeñas.`;
    } else {
        // Error genérico - incluir más detalles
        errorMessage = `Error procesando archivo: ${error.message || 'Error desconocido'}. Si el problema persiste, verifica los logs del worker.`;
    }

    // Marcar job como fallido si tenemos el ID
    if (job?.id) {
        try {
            const updateResult = await supabase
                .from('file_processing_jobs')
                .update({
                    status: 'failed',
                    error_message: errorMessage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', job.id);

            if (updateResult.error) {
                console.error('[RAG Worker] Error actualizando job en BD:', updateResult.error);
            } else {
                console.log(`[RAG Worker] Job ${job.id} marcado como failed con mensaje: ${errorMessage}`);
            }

            // También actualizar el material si existe
            if (job.metadata?.materialId) {
                const materialUpdate = await supabase
                    .from('materials')
                    .update({
                        rag_status: 'failed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', job.metadata.materialId);

                if (materialUpdate.error) {
                    console.error('[RAG Worker] Error actualizando material en BD:', materialUpdate.error);
                } else {
                    console.log(`[RAG Worker] Material ${job.metadata.materialId} marcado como failed`);
                }
            }
        } catch (updateError) {
            console.error('[RAG Worker] Error crítico actualizando estado del job:', updateError);
            // Intentar al menos loguear el error en la consola
            console.error('[RAG Worker] Job ID:', job.id);
            console.error('[RAG Worker] Error original:', errorMessage);
        }
    } else {
        console.error('[RAG Worker] No se puede actualizar el job porque no hay job.id disponible');
    }

    // Enviar respuesta de error
    const errorResponse = {
        success: false,
        error: errorMessage,
        jobId: job?.id,
        errorCode: error.code,
        errorStatus: error.response?.status || error.statusCode,
        timestamp: new Date().toISOString()
    };

    // Solo incluir stack en desarrollo
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = error.stack;
    }

    console.error('[RAG Worker] Enviando respuesta de error:', JSON.stringify(errorResponse, null, 2));

    res.status(500).json(errorResponse);
}
};
