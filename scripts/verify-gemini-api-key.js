#!/usr/bin/env node

// =====================================================
// Script de diagnóstico para verificar API Key de Gemini
// =====================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Diagnóstico de API Key de Gemini\n');
console.log('='.repeat(60));

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para verificar si un archivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Función para leer variables de entorno de un archivo .env
function readEnvFile(filePath) {
  if (!fileExists(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const envVars = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Eliminar comillas si existen
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    }
  });

  return envVars;
}

// Verificar API key en diferentes ubicaciones
async function diagnoseGeminiApiKey() {
  const issues = [];
  const findings = [];

  log('\n📁 Verificando archivos de configuración...', 'cyan');
  
  // Buscar archivos .env
  const envFiles = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env.development'),
    path.join(process.cwd(), '.env.production'),
  ];

  const foundEnvFiles = [];
  envFiles.forEach(file => {
    if (fileExists(file)) {
      foundEnvFiles.push(file);
      log(`  ✓ Encontrado: ${path.basename(file)}`, 'green');
    }
  });

  if (foundEnvFiles.length === 0) {
    log('  ⚠ No se encontraron archivos .env', 'yellow');
    findings.push('No hay archivos .env en el proyecto');
  }

  // Leer variables de entorno de los archivos encontrados
  log('\n🔑 Buscando API Key en variables de entorno...', 'cyan');
  
  const envVars = {};
  foundEnvFiles.forEach(file => {
    const vars = readEnvFile(file);
    Object.assign(envVars, vars);
  });

  // Verificar variables de entorno del sistema
  const systemVars = {
    VITE_GEMINI_API_KEY: process.env.VITE_GEMINI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    API_KEY: process.env.API_KEY,
  };

  // Combinar todas las fuentes
  const allSources = {
    'Archivo .env': envVars.VITE_GEMINI_API_KEY || envVars.GEMINI_API_KEY || envVars.API_KEY,
    'VITE_GEMINI_API_KEY (sistema)': systemVars.VITE_GEMINI_API_KEY,
    'GEMINI_API_KEY (sistema)': systemVars.GEMINI_API_KEY,
    'API_KEY (sistema)': systemVars.API_KEY,
  };

  let foundKey = null;
  let foundSource = null;

  for (const [source, key] of Object.entries(allSources)) {
    if (key && key.trim() && 
        key !== 'PLACEHOLDER_API_KEY' && 
        key !== 'undefined' && 
        key !== 'null') {
      foundKey = key.trim();
      foundSource = source;
      log(`  ✓ API Key encontrada en: ${source}`, 'green');
      log(`    Key: ${foundKey.substring(0, 20)}... (${foundKey.length} caracteres)`, 'blue');
      break;
    }
  }

  if (!foundKey) {
    log('  ❌ No se encontró API Key configurada', 'red');
    issues.push('No se encontró VITE_GEMINI_API_KEY ni GEMINI_API_KEY en variables de entorno');
    findings.push('La API key debe configurarse en un archivo .env o como variable de entorno del sistema');
  }

  // Verificar API key hardcodeada en el código
  log('\n🔍 Verificando código fuente...', 'cyan');
  
  const envTsPath = path.join(process.cwd(), 'audio-tutor', 'utils', 'env.ts');
  if (fileExists(envTsPath)) {
    const envTsContent = fs.readFileSync(envTsPath, 'utf-8');
    
    // Verificar si hay una key hardcodeada
    const hardcodedMatch = envTsContent.match(/HARDCODED_KEY\s*=\s*['"]([^'"]+)['"]/);
    if (hardcodedMatch) {
      const hardcodedKey = hardcodedMatch[1];
      log(`  ⚠ Se encontró una API Key hardcodeada en env.ts`, 'yellow');
      log(`    Key: ${hardcodedKey.substring(0, 20)}...`, 'yellow');
      
      if (!foundKey) {
        log(`  ℹ Se usará la key hardcodeada como fallback`, 'blue');
        foundKey = hardcodedKey;
        foundSource = 'Código hardcodeado (fallback)';
      } else if (foundKey === hardcodedKey) {
        log(`  ⚠ La key configurada coincide con la hardcodeada`, 'yellow');
        findings.push('La API key configurada es la misma que la hardcodeada en el código');
      }
    }
  }

  // Verificar formato de la key
  log('\n✅ Verificando formato de API Key...', 'cyan');
  
  if (foundKey) {
    if (foundKey.startsWith('AIza')) {
      log('  ✓ El formato de la key es correcto (empieza con AIza)', 'green');
    } else {
      log('  ⚠ El formato de la key parece incorrecto', 'yellow');
      issues.push('La API key no tiene el formato esperado (debería empezar con "AIza")');
    }

    if (foundKey.length < 30) {
      log('  ⚠ La key parece muy corta', 'yellow');
      issues.push('La API key parece muy corta (normalmente tienen más de 30 caracteres)');
    }
  }

  // Probar la API key si está disponible
  if (foundKey && foundKey.startsWith('AIza')) {
    log('\n🌐 Probando conexión con Gemini API...', 'cyan');
    
    try {
      const testPrompt = 'Responde solo con "OK" si recibes este mensaje.';
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${foundKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: testPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 10,
            }
          })
        }
      );

      log(`  Status: ${response.status} ${response.statusText}`, 'blue');

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          log('  ✓ API Key válida y funcionando correctamente!', 'green');
          log(`  ✓ Respuesta recibida: ${text.trim()}`, 'green');
          findings.push('La API key es válida y puede comunicarse con Gemini');
        } else {
          log('  ⚠ La API respondió pero sin contenido', 'yellow');
          findings.push('La API respondió pero no devolvió contenido de texto');
        }
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        log(`  ❌ Error en la API: ${response.status}`, 'red');
        
        if (response.status === 400) {
          log('  ⚠ La API key podría ser inválida o mal formada', 'yellow');
          issues.push('La API key no es válida (error 400 de Gemini)');
        } else if (response.status === 403) {
          log('  ❌ La API key no tiene permisos o está deshabilitada', 'red');
          issues.push('La API key no tiene permisos (error 403 - verificar en Google AI Studio)');
        } else if (response.status === 429) {
          log('  ⚠ Límite de cuota excedido', 'yellow');
          issues.push('Se ha excedido el límite de cuota de la API');
        } else {
          log(`  ⚠ Error desconocido: ${errorData.error?.message || errorText}`, 'yellow');
          issues.push(`Error de API: ${response.status} - ${errorData.error?.message || errorText}`);
        }
      }
    } catch (error) {
      log(`  ❌ Error al probar la API: ${error.message}`, 'red');
      issues.push(`Error de red al probar la API: ${error.message}`);
    }
  } else if (!foundKey) {
    log('\n⚠ No se puede probar la API sin una key válida', 'yellow');
  }

  // Resumen
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 RESUMEN', 'cyan');
  log('='.repeat(60));

  if (issues.length === 0 && foundKey) {
    log('\n✅ No se encontraron problemas', 'green');
    log(`✓ API Key encontrada: ${foundSource}`, 'green');
    log(`✓ API Key válida y funcionando`, 'green');
  } else {
    log('\n⚠ Problemas encontrados:', 'yellow');
    issues.forEach((issue, i) => {
      log(`  ${i + 1}. ${issue}`, 'red');
    });
  }

  if (findings.length > 0) {
    log('\nℹ Hallazgos adicionales:', 'blue');
    findings.forEach((finding, i) => {
      log(`  ${i + 1}. ${finding}`, 'blue');
    });
  }

  // Recomendaciones
  if (issues.length > 0) {
    log('\n💡 Recomendaciones:', 'cyan');
    
    if (!foundKey || foundSource === 'Código hardcodeado (fallback)') {
      log('  1. Crear un archivo .env en la raíz del proyecto', 'blue');
      log('  2. Agregar: VITE_GEMINI_API_KEY=tu_api_key_aqui', 'blue');
      log('  3. Obtener API key en: https://aistudio.google.com/', 'blue');
      log('  4. Reiniciar el servidor de desarrollo', 'blue');
    }
    
    if (issues.some(i => i.includes('403'))) {
      log('  1. Verificar que la API key esté habilitada en Google AI Studio', 'blue');
      log('  2. Verificar que la API de Gemini esté habilitada en tu proyecto', 'blue');
    }
    
    if (issues.some(i => i.includes('cuota'))) {
      log('  1. Verificar tu cuota en Google Cloud Console', 'blue');
      log('  2. Considerar actualizar tu plan si es necesario', 'blue');
    }
  }

  log('\n' + '='.repeat(60) + '\n', 'cyan');
  
  return {
    success: issues.length === 0 && foundKey,
    keyFound: !!foundKey,
    keySource: foundSource,
    issues,
    findings,
  };
}

// Ejecutar diagnóstico
diagnoseGeminiApiKey()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error ejecutando diagnóstico:', error);
    process.exit(1);
  });

