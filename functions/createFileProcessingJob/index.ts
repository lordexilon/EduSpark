// functions/createFileProcessingJob/index.ts
// Cloud Function para crear trabajos de procesamiento

import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { requireAuth } from './auth';

// Inicializar Firebase Admin (lazy initialization)
let db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!db) {
    try {
      initializeApp();
    } catch (error) {
      // App ya inicializado, ignorar
    }
    db = getFirestore();
  }
  return db;
}

interface CreateJobRequest {
  fileId: string;
  fileName: string;
  courseId: string;
  userId: string;
  category: 'book' | 'bibliography' | 'syllabus' | 'other';
  materialId?: string;
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

      // Validar campos requeridos
      if (!fileId || !fileName || !courseId || !category) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'fileId, fileName, courseId y category son requeridos',
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

      // Crear documento en Firestore
      const now = Timestamp.now();
      const jobData = {
        status: 'pending',
        jobType: 'split',
        sourceFileId: fileId,
        sourceFileName: fileName,
        courseId,
        pdfType: analysis?.pdfType || 'unknown',
        totalPages: analysis?.totalPages,
        chunksTotal: estimatedChunks, // Estimación inicial
        chunksProcessed: 0,
        createdAt: now,
        updatedAt: now,
        metadata: {
          userId,
          chunkSize,
          estimatedCosts: analysis?.estimatedCosts,
          category: category,
          materialId: materialId,
          ragProcessingType: ragProcessingType, // 'full' o 'readonly'
        },
      };

      const docRef = await getDb().collection('file_processing_jobs').add(jobData);

      setCorsHeaders();
      res.status(200).json({
        success: true,
        jobId: docRef.id,
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

