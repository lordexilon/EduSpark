// workers/file-processing-worker/index.ts
// Punto de entrada del worker (Cloud Run compatible)

import { runWorker } from './worker';
import express from 'express';
import cors from 'cors';
import { createJob } from './firestoreService';

// Variables de entorno (Cloud Run las inyectará)
const WORKER_INTERVAL = parseInt(process.env.WORKER_INTERVAL_MS || '30000', 10);
// Usar puerto 3001 por defecto para desarrollo local, 8080 para producción (Cloud Run)
const PORT = parseInt(process.env.PORT || '3001', 10);

console.log('[Worker] Iniciando RAG Processing Worker...');
console.log(`[Worker] Puerto: ${PORT}`);
console.log(`[Worker] Intervalo: ${WORKER_INTERVAL}ms`);

/**
 * Función principal
 */
async function main() {
  // Iniciar servidor Express
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoints for Cloud Run
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'rag-processing-worker',
      version: '1.0.0'
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint para crear jobs
  app.post('/jobs', async (req, res) => {
    try {
      const jobData = req.body;
      console.log('[API] Recibida solicitud de creación de trabajo:', jobData.jobType);

      if (!jobData.courseId || !jobData.jobType) {
        return res.status(400).json({ error: 'Faltan datos requeridos (courseId, jobType)' });
      }

      // Para trabajos de tipo index_text_content, procesarlos directamente
      if (jobData.jobType === 'index_text_content') {
        console.log('[API] Procesando index_text_content directamente...');

        try {
          const { processTextContentJob } = await import('./worker');

          const tempJob = {
            id: `temp_${Date.now()}`,
            status: 'pending' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...jobData
          };

          await processTextContentJob(tempJob);

          console.log(`[API] Trabajo procesado exitosamente (directo)`);
          return res.status(200).json({ success: true, jobId: tempJob.id, processed: true });

        } catch (error: any) {
          console.error('[API] Error procesando trabajo directo:', error);
          return res.status(500).json({ error: error.message || 'Error procesando contenido' });
        }
      }

      // Para otros tipos de trabajos, usar Firestore
      const jobId = await createJob({
        status: 'pending',
        ...jobData
      });

      console.log(`[API] Trabajo creado exitosamente: ${jobId}`);
      res.status(200).json({ success: true, jobId });

      // Trigger inmediato del worker
      console.log('[API] Triggering worker immediately...');
      runWorker().catch(err => console.error('[Worker] Error en trigger manual:', err));

    } catch (error: any) {
      console.error('[API] Error creando trabajo:', error);
      res.status(500).json({ error: error.message || 'Error interno' });
    }
  });

  // Endpoint para cambiar contraseña de usuario (requiere service role key)
  app.post('/admin/change-password', async (req, res) => {
    try {
      const { userId, newPassword } = req.body;

      if (!userId || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan datos requeridos (userId, newPassword)' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'La contraseña debe tener al menos 6 caracteres' 
        });
      }

      // Crear cliente de Supabase con service role key para operaciones de administración
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        console.error('[API] Error: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
        return res.status(500).json({ 
          success: false, 
          error: 'Configuración del servidor incompleta' 
        });
      }

      const supabaseAdmin = createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Usar la API de administración de Supabase para cambiar la contraseña
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        console.error('[API] Error cambiando contraseña:', error);
        return res.status(400).json({ 
          success: false, 
          error: error.message || 'Error al cambiar la contraseña' 
        });
      }

      console.log(`[API] Contraseña cambiada exitosamente para usuario: ${userId}`);
      return res.status(200).json({ success: true });

    } catch (error: any) {
      console.error('[API] Error en cambio de contraseña:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      });
    }
  });

  // Iniciar servidor
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API] Servidor escuchando en http://0.0.0.0:${PORT}`);
  });

  // Ejecutar worker inmediatamente
  console.log('[Worker] Ejecutando ciclo inicial...');
  await runWorker().catch(error => {
    console.error('[Worker] Error en ejecución inicial:', error);
  });

  // Ejecutar worker periódicamente
  setInterval(async () => {
    await runWorker().catch(error => {
      console.error('[Worker] Error en ejecución periódica:', error);
    });
  }, WORKER_INTERVAL);

  console.log('[Worker] Worker iniciado y ejecutándose...');
}

// Manejar señales de terminación (Cloud Run)
process.on('SIGTERM', () => {
  console.log('[Worker] Recibida señal SIGTERM, terminando gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] Recibida señal SIGINT, terminando...');
  process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar worker
main().catch(error => {
  console.error('[Worker] Error fatal:', error);
  process.exit(1);
});
