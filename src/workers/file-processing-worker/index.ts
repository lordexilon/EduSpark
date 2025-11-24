// workers/file-processing-worker/index.ts
// Punto de entrada del worker

import { runWorker } from './worker';

const WORKER_INTERVAL = parseInt(process.env.WORKER_INTERVAL || '30000', 10); // 30 segundos por defecto

/**
 * Función principal
 */
async function main() {
  console.log('[Worker] Iniciando worker de procesamiento de archivos...');
  console.log(`[Worker] Intervalo: ${WORKER_INTERVAL}ms`);

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

