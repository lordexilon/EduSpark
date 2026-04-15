#!/usr/bin/env node
/**
 * Script para procesar respuestas de conocimiento general y convertirlas en chunks RAG
 * 
 * Uso:
 *   npm run process-feedback
 *   O directamente: npx tsx scripts/process-feedback-batch.ts
 * 
 * Opciones:
 *   --course-id <id>  - Procesar solo un curso específico
 *   --limit <number>  - Límite de respuestas a procesar (default: 50)
 */

import { runFeedbackBatchProcessing } from '../src/services/feedbackProcessingService';

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
let courseId: number | undefined;
let limit: number = 50;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--course-id' && args[i + 1]) {
    courseId = parseInt(args[i + 1], 10);
    if (isNaN(courseId)) {
      console.error('❌ Error: --course-id debe ser un número válido');
      process.exit(1);
    }
  }
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    if (isNaN(limit) || limit < 1) {
      console.error('❌ Error: --limit debe ser un número mayor a 0');
      process.exit(1);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando procesamiento batch de retroalimentación...');
    console.log('='.repeat(60));
    
    if (courseId) {
      console.log(`📚 Procesando solo curso ID: ${courseId}`);
    } else {
      console.log('📚 Procesando todos los cursos');
    }
    console.log(`📊 Límite por lote: ${limit}`);
    console.log('');
    
    // Importar dinámicamente para manejar mejor los errores
    const result = await runFeedbackBatchProcessing(courseId);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Procesamiento completado:');
    console.log(`   📝 Respuestas procesadas: ${result.processed}`);
    console.log(`   📦 Chunks creados: ${result.chunksCreated}`);
    console.log(`   ⚠️  Errores: ${result.errors}`);
    console.log('');
    
    if (result.processed > 0) {
      console.log(`🎉 ¡Excelente! Se procesaron ${result.processed} respuestas y se crearon ${result.chunksCreated} chunks RAG.`);
    } else {
      console.log('ℹ️  No había respuestas pendientes para procesar.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error en procesamiento:', error);
    console.error('');
    
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

// Ejecutar
main();
