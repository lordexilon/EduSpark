// functions/processPendingJobs/index.ts
// Cloud Function para procesar jobs pendientes manualmente
// Útil para diagnóstico y procesamiento de emergencia

import { onRequest } from 'firebase-functions/v2/https';

const RAG_WORKER_URL = process.env.RAG_WORKER_URL || 'https://us-central1-eduspark-py.cloudfunctions.net/rag-worker';

/**
 * Función para procesar jobs pendientes manualmente
 * Se puede invocar desde la consola de Google Cloud o mediante HTTP
 */
export const processPendingJobs = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    maxInstances: 1,
    invoker: 'public', // Permitir invocaciones públicas para diagnóstico
  },
  async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    console.log('[processPendingJobs] Iniciando procesamiento de jobs pendientes...');

    try {
      // Invocar rag-worker
      const response = await fetch(RAG_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[processPendingJobs] ❌ RAG worker respondió con error ${response.status}: ${errorText}`);
        res.status(response.status).json({
          success: false,
          error: `RAG worker error: ${response.status}`,
          details: errorText
        });
        return;
      }

      const result = await response.text();
      console.log(`[processPendingJobs] ✅ RAG worker procesado exitosamente. Resultado: ${result}`);

      res.status(200).json({
        success: true,
        message: 'Jobs pendientes procesados',
        result: result
      });
    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' 
        ? 'Timeout después de 30 segundos' 
        : error.message || 'Error desconocido';
      
      console.error(`[processPendingJobs] ❌ Error procesando jobs pendientes:`, errorMessage);
      
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

