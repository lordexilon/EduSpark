// functions/createFileProcessingJob/index.ts
// Cloud Function para crear trabajos de procesamiento

import { onRequest } from 'firebase-functions/v2/https';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './auth';

// Valores por defecto para Supabase (se pueden sobrescribir con variables de entorno)
const DEFAULT_SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const DEFAULT_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

// Inicializar Supabase (lazy initialization - solo cuando se necesite)
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  // Inicialización lazy: solo cuando se llama la función, no durante el análisis del código
  if (!supabase) {
    // Usar variables de entorno si están disponibles, sino usar valores por defecto
    const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      console.error('[createFileProcessingJob] Variables de entorno faltantes:', {
        hasUrl: !!url,
        hasKey: !!key,
        usingDefaults: !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY
      });
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
    }

    try {
      supabase = createClient(url, key);
      console.log('[createFileProcessingJob] Cliente de Supabase inicializado correctamente');
    } catch (error) {
      console.error('[createFileProcessingJob] Error inicializando Supabase:', error);
      throw error;
    }
  }
  return supabase;
}

/**
 * Invoca el rag-worker con retry automático
 * @param jobId ID del job creado
 * @param maxRetries Número máximo de intentos (default: 3)
 * @returns Promise<boolean> true si se invocó exitosamente, false si falló después de todos los intentos
 */
