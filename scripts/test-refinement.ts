import 'dotenv/config';

// Hack para emular import.meta.env en entornos Node/tsx
// Esto permite que los archivos que usan Vite (como supabase.ts) funcionen en el test
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = process.env;
}

import { ContextAgent } from '../src/modules/tutor/agents/ContextAgent';

async function runTest() {
  console.log('🚀 Iniciando Test de Refinamiento de Query (ContextAgent)');
  console.log('------------------------------------------------------');

  // Usamos una instancia de ContextAgent
  const contextAgent = new ContextAgent();

  // Caso 1: Pregunta coloquial/sucia
  const dirtyQuery = "qué onda con lo de la afasia?";
  console.log('\nCaso 1: Pregunta Coloquial');
  console.log('Input:', dirtyQuery);

  try {
    // @ts-ignore - Accediendo a método privado para el test
    const refined = await contextAgent.refineQueryWithGemini(dirtyQuery);
    console.log('Output Refinado:', refined);

    if (refined !== dirtyQuery && refined.length > dirtyQuery.length) {
      console.log('✅ TEST PASSED: La query fue enriquecida.');
    } else {
      console.warn('⚠️ TEST WARNING: La query no pareció cambiar significativamente.');
    }
  } catch (error: any) {
    console.error('❌ TEST FAILED: Error durante el refinamiento:', error.message);
    if (error.message.includes('not yet implemented')) {
      console.log('💡 Nota: El error es esperado porque aún no hemos terminado la implementación completa.');
    }
  }

  console.log('\n------------------------------------------------------');
  console.log('Fin del test.');
}

runTest().catch(err => {
  console.error('Error fatal en el script de prueba:', err);
  process.exit(1);
});
