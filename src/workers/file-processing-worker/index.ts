// workers/file-processing-worker/index.ts
// Punto de entrada del worker

import { runWorker } from './worker';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde el root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');
console.log('[Worker] Intentando cargar .env desde:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('[Worker] Error cargando .env:', result.error);
} else {
  console.log('[Worker] Variables cargadas:', Object.keys(result.parsed || {}).length);
}
import express from 'express';
import cors from 'cors';
import { createJob } from './firestoreService';

const WORKER_INTERVAL = parseInt(process.env.WORKER_INTERVAL || '30000', 10); // 30 segundos por defecto
const PORT = process.env.PORT || 3001;

/**
 * Función principal
 */
async function main() {
  console.log('[Worker] Iniciando worker de procesamiento de archivos...');
  console.log(`[Worker] Intervalo: ${WORKER_INTERVAL}ms`);

  // Iniciar servidor Express para recibir trabajos desde el frontend (bypassing Firestore rules)
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Aumentar límite para contenido de texto largo

  app.post('/jobs', async (req, res) => {
    try {
      const jobData = req.body;
      console.log('[API] Recibida solicitud de creación de trabajo:', jobData.jobType);

      // Validar datos básicos
      if (!jobData.courseId || !jobData.jobType) {
        return res.status(400).json({ error: 'Faltan datos requeridos (courseId, jobType)' });
      }

      // Para trabajos de tipo index_text_content, procesarlos directamente sin Firestore
      if (jobData.jobType === 'index_text_content') {
        console.log('[API] Procesando index_text_content directamente...');

        try {
          // Importar el procesador
          const { processTextContentJob } = await import('./worker.js');

          // Crear un job temporal con ID ficticio
          const tempJob = {
            id: `temp_${Date.now()}`,
            status: 'pending' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...jobData
          };

          // Procesar inmediatamente
          await processTextContentJob(tempJob);

          console.log(`[API] Trabajo procesado exitosamente (directo)`);
          return res.status(200).json({ success: true, jobId: tempJob.id, processed: true });

        } catch (error: any) {
          console.error('[API] Error procesando trabajo directo:', error);
          return res.status(500).json({ error: error.message || 'Error procesando contenido' });
        }
      }

      // Para otros tipos de trabajos, usar Firestore (requiere credenciales)
      const jobId = await createJob({
        status: 'pending',
        ...jobData
      });

      console.log(`[API] Trabajo creado exitosamente: ${jobId}`);
      res.status(200).json({ success: true, jobId });

      // Trigger inmediato del worker (opcional, para procesar más rápido)
      console.log('[API] Triggering worker immediately...');
      runWorker().catch(err => console.error('[Worker] Error en trigger manual:', err));

    } catch (error: any) {
      console.error('[API] Error creando trabajo:', error);
      res.status(500).json({ error: error.message || 'Error interno' });
    }
  });

  app.listen(PORT, () => {
    console.log(`[API] Servidor escuchando en http://localhost:${PORT}`);
  });

  // Ejecutar worker inmediatamente
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

// Manejar señales de terminación
process.on('SIGTERM', () => {
  console.log('[Worker] Recibida señal SIGTERM, terminando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] Recibida señal SIGINT, terminando...');
  process.exit(0);
});

// Iniciar worker
main().catch(error => {
  console.error('[Worker] Error fatal:', error);
  process.exit(1);
});