async function invokeRagWorkerWithRetry(jobId: string, maxRetries = 3): Promise<boolean> {
  const ragWorkerUrl = process.env.RAG_WORKER_URL || 'https://us-central1-eduspark-py.cloudfunctions.net/rag-worker';

  console.log(`[createFileProcessingJob] 🔍 Configuración RAG Worker:`, {
    url: ragWorkerUrl,
    fromEnv: !!process.env.RAG_WORKER_URL,
    jobId: jobId
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[createFileProcessingJob] 🔄 Intento ${attempt}/${maxRetries} de invocar RAG worker para job ${jobId} en URL: ${ragWorkerUrl}`);

      // Usar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

      const requestBody = {
        jobId: jobId,
        action: 'process'
      };

      console.log(`[createFileProcessingJob] 📤 Enviando request a RAG worker:`, requestBody);

      const response = await fetch(ragWorkerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[createFileProcessingJob] 📥 Respuesta recibida del RAG worker:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const responseText = await response.text();
        console.log(`[createFileProcessingJob] ✅ RAG worker invocado exitosamente en intento ${attempt} para job ${jobId}. Respuesta: ${responseText}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`[createFileProcessingJob] ❌ RAG worker respondió con error ${response.status} en intento ${attempt}:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          url: ragWorkerUrl
        });

        // Si es un error 4xx (cliente), no reintentar
        if (response.status >= 400 && response.status < 500) {
          console.error(`[createFileProcessingJob] ❌ Error del cliente (${response.status}), no se reintentará. El job quedará en cola.`);
          return false;
        }
      }
    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' ? 'Timeout después de 15 segundos' : error.message;
      const errorStack = error.stack || 'No stack trace';

      console.error(`[createFileProcessingJob] ❌ Error en intento ${attempt}/${maxRetries}:`, {
        error: errorMessage,
        name: error.name,
        stack: errorStack,
        url: ragWorkerUrl,
        jobId: jobId
      });

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[createFileProcessingJob] ⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[createFileProcessingJob] ❌ No se pudo invocar RAG worker después de ${maxRetries} intentos para job ${jobId}. El job quedará en cola y será procesado por el scheduler.`);
  console.error(`[createFileProcessingJob] ⚠️ IMPORTANTE: Verifica que el RAG worker esté desplegado y accesible en: ${ragWorkerUrl}`);
  return false;
}

interface CreateJobRequest {
  fileId: string;
  fileName: string;
  courseId: string;
  userId: string;
  category: 'book' | 'bibliography' | 'syllabus' | 'other';
  materialId: string; // REQUERIDO: El material debe crearse antes de crear el job
  ragProcessingType?: 'full' | 'readonly'; // Tipo de procesamiento RAG
  analysis?: {
    totalPages: number;
    pdfType: 'text' | 'scanned' | 'unknown';
    estimatedCosts: {
      ocr: number;
      embeddings: number;
      cloudRun: number;
      firestore: number;
      total: number;
    };
    requiresSplitting?: boolean; // Flag para archivos grandes (>150MB)
    targetPartSizeMB?: number; // Tamaño objetivo de cada parte (100MB)
    estimatedParts?: number; // Número estimado de partes
  };
  chunkSize?: number;
}

/**
 * Cloud Function: Crear trabajo de procesamiento
 */
export const createFileProcessingJob = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    maxInstances: 10,
    cpu: 1,
    invoker: 'public', // Permitir invocaciones no autenticadas (la autenticación se maneja dentro de la función)
  },
  async (req, res) => {
    // Helper para establecer headers CORS - DEBE usarse en todas las respuestas
    const setCorsHeaders = () => {
      try {
        const origin = req.headers.origin || '*';
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Max-Age', '3600');
      } catch (error) {
        console.error('Error estableciendo headers CORS:', error);
      }
    };

    // Establecer headers CORS ANTES de cualquier otra operación
    setCorsHeaders();

    // Manejar preflight OPTIONS - DEBE ser lo primero
    if (req.method === 'OPTIONS') {
      // Establecer headers CORS explícitamente antes de responder
      setCorsHeaders();
      // Responder con 204 No Content (estándar para OPTIONS)
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      setCorsHeaders();
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // Verificar autenticación
    const user = await requireAuth(req, res);
    if (!user) {
      // requireAuth ya envió la respuesta de error con headers CORS
      return;
    }

    try {
      const {
        fileId,
        fileName,
        courseId,
        userId: requestUserId,
        category,
        materialId,
        ragProcessingType = 'full', // Por defecto procesamiento completo
        analysis,
        chunkSize = 60, // Optimizado: aumentado de 25 a 60 para reducir costos
      }: CreateJobRequest = req.body;

      // Validar campos requeridos con mensajes específicos
      const missingFields: string[] = [];
      if (!fileId) missingFields.push('fileId');
      if (!fileName) missingFields.push('fileName');
      if (!courseId) missingFields.push('courseId');
      if (!category) missingFields.push('category');
      if (!materialId) missingFields.push('materialId'); // REQUERIDO: El material debe crearse antes

      if (missingFields.length > 0) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}. El materialId es obligatorio y debe crearse antes de crear el job.`,
        });
        return;
      }

      // Validar que category sea un valor válido
      const validCategories = ['book', 'bibliography', 'syllabus', 'other'];
      if (!validCategories.includes(category)) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `Categoría inválida: ${category}. Debe ser uno de: ${validCategories.join(', ')}`,
        });
        return;
      }

      // Validar que ragProcessingType sea válido
      if (ragProcessingType && !['full', 'readonly'].includes(ragProcessingType)) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `ragProcessingType inválido: ${ragProcessingType}. Debe ser 'full' o 'readonly'`,
        });
        return;
      }

      // Validar que courseId sea un número válido
      const courseIdNum = Number(courseId);
      if (isNaN(courseIdNum) || courseIdNum <= 0) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `courseId debe ser un número válido mayor a 0. Recibido: ${courseId}`,
        });
        return;
      }

      // Validar que el materialId existe en la base de datos
      const { data: materialData, error: materialError } = await getSupabase()
        .from('materials')
        .select('id, course_id')
        .eq('id', materialId)
        .single();

      if (materialError || !materialData) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `El materialId proporcionado (${materialId}) no existe en la base de datos. El material debe crearse antes de crear el job.`,
        });
        return;
      }

      // Validar que el material pertenece al curso correcto
      if ((materialData as any).course_id !== courseIdNum) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `El materialId (${materialId}) no pertenece al curso especificado (${courseIdNum}).`,
        });
        return;
      }

      // Usar userId del token autenticado (más seguro)
      const userId = requestUserId || user.userId;

      // Verificar que el userId del request coincida con el del token (si se proporciona)
      if (requestUserId && requestUserId !== user.userId) {
        setCorsHeaders();
        res.status(403).json({
          success: false,
          error: 'No tienes permiso para crear trabajos para otro usuario',
        });
        return;
      }

      // Estimar número de chunks basado en totalPages
      const estimatedChunks = analysis?.totalPages
        ? Math.ceil(analysis.totalPages / chunkSize)
        : undefined;

      // Validar que chunkSize sea un número válido
      const chunkSizeNum = Number(chunkSize);
      if (isNaN(chunkSizeNum) || chunkSizeNum <= 0) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: `chunkSize debe ser un número válido mayor a 0. Recibido: ${chunkSize}`,
        });
        return;
      }

      // Crear documento en Supabase (migrado desde Firestore)
      const now = new Date().toISOString();
      const jobData = {
        material_id: materialId, // REQUERIDO: Ya validado que existe
        course_id: courseIdNum, // Usar el número validado
        user_id: userId,
        bucket_path: fileId, // El fileId de Google Drive se guarda en bucket_path
        file_name: fileName,
        status: 'pending',
        metadata: {
          jobType: 'split',
          userId,
          chunkSize: chunkSizeNum, // Usar el número validado
          sourceFileId: fileId, // También guardar en metadata para facilitar búsqueda
          source: 'google_drive', // Indicar que el archivo está en Google Drive
          driveFileId: fileId, // ID del archivo en Google Drive (necesario para descargar)
          estimatedCosts: analysis?.estimatedCosts || null,
          category: category,
          materialId: materialId, // REQUERIDO: Ya validado que existe
          ragProcessingType: ragProcessingType || 'full', // 'full' o 'readonly', por defecto 'full'
          totalPages: analysis?.totalPages || null,
          pdfType: analysis?.pdfType || 'unknown',
          chunksTotal: estimatedChunks || null, // Estimación inicial
          chunksProcessed: 0,
          // Flags para división de archivos grandes
          requiresSplitting: analysis?.requiresSplitting || false,
          targetPartSizeMB: analysis?.targetPartSizeMB || 100,
          estimatedParts: analysis?.estimatedParts || 1,
          isSubJob: false, // Flag para identificar jobs principales vs sub-jobs
          parentJobId: null, // ID del job principal (null para jobs principales)
        },
        created_at: now,
        updated_at: now,
      };

      console.log('[createFileProcessingJob] Intentando crear job en Supabase con datos:', {
        ...jobData,
        metadata: { ...jobData.metadata, estimatedCosts: '...' } // No loggear costs completos
      });

      const { data, error } = await getSupabase()
        .from('file_processing_jobs')
        .insert([jobData] as any) // Usar array y any para evitar problemas de tipos
        .select('id')
        .single();

      if (error) {
        console.error('[createFileProcessingJob] ❌ Error detallado creando job en Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });

        // Mensajes de error más descriptivos
        let errorMessage = error.message || 'Error al crear el trabajo de procesamiento';

        if (error.code === '23503') { // Foreign key violation
          errorMessage = 'Error: El curso o material especificado no existe. Por favor, verifica los datos.';
        } else if (error.code === '23505') { // Unique violation
          errorMessage = 'Error: Ya existe un trabajo de procesamiento para este archivo.';
        } else if (error.code === '23502') { // Not null violation
          errorMessage = 'Error: Faltan datos requeridos para crear el trabajo.';
        } else if (error.code === 'PGRST116') { // Row Level Security violation
          errorMessage = 'Error: No tienes permisos para crear trabajos de procesamiento.';
        }

        throw new Error(errorMessage);
      }

      const jobId = (data as any)?.id;
      if (!jobId) {
        console.error('[createFileProcessingJob] ❌ No se recibió el ID del job creado. Data recibida:', data);
        throw new Error('No se recibió el ID del job creado. El trabajo puede no haberse guardado correctamente.');
      }

      console.log(`[createFileProcessingJob] ✅ Job creado exitosamente en Supabase: ${jobId} para archivo ${fileId}`);

      // Invocar el rag-worker para procesar el job inmediatamente con retry
      // Esto es asíncrono y no bloquea la respuesta
      console.log(`[createFileProcessingJob] 🚀 Iniciando invocación asíncrona del RAG worker para job ${jobId}`);
      invokeRagWorkerWithRetry(jobId)
        .then(success => {
          if (success) {
            console.log(`[createFileProcessingJob] ✅ RAG worker invocado exitosamente para job ${jobId}. El procesamiento debería comenzar pronto.`);
          } else {
            console.warn(`[createFileProcessingJob] ⚠️ No se pudo invocar RAG worker para job ${jobId}. El job quedará en cola y será procesado por el scheduler.`);
            console.warn(`[createFileProcessingJob] ⚠️ Verifica los logs anteriores para ver el error específico.`);
          }
        })
        .catch(error => {
          // No fallar si el trigger falla - el job está creado y se procesará eventualmente por el scheduler
          console.error(`[createFileProcessingJob] ❌ Error inesperado al invocar RAG worker para job ${jobId}:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        });

      setCorsHeaders();
      res.status(200).json({
        success: true,
        jobId: jobId,
      });
    } catch (error: any) {
      console.error('Error creando trabajo:', error);
      setCorsHeaders();
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }
  }
);

