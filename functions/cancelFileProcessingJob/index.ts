// functions/cancelFileProcessingJob/index.ts
// Cloud Function para cancelar trabajos de procesamiento

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

/**
 * Cloud Function: Cancelar trabajo de procesamiento
 */
export const cancelFileProcessingJob = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    cpu: 1,
    invoker: 'public', // Permitir invocaciones no autenticadas (la autenticación se maneja dentro de la función)
  },
  async (req, res) => {
    // Helper para establecer headers CORS
    const setCorsHeaders = () => {
      try {
        const origin = req.headers.origin || '*';
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Max-Age', '3600');
      } catch (error) {
        console.error('Error estableciendo headers CORS:', error);
      }
    };

    // Establecer headers CORS ANTES de cualquier otra operación
    setCorsHeaders();

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
      setCorsHeaders();
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
      const { jobId } = req.body;

      if (!jobId) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'jobId es requerido',
        });
        return;
      }

      // Obtener el job para verificar que pertenece al usuario
      const jobRef = getDb().collection('file_processing_jobs').doc(jobId);
      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        setCorsHeaders();
        res.status(404).json({
          success: false,
          error: 'Job no encontrado',
        });
        return;
      }

      const jobData = jobDoc.data();

      // Verificar que el job pertenece al usuario
      if (jobData?.metadata?.userId !== user.userId) {
        setCorsHeaders();
        res.status(403).json({
          success: false,
          error: 'No tienes permiso para cancelar este job',
        });
        return;
      }

      // Verificar que el job puede ser cancelado (no completado ni ya cancelado)
      if (jobData?.status === 'completed') {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'No se puede cancelar un job que ya está completado',
        });
        return;
      }

      if (jobData?.status === 'cancelled') {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'El job ya está cancelado',
        });
        return;
      }

      // Actualizar el job a estado 'cancelled'
      await jobRef.update({
        status: 'cancelled',
        updatedAt: Timestamp.now(),
        errorMessage: 'Cancelado por el usuario',
      });

      console.log(`✅ Job ${jobId} cancelado por usuario ${user.userId}`);

      setCorsHeaders();
      res.status(200).json({
        success: true,
        message: 'Job cancelado exitosamente',
      });
    } catch (error: any) {
      console.error('Error cancelando job:', error);
      setCorsHeaders();
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }
  }
);

