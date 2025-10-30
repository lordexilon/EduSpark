#!/usr/bin/env node

// =====================================================
// Script de emergencia para forzar recarga completa
// =====================================================

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚨 SCRIPT DE EMERGENCIA - Forzando recarga completa...\n');

// Matar todos los procesos de Node.js
try {
  console.log('🔄 Matando procesos de Node.js...');
  
  // En Windows
  try {
    execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
    console.log('✅ Procesos de Node.js terminados');
  } catch (e) {
    console.log('ℹ️  No hay procesos de Node.js ejecutándose');
  }
} catch (error) {
  console.warn('⚠️  Error matando procesos:', error.message);
}

// Limpiar directorios de caché

function safeRemove(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Eliminado: ${dirPath}`);
    }
  } catch (error) {
    console.warn(`⚠️  Error eliminando ${dirPath}:`, error.message);
  }
}

console.log('🧹 Limpiando caché...');
safeRemove('.vite-cache');
safeRemove('dist');
safeRemove('node_modules/.vite');

// Limpiar caché de npm
try {
  console.log('🧽 Limpiando caché de npm...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Caché de npm limpiado');
} catch (error) {
  console.warn('⚠️  Error limpiando caché de npm:', error.message);
}

console.log('\n✨ ¡Limpieza completa terminada!');
console.log('🚀 Ahora ejecuta: npm run dev');
console.log('\n💡 Si el problema persiste:');
console.log('1. Cierra completamente el navegador');
console.log('2. Abre una nueva ventana');
console.log('3. Ve a http://localhost:5173');
console.log('4. Presiona Ctrl+Shift+R para hard refresh');
