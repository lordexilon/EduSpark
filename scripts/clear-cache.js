#!/usr/bin/env node

// =====================================================
// Script para limpiar caché y resolver problemas de carga
// =====================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧹 Limpiando caché de EduSpark...\n');

// Función para eliminar directorios de forma segura
function safeRemove(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Eliminado: ${dirPath}`);
    } else {
      console.log(`ℹ️  No existe: ${dirPath}`);
    }
  } catch (error) {
    console.warn(`⚠️  Error eliminando ${dirPath}:`, error.message);
  }
}

// Limpiar directorios de caché
safeRemove('.vite-cache');
safeRemove('dist');
safeRemove('node_modules/.vite');
safeRemove('.vite-temp'); // also clean Vite temp folder

// Limpiar caché de npm
try {
  console.log('🧽 Limpiando caché de npm...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Caché de npm limpiado');
} catch (error) {
  console.warn('⚠️  Error limpiando caché de npm:', error.message);
}

// Mensajes de ayuda para el navegador
console.log('\n💡 Para limpiar el caché del navegador:');
console.log('1. Presiona F12 en el navegador');
console.log('2. Ve a Application > Storage > Clear Storage');
console.log('3. O presiona Ctrl+Shift+R para hard refresh');

console.log('\n✨ ¡Caché limpiado! Ahora ejecuta:');
console.log('npm run dev');

console.log('\n🔧 Comandos disponibles:');
console.log('- npm run dev:clean : Inicia con caché limpio');
console.log('- window.forceReload(): Función global para recargar desde consola del navegador');
console.log('- Presiona F12+D en el navegador para ver el monitor de debug');