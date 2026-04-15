#!/usr/bin/env node

// =====================================================
// Script de Ejecución de Tests para Audio-Tutor Multi-Agente
// =====================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const TEST_CONFIG = {
  timeout: 30000, // 30 segundos
  retries: 3,
  parallel: false,
  coverage: true,
  verbose: true
};

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para logging
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para ejecutar comando
function runCommand(command, description) {
  log(`\n${colors.cyan}🔄 ${description}...${colors.reset}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: TEST_CONFIG.timeout
    });
    
    log(`${colors.green}✅ ${description} completado${colors.reset}`);
    return { success: true, output };
  } catch (error) {
    log(`${colors.red}❌ Error en ${description}:${colors.reset}`);
    log(error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Función para verificar dependencias
function checkDependencies() {
  log(`${colors.blue}🔍 Verificando dependencias...${colors.reset}`);
  
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'tests/test-setup.ts'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`${colors.red}❌ Archivo requerido no encontrado: ${file}${colors.reset}`);
      return false;
    }
  }
  
  log(`${colors.green}✅ Todas las dependencias encontradas${colors.reset}`);
  return true;
}

// Función para configurar entorno de testing
function setupTestEnvironment() {
  log(`${colors.blue}🔧 Configurando entorno de testing...${colors.reset}`);
  
  // Verificar variables de entorno
  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_N8N_WEBHOOK_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`${colors.yellow}⚠️ Variables de entorno faltantes: ${missingVars.join(', ')}${colors.reset}`);
    log(`${colors.yellow}   Usando valores de prueba...${colors.reset}`);
  }
  
  // Crear archivo .env.test si no existe
  if (!fs.existsSync('.env.test')) {
    const envContent = `
# Variables de entorno para testing
GEMINI_API_KEY=${process.env.GEMINI_API_KEY || 'test-api-key'}
VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || 'https://test.supabase.co'}
VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'}
VITE_N8N_WEBHOOK_URL=${process.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/test'}
NODE_ENV=test
`;
    
    fs.writeFileSync('.env.test', envContent);
    log(`${colors.green}✅ Archivo .env.test creado${colors.reset}`);
  }
  
  return true;
}

// Función para ejecutar tests unitarios
function runUnitTests() {
  log(`${colors.blue}🧪 Ejecutando tests unitarios...${colors.reset}`);
  
  const testFiles = [
    'tests/agents/VoiceAgent.test.ts',
    'tests/agents/RAGAgent.test.ts',
    'tests/agents/ContextAgent.test.ts'
  ];
  
  let allPassed = true;
  
  for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
      const result = runCommand(
        `npx jest ${testFile} --verbose --coverage`,
        `Test unitario: ${path.basename(testFile)}`
      );
      
      if (!result.success) {
        allPassed = false;
      }
    } else {
      log(`${colors.yellow}⚠️ Archivo de test no encontrado: ${testFile}${colors.reset}`);
    }
  }
  
  return allPassed;
}

// Función para ejecutar tests de integración
function runIntegrationTests() {
  log(`${colors.blue}🔗 Ejecutando tests de integración...${colors.reset}`);
  
  const testFile = 'tests/integration/AgentSystem.test.ts';
  
  if (fs.existsSync(testFile)) {
    const result = runCommand(
      `npx jest ${testFile} --verbose --coverage`,
      'Tests de integración'
    );
    
    return result.success;
  } else {
    log(`${colors.yellow}⚠️ Archivo de test no encontrado: ${testFile}${colors.reset}`);
    return false;
  }
}

// Función para ejecutar tests E2E
function runE2ETests() {
  log(`${colors.blue}🌐 Ejecutando tests end-to-end...${colors.reset}`);
  
  const testFile = 'tests/e2e/PersonalizationE2E.test.ts';
  
  if (fs.existsSync(testFile)) {
    const result = runCommand(
      `npx jest ${testFile} --verbose --timeout=60000`,
      'Tests E2E de personalización'
    );
    
    return result.success;
  } else {
    log(`${colors.yellow}⚠️ Archivo de test no encontrado: ${testFile}${colors.reset}`);
    return false;
  }
}

// Función para generar reporte de cobertura
function generateCoverageReport() {
  log(`${colors.blue}📊 Generando reporte de cobertura...${colors.reset}`);
  
  const result = runCommand(
    'npx jest --coverage --coverageReporters=text --coverageReporters=html',
    'Reporte de cobertura'
  );
  
  if (result.success) {
    log(`${colors.green}✅ Reporte de cobertura generado en coverage/index.html${colors.reset}`);
  }
  
  return result.success;
}

// Función para limpiar archivos temporales
function cleanup() {
  log(`${colors.blue}🧹 Limpiando archivos temporales...${colors.reset}`);
  
  const tempFiles = [
    '.env.test',
    'coverage',
    'test-results'
  ];
  
  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      try {
        if (fs.statSync(file).isDirectory()) {
          fs.rmSync(file, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file);
        }
        log(`${colors.green}✅ Eliminado: ${file}${colors.reset}`);
      } catch (error) {
        log(`${colors.yellow}⚠️ No se pudo eliminar: ${file}${colors.reset}`);
      }
    }
  }
}

// Función principal
async function main() {
  log(`${colors.bright}${colors.blue}🚀 Iniciando tests del Audio-Tutor Multi-Agente${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  const startTime = Date.now();
  const results = {
    unit: false,
    integration: false,
    e2e: false,
    coverage: false
  };
  
  try {
    // Verificar dependencias
    if (!checkDependencies()) {
      log(`${colors.red}❌ Dependencias faltantes. Abortando tests.${colors.reset}`);
      process.exit(1);
    }
    
    // Configurar entorno
    if (!setupTestEnvironment()) {
      log(`${colors.red}❌ Error configurando entorno. Abortando tests.${colors.reset}`);
      process.exit(1);
    }
    
    // Ejecutar tests unitarios
    results.unit = runUnitTests();
    
    // Ejecutar tests de integración
    results.integration = runIntegrationTests();
    
    // Ejecutar tests E2E
    results.e2e = runE2ETests();
    
    // Generar reporte de cobertura
    results.coverage = generateCoverageReport();
    
    // Mostrar resumen
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    log(`${colors.blue}================================================${colors.reset}`);
    log(`${colors.bright}📋 Resumen de Tests${colors.reset}`);
    log(`${colors.blue}================================================${colors.reset}`);
    log(`Tests Unitarios: ${results.unit ? '✅ PASARON' : '❌ FALLARON'}`);
    log(`Tests Integración: ${results.integration ? '✅ PASARON' : '❌ FALLARON'}`);
    log(`Tests E2E: ${results.e2e ? '✅ PASARON' : '❌ FALLARON'}`);
    log(`Cobertura: ${results.coverage ? '✅ GENERADA' : '❌ ERROR'}`);
    log(`${colors.blue}================================================${colors.reset}`);
    log(`⏱️ Duración total: ${duration.toFixed(2)} segundos`);
    
    const allPassed = results.unit && results.integration && results.e2e;
    
    if (allPassed) {
      log(`${colors.green}🎉 ¡Todos los tests pasaron exitosamente!${colors.reset}`);
      process.exit(0);
    } else {
      log(`${colors.red}❌ Algunos tests fallaron. Revisar logs arriba.${colors.reset}`);
      process.exit(1);
    }
    
  } catch (error) {
    log(`${colors.red}❌ Error inesperado: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    // Limpiar archivos temporales
    cleanup();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`${colors.red}❌ Error fatal: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  main,
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  generateCoverageReport
};
