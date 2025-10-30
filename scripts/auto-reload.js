#!/usr/bin/env node

// =====================================================
// Script de recarga automática para desarrollo
// =====================================================

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔄 Iniciando recarga automática...\n');

// Función para matar procesos de Node.js
function killNodeProcesses() {
  try {
    console.log('🔄 Matando procesos de Node.js...');
    execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
    console.log('✅ Procesos terminados');
  } catch (e) {
    console.log('ℹ️  No hay procesos de Node.js ejecutándose');
  }
}

// Función para limpiar caché
function clearCache() {
  console.log('🧹 Limpiando caché...');
  
  const dirsToRemove = ['.vite-cache', 'dist', 'node_modules/.vite'];
  
  dirsToRemove.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Eliminado: ${dir}`);
      }
    } catch (error) {
      console.warn(`⚠️  Error eliminando ${dir}:`, error.message);
    }
  });
}

// Función para limpiar caché de npm
function clearNpmCache() {
  try {
    console.log('🧽 Limpiando caché de npm...');
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('✅ Caché de npm limpiado');
  } catch (error) {
    console.warn('⚠️  Error limpiando caché de npm:', error.message);
  }
}

// Función principal
async function autoReload() {
  console.log('🚨 AUTO-RELOAD INICIADO\n');
  
  // 1. Matar procesos
  killNodeProcesses();
  
  // 2. Limpiar caché
  clearCache();
  
  // 3. Limpiar caché de npm
  clearNpmCache();
  
  console.log('\n✨ Limpieza completada');
  console.log('🚀 Iniciando servidor...\n');
  
  // 4. Iniciar servidor
  try {
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error.message);
  }
}

// Ejecutar
autoReload();
