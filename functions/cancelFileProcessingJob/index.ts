// functions/cancelFileProcessingJob/index.ts
// Cloud Function para cancelar trabajos de procesamiento

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
      console.error('[cancelFileProcessingJob] Variables de entorno faltantes:', {
        hasUrl: !!url,
        hasKey: !!key,
        usingDefaults: !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY
      });
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
    }
    
    try {
      supabase = createClient(url, key);
      console.log('[cancelFileProcessingJob] Cliente de Supabase inicializado correctamente');
    } catch (error) {
      console.error('[cancelFileProcessingJob] Error inicializando Supabase:', error);
      throw error;
    }
  }
  return supabase;
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
      const { data: jobData, error: fetchError } = await getSupabase()
        .from('file_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError || !jobData) {
        setCorsHeaders();
        res.status(404).json({
          success: false,
          error: 'Job no encontrado',
        });
        return;
      }

      // Tipo para jobData
      const job = jobData as any;

      // Verificar que el job pertenece al usuario
      const jobUserId = job.user_id || job.metadata?.userId;
      if (jobUserId !== user.userId) {
        setCorsHeaders();
        res.status(403).json({
          success: false,
          error: 'No tienes permiso para cancelar este job',
        });
        return;
      }

      // Verificar que el job puede ser cancelado (no completado ni ya cancelado)
      if (job.status === 'completed') {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'No se puede cancelar un job que ya está completado',
        });
        return;
      }

      if (job.status === 'cancelled' || job.status === 'failed') {
        // Si ya está cancelado o fallido, verificar si el error es de cancelación manual
        if (job.error_message === 'Cancelado por el usuario') {
          setCorsHeaders();
          res.status(400).json({
            success: false,
            error: 'El job ya está cancelado',
          });
          return;
        }
      }

      // Actualizar el job a estado 'cancelled' en Supabase
      const { error: updateError } = await (getSupabase()
        .from('file_processing_jobs') as any)
        .update({
          status: 'cancelled',
          error_message: 'Cancelado por el usuario',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('[cancelFileProcessingJob] Error actualizando job:', updateError);
        throw updateError;
      }

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

