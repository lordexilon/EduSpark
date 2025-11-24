// functions/processFileJob/index.ts
// Cloud Function para procesar archivos y generar chunks con embeddings

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

type PdfType = 'text' | 'scanned' | 'unknown';

// Definir secrets y variables de entorno
const supabaseUrl = defineSecret('SUPABASE_URL');
const supabaseServiceRoleKey = defineSecret('SUPABASE_SERVICE_ROLE_KEY');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Importaciones dinámicas para evitar timeout en deployment
let google: any = null;
let createClient: any = null;
let GoogleGenerativeAI: any = null;

// Inicialización lazy
let db: ReturnType<typeof getFirestore> | null = null;
let supabase: any = null;
let genAI: any = null;

function getDb() {
  if (!db) {
    try {
      initializeApp();
    } catch (error) {
      // Ya inicializado
    }
    db = getFirestore();
  }
  return db;
}

async function getSupabase() {
  if (!supabase) {
    if (!createClient) {
      const supabaseModule = await import('@supabase/supabase-js');
      createClient = supabaseModule.createClient;
    }
    
    let url = supabaseUrl.value();
    const key = supabaseServiceRoleKey.value();
    
    if (!url || !key) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
    }
    
    // Limpiar la URL de Supabase (misma lógica que en getGoogleDriveToken)
    url = url.trim();
    const urlPattern = /https?:\/\/[a-zA-Z0-9.-]+\.(supabase\.co|supabase\.io)(?:\/|$)/;
    const urlMatch = url.match(urlPattern);
    if (urlMatch) {
      url = urlMatch[0].replace(/\/+$/, '');
    } else {
      const fallbackMatch = url.match(/https?:\/\/[^\s\/]+/);
      if (fallbackMatch) {
        url = fallbackMatch[0];
        url = url.replace(/(\.co[m]?)[^\/]*$/, '$1');
      }
    }
    
    console.log(`🔧 Inicializando cliente de Supabase con URL: ${url.substring(0, 50)}...`);
    
    // Configurar cliente de Supabase con opciones para Cloud Functions
    // Agregar timeout más largo para operaciones de inserción masiva
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        // Usar fetch global de Node.js 18+
        fetch: fetch,
        headers: {
          'Content-Type': 'application/json',
        },
        // Timeout más largo para operaciones de inserción (120 segundos para archivos grandes)
        // Soporta archivos de hasta 850 MB (4350+ páginas)
        timeout: 120000,
      },
      db: {
        // Configurar timeout de statement en PostgreSQL
        schema: 'public',
      },
    });
    
    console.log('✅ Cliente de Supabase inicializado');
  }
  return supabase;
}

async function getGenAI() {
  if (!genAI) {
    if (!GoogleGenerativeAI) {
      const genAIModule = await import('@google/generative-ai');
      GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
    }
    
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY debe estar configurado');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

interface GoogleToken {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

/**
 * Obtiene el token de acceso de Google Drive del usuario desde Supabase
 * Usa la API REST directamente para evitar problemas con el cliente de Supabase
 */
async function getGoogleDriveToken(userId: string): Promise<string | null> {
  let url = supabaseUrl.value();
  const key = supabaseServiceRoleKey.value();
  
  // Limpiar y validar la URL de Supabase
  // Remover cualquier texto extraño que pueda haberse colado
  url = url.trim();
  
  // Extraer solo la primera URL válida si hay múltiples
  const urlPattern = /https?:\/\/[a-zA-Z0-9.-]+\.(supabase\.co|supabase\.io)(?:\/|$)/;
  const urlMatch = url.match(urlPattern);
  if (urlMatch) {
    url = urlMatch[0].replace(/\/+$/, ''); // Remover trailing slashes
  } else {
    // Si no encontramos un patrón válido, intentar extraer cualquier URL que comience con https://
    const fallbackMatch = url.match(/https?:\/\/[^\s\/]+/);
    if (fallbackMatch) {
      url = fallbackMatch[0];
      // Asegurar que termine en .co o .com sin paths adicionales
      url = url.replace(/(\.co[m]?)[^\/]*$/, '$1');
    }
  }
  
  console.log(`🔍 Buscando token de Google Drive para userId: ${userId}`);
  console.log(`  - Supabase URL (raw): ${supabaseUrl.value().substring(0, 100)}...`);
  console.log(`  - Supabase URL (cleaned): ${url}`);
  console.log(`  - Service Role Key configurado: ${key ? 'Sí' : 'No'}`);
  
  // Validar que la URL sea válida
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('❌ URL de Supabase inválida:', url);
    throw new Error('URL de Supabase inválida. Debe comenzar con http:// o https://');
  }
  
  try {
    // Primero, verificar si hay tokens para este usuario (para diagnóstico)
    console.log('  - Verificando todos los tokens del usuario...');
    const fullUrl = `${url}/rest/v1/user_google_tokens?user_id=eq.${userId}`;
    console.log(`  - URL completa: ${fullUrl}`);
    
    let allTokensResponse;
    try {
      const tokensUrl = `${url}/rest/v1/user_google_tokens?user_id=eq.${userId}&select=id,service_type,expires_at,created_at`;
      console.log(`  - Fetch URL: ${tokensUrl}`);
      allTokensResponse = await fetch(
        tokensUrl,
        {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          // Agregar timeout y opciones adicionales
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
            return controller.signal;
          })(),
        }
      );
    } catch (fetchError: any) {
      console.error('  - ❌ Error en fetch (verificando todos los tokens):', {
        message: fetchError.message,
        name: fetchError.name,
        code: fetchError.code,
        cause: fetchError.cause,
        stack: fetchError.stack,
      });
      console.error('  - URL intentada:', `${url}/rest/v1/user_google_tokens?user_id=eq.${userId}`);
      console.error('  - Service Role Key presente:', key ? 'Sí (longitud: ' + key.length + ')' : 'No');
      throw fetchError;
    }
    
    if (allTokensResponse.ok) {
      const allTokens = await allTokensResponse.json();
      console.log(`  - Tokens encontrados para este usuario: ${allTokens?.length || 0}`);
      if (allTokens && allTokens.length > 0) {
        allTokens.forEach((t: any, index: number) => {
          console.log(`    Token ${index + 1}: service_type="${t.service_type}", expires_at="${t.expires_at}", created_at="${t.created_at}"`);
        });
      }
    } else {
      const errorText = await allTokensResponse.text();
      console.error('  - Error verificando tokens:', {
        status: allTokensResponse.status,
        statusText: allTokensResponse.statusText,
        error: errorText,
      });
    }
    
    // Buscar token específico de Drive o 'both'
    // Hacer dos consultas separadas para mayor confiabilidad
    console.log('  - Buscando token de Drive...');
    let tokens: any[] = [];
    
    // Primero intentar buscar token de tipo 'drive'
    let driveResponse;
    try {
      driveResponse = await fetch(
        `${url}/rest/v1/user_google_tokens?user_id=eq.${userId}&service_type=eq.drive&select=access_token,refresh_token,expires_at,service_type&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          signal: AbortSignal.timeout(10000), // 10 segundos timeout
        }
      );
    } catch (fetchError: any) {
      console.error('  - ❌ Error en fetch (buscando token drive):', {
        message: fetchError.message,
        name: fetchError.name,
        code: fetchError.code,
        cause: fetchError.cause,
        stack: fetchError.stack,
      });
      throw fetchError;
    }
    
    if (driveResponse.ok) {
      const driveTokens = await driveResponse.json();
      if (driveTokens && driveTokens.length > 0) {
        tokens = driveTokens;
        console.log('  - ✅ Token de tipo "drive" encontrado');
      }
    } else {
      const errorText = await driveResponse.text();
      console.log(`  - ⚠️ Error buscando token "drive": ${driveResponse.status} - ${errorText.substring(0, 100)}`);
    }
    
    // Si no se encontró token de 'drive', buscar 'both'
    if (tokens.length === 0) {
      console.log('  - Buscando token de tipo "both"...');
      let bothResponse;
      try {
        bothResponse = await fetch(
          `${url}/rest/v1/user_google_tokens?user_id=eq.${userId}&service_type=eq.both&select=access_token,refresh_token,expires_at,service_type&limit=1`,
          {
            method: 'GET',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            signal: AbortSignal.timeout(10000), // 10 segundos timeout
          }
        );
      } catch (fetchError: any) {
        console.error('  - ❌ Error en fetch (buscando token both):', {
          message: fetchError.message,
          name: fetchError.name,
          code: fetchError.code,
          cause: fetchError.cause,
          stack: fetchError.stack,
        });
        throw fetchError;
      }
      
      if (bothResponse.ok) {
        const bothTokens = await bothResponse.json();
        if (bothTokens && bothTokens.length > 0) {
          tokens = bothTokens;
          console.log('  - ✅ Token de tipo "both" encontrado');
        }
      } else {
        const errorText = await bothResponse.text();
        console.log(`  - ⚠️ Error buscando token "both": ${bothResponse.status} - ${errorText.substring(0, 100)}`);
      }
    }
    
    if (!tokens || tokens.length === 0) {
      console.error(`❌ No se encontró token de Google Drive para userId: ${userId}`);
      console.log('  - El usuario necesita conectar su cuenta de Google Drive desde el perfil');
      console.log('  - Verificando si hay tokens de otros tipos...');
      
      // Verificar si hay algún token para este usuario (ya lo hicimos arriba, pero lo dejamos para referencia)
      if (allTokensResponse.ok) {
        const anyTokens = await allTokensResponse.json();
        if (anyTokens && anyTokens.length > 0) {
          console.log(`  - Se encontraron ${anyTokens.length} token(s) pero no son para Drive:`);
          anyTokens.forEach((t: any) => {
            console.log(`    - service_type: ${t.service_type}, expires_at: ${t.expires_at}`);
          });
          console.log('  - SOLUCIÓN: El usuario debe autorizar Google Drive específicamente');
        } else {
          console.log('  - No se encontró ningún token para este usuario');
          console.log('  - SOLUCIÓN: El usuario debe conectar su cuenta de Google desde el perfil');
        }
      }
      
      return null;
    }
    
    const tokenData = tokens[0] as GoogleToken & { service_type: string };
    console.log(`✅ Token encontrado (service_type: ${tokenData.service_type})`);
    
    // Verificar si el token está expirado
    const now = new Date();
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    
    if (expiresAt && expiresAt <= now) {
      console.log(`⚠️ Token expirado (expires_at: ${expiresAt.toISOString()}, ahora: ${now.toISOString()})`);
      
      if (tokenData.refresh_token) {
        console.log('🔄 Intentando refrescar token...');
        try {
          const clientId = process.env.GOOGLE_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) {
            console.error('❌ GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados');
            console.log('  - Intentando usar token expirado como último recurso...');
            return tokenData.access_token;
          }
      
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: tokenData.refresh_token,
              grant_type: 'refresh_token',
            }),
          });
      
          if (!refreshResponse.ok) {
            const errorText = await refreshResponse.text();
            console.error('❌ Error refrescando token:', errorText);
            console.log('  - Intentando usar token expirado como último recurso...');
            return tokenData.access_token;
          }
        
          const refreshed = await refreshResponse.json();
          console.log('✅ Token refrescado exitosamente');
        
          // Actualizar token en Supabase usando API REST
          // Usar el service_type del token encontrado
          const expiresAtStr = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
          const updateResponse = await fetch(
            `${url}/rest/v1/user_google_tokens?user_id=eq.${userId}&service_type=eq.${tokenData.service_type}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                access_token: refreshed.access_token,
                expires_at: expiresAtStr,
              }),
            }
          );
        
          if (!updateResponse.ok) {
            const updateError = await updateResponse.text();
            console.error('⚠️ Error actualizando token en Supabase:', updateError);
          }
        
          return refreshed.access_token;
        } catch (refreshError: any) {
          console.error('❌ Error al refrescar token:', refreshError);
          console.log('  - Intentando usar token expirado como último recurso...');
          return tokenData.access_token;
        }
      } else {
        console.log('⚠️ Token expirado pero no hay refresh_token disponible');
        return tokenData.access_token;
      }
    }
  
    console.log('✅ Token válido, usando directamente');
    return tokenData.access_token;
  } catch (error: any) {
    console.error('❌ Error obteniendo token de Google Drive:', error);
    console.error('  - Tipo de error:', error.name || typeof error);
    console.error('  - Mensaje:', error.message);
    console.error('  - Código:', error.code);
    console.error('  - Causa:', error.cause);
    console.error('  - Stack:', error.stack);
    
    // Si es un error de fetch, agregar información adicional
    if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      console.error('  - 🔍 DIAGNÓSTICO: Error de red al conectar con Supabase');
      console.error('  - URL de Supabase:', url);
      console.error('  - Service Role Key configurado:', key ? `Sí (${key.length} caracteres)` : 'No');
      console.error('  - Posibles causas:');
      console.error('    1. Problema de conectividad de red desde Cloud Function');
      console.error('    2. URL de Supabase incorrecta o inaccesible');
      console.error('    3. Service Role Key inválido o sin permisos');
      console.error('    4. Problema de DNS o firewall');
    }
    
    return null;
  }
}

/**
 * Extrae texto de un PDF con información de páginas
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<{
  text: string;
  pages: Array<{pageNumber: number, text: string}>;
  totalPages: number;
}> {
  try {
    // Importación dinámica para evitar timeout en deployment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    
    const totalPages = data.numpages || 1;
    const fullText = data.text || '';
    
    // Extraer texto por página si está disponible
    const pages: Array<{pageNumber: number, text: string}> = [];
    
    if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
      // pdf-parse puede tener información de páginas
      data.pages.forEach((page: any, index: number) => {
        pages.push({
          pageNumber: index + 1,
          text: page.text || ''
        });
      });
    } else {
      // Si no hay información de páginas, dividir el texto proporcionalmente
      const words = fullText.split(/\s+/);
      const wordsPerPage = totalPages > 0 ? Math.ceil(words.length / totalPages) : words.length;
      
      for (let i = 0; i < totalPages; i++) {
        const start = i * wordsPerPage;
        const end = Math.min(start + wordsPerPage, words.length);
        const pageText = words.slice(start, end).join(' ');
        pages.push({
          pageNumber: i + 1,
          text: pageText
        });
      }
    }
    
    // Limpiar texto extraído (aunque sea de PDF, puede tener ruido)
    const cleanedText = cleanOCRText(fullText);
    const cleanedPages = pages.map(page => ({
      ...page,
      text: cleanOCRText(page.text)
    }));
    
    console.log(`✅ PDF procesado: ${totalPages} páginas, ${cleanedText.length} caracteres (después de limpieza, original: ${fullText.length})`);
    return {
      text: cleanedText,
      pages: cleanedPages,
      totalPages
    };
  } catch (error) {
    console.error('Error extrayendo texto de PDF:', error);
    throw error;
  }
}

/**
 * Extrae texto usando OCR (Google Vision API REST) con información de página
 */
async function extractTextWithOCR(
  fileBuffer: Buffer,
  mimeType: string,
  accessToken: string,
  pageNumber?: number // Para PDFs escaneados, indicar número de página
): Promise<{
  text: string;
  pageNumber: number;
}> {
  try {
    // Usar Google Vision API REST directamente (más ligero que la librería)
    const base64Content = fileBuffer.toString('base64');
    
    const response = await fetch(
      'https://vision.googleapis.com/v1/images:annotate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: base64Content,
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1,
            }],
          }],
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const annotations = data.responses?.[0]?.textAnnotations;
    
    if (!annotations || annotations.length === 0) {
      console.warn('No se detectó texto en la imagen');
      // Fallback: intentar extraer texto directamente si es PDF
      if (mimeType === 'application/pdf') {
        const pdfResult = await extractTextFromPDF(fileBuffer);
        return {
          text: pdfResult.text,
          pageNumber: pageNumber || 1
        };
      }
      return {
        text: '',
        pageNumber: pageNumber || 1
      };
    }
    
    // El primer elemento contiene todo el texto detectado
    let text = annotations[0].description || '';
    
    // Limpiar texto OCR para eliminar ruido y caracteres problemáticos
    text = cleanOCRText(text);
    
    const finalPageNumber = pageNumber || 1;
    console.log(`✅ OCR completado: ${text.length} caracteres detectados en página ${finalPageNumber} (después de limpieza)`);
    
    return {
      text,
      pageNumber: finalPageNumber
    };
  } catch (error: any) {
    console.error('Error en OCR:', error);
    // Fallback: intentar extraer texto directamente si es PDF
    if (mimeType === 'application/pdf') {
      console.log('Intentando extracción directa de PDF como fallback...');
      const pdfResult = await extractTextFromPDF(fileBuffer);
      return {
        text: pdfResult.text,
        pageNumber: pageNumber || 1
      };
    }
    throw new Error(`Error en OCR: ${error.message || 'Error desconocido'}`);
  }
}

/**
 * Limpia texto extraído de OCR eliminando ruido y caracteres problemáticos
 */
function cleanOCRText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // 1. Eliminar caracteres de control (caracteres no imprimibles excepto espacios, saltos de línea y tabs)
  // Esto incluye: \x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F-\x9F
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  // 2. Eliminar secuencias repetitivas de números (más de 4 repeticiones)
  // Ejemplo: "77777777" -> "", "222222222" -> ""
  cleaned = cleaned.replace(/(\d)\1{4,}/g, '');
  
  // 2.1. Eliminar secuencias repetitivas más cortas (2-3 repeticiones) cuando están aisladas
  // Ejemplo: "3 3 3" -> "", "22 22" -> ""
  cleaned = cleaned.replace(/\b(\d)\s+\1\s+\1\b/g, '');
  cleaned = cleaned.replace(/\b(\d)\s+\1\b/g, '');
  
  // 2.2. Eliminar patrones de números aislados repetitivos (ej: "3 7 3 2 3 2 3 22 3 22")
  // Esto elimina secuencias de números de 1-2 dígitos separados por espacios cuando hay muchos
  cleaned = cleaned.replace(/\b\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+/g, '');
  
  // 3. Eliminar secuencias repetitivas de caracteres no alfanuméricos (más de 3 repeticiones)
  // Ejemplo: "####" -> "", "---" -> ""
  cleaned = cleaned.replace(/([^\w\s])\1{3,}/g, '');
  
  // 3.1. Eliminar secuencias más cortas de caracteres especiales repetitivos
  cleaned = cleaned.replace(/([^\w\s])\s*\1\s*\1/g, '');
  
  // 4. Normalizar espacios en blanco múltiples a un solo espacio
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // 5. Eliminar líneas que solo contienen caracteres especiales o números repetidos
  cleaned = cleaned.split('\n')
    .map(line => {
      const trimmed = line.trim();
      // Si la línea solo tiene caracteres especiales, números repetidos o está vacía, eliminarla
      if (!trimmed || /^[\d\s\-_\.]+$/.test(trimmed) && trimmed.length < 3) {
        return '';
      }
      // Si la línea tiene más del 50% de caracteres no alfanuméricos, probablemente es ruido
      const nonAlphaNumeric = (trimmed.match(/[^\w\s]/g) || []).length;
      if (trimmed.length > 0 && nonAlphaNumeric / trimmed.length > 0.5 && trimmed.length < 10) {
        return '';
      }
      return line;
    })
    .filter(line => line.trim().length > 0)
    .join('\n');
  
  // 6. Eliminar caracteres Unicode problemáticos comunes del OCR
  // Caracteres de control Unicode, símbolos de formato, etc.
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, ''); // Zero-width spaces, soft hyphens
  
  // 7. Normalizar saltos de línea múltiples a máximo 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 8. Eliminar espacios al inicio y final de cada línea
  cleaned = cleaned.split('\n')
    .map(line => line.trim())
    .join('\n');
  
  // 9. Eliminar bloques de texto que son principalmente números repetidos o caracteres especiales
  // (útil para eliminar artefactos de OCR en encabezados/pies de página)
  const lines = cleaned.split('\n');
  const cleanedLines = lines.filter(line => {
    if (line.length < 3) return true; // Mantener líneas muy cortas
    // Si más del 70% son números o caracteres especiales, probablemente es ruido
    const numericOrSpecial = (line.match(/[\d\W]/g) || []).length;
    if (numericOrSpecial / line.length > 0.7) {
      return false;
    }
    // Eliminar líneas que son principalmente números aislados separados por espacios
    // Ejemplo: "3 7 3 2 3 22 3 22 1 22 3 222"
    if (/^(\d{1,3}\s+){5,}/.test(line)) {
      return false; // Si tiene 5+ números aislados seguidos, probablemente es ruido
    }
    // Eliminar líneas con muchos números pequeños repetitivos
    // Ejemplo: "3 3 3 22 22 22 55 55"
    const numberPairs = (line.match(/\b\d{1,2}\s+\d{1,2}\b/g) || []).length;
    if (numberPairs > 3) {
      return false; // Si tiene más de 3 pares de números pequeños, probablemente es ruido
    }
    return true;
  });
  
  cleaned = cleanedLines.join('\n');
  
  // 10. Limpiar espacios al inicio y final del texto completo
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Divide texto en chunks usando información real de páginas cuando está disponible
 */
function splitIntoChunks(
  text: string,
  totalPages: number,
  pagesPerChunk: number = 60, // Optimizado: aumentado de 25 a 60 para reducir costos
  pageData?: Array<{pageNumber: number, text: string}> // Información real de páginas
): Array<{text: string, pageStart: number, pageEnd: number}> {
  const chunks: Array<{text: string, pageStart: number, pageEnd: number}> = [];
  
  // Si tenemos información real de páginas, usarla
  if (pageData && pageData.length > 0) {
    console.log(`📄 Usando información real de ${pageData.length} páginas`);
    
    for (let i = 0; i < pageData.length; i += pagesPerChunk) {
      const pageGroup = pageData.slice(i, i + pagesPerChunk);
      const chunkText = pageGroup.map(p => p.text).join(' ').trim();
      
      if (chunkText.length > 0) {
        const pageStart = pageGroup[0].pageNumber;
        const pageEnd = pageGroup[pageGroup.length - 1].pageNumber;
        
        chunks.push({
          text: chunkText,
          pageStart,
          pageEnd
        });
      }
    }
  } else {
    // Fallback: usar estimación basada en palabras
    console.log(`📄 Estimando páginas (no hay información real disponible)`);
    const words = text.split(/\s+/);
    const totalWords = words.length;
    
    // Calcular palabras por página real basado en el texto extraído
    const wordsPerPage = totalPages > 0 ? totalWords / totalPages : 500;
    const wordsPerChunk = pagesPerChunk * wordsPerPage;
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      // Calcular páginas estimadas basadas en posición en el texto
      const estimatedPageStart = Math.max(1, Math.floor(i / wordsPerPage) + 1);
      const estimatedPageEnd = Math.min(
        Math.ceil((i + chunkWords.length) / wordsPerPage),
        totalPages || 1
      );
      
      if (chunkText.trim().length > 0) {
        chunks.push({
          text: chunkText.trim(),
          pageStart: estimatedPageStart,
          pageEnd: estimatedPageEnd
        });
      }
    }
  }
  
  // Si no se generaron chunks, crear uno con todo el texto
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      text: text.trim(),
      pageStart: 1,
      pageEnd: totalPages || 1
    });
  }
  
  return chunks;
}

/**
 * Genera embedding usando Gemini
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = await getGenAI();
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding vacío recibido de Gemini');
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

/**
 * Calcula costos reales basados en métricas reales del procesamiento
 */
function calculateActualCosts(
  totalPages: number,
  pdfType: PdfType,
  totalChunks: number,
  actualChars: number,
  executionTimeSeconds: number,
  firestoreWrites: number,
  firestoreReads: number
): {
  ocr: number;
  embeddings: number;
  cloudRun: number;
  firestore: number;
  total: number;
} {
  // OCR (solo si se usó)
  let ocrCost = 0;
  if (pdfType === 'scanned') {
    if (totalPages <= 1000) {
      ocrCost = (totalPages / 1000) * 1.50;
    } else {
      ocrCost = 1.50 + ((totalPages - 1000) / 1000) * 0.60;
    }
  }
  
  // Embeddings (basado en caracteres reales procesados)
  const embeddingsCost = (actualChars / 1000) * 0.0001;
  
  // Cloud Run (basado en tiempo real de ejecución)
  // CPU: 2 vCPU, Memoria: 4 GiB (ajustado por límites de cuota)
  const cpuCost = executionTimeSeconds * 2 * 0.00002400; // 2 vCPU
  const memoryCost = executionTimeSeconds * 4 * 0.00000250; // 4 GiB
  const cloudRunCost = cpuCost + memoryCost;
  
  // Firestore (basado en operaciones reales)
  const firestoreCost = (firestoreWrites / 100000) * 0.18 + (firestoreReads / 100000) * 0.06;
  
  const total = ocrCost + embeddingsCost + cloudRunCost + firestoreCost;
  
  return {
    ocr: parseFloat(ocrCost.toFixed(4)),
    embeddings: parseFloat(embeddingsCost.toFixed(4)),
    cloudRun: parseFloat(cloudRunCost.toFixed(4)),
    firestore: parseFloat(firestoreCost.toFixed(4)),
    total: parseFloat(total.toFixed(4)),
  };
}

/**
 * Inserta chunks en Supabase en lotes y actualiza progreso periódicamente
 * Optimizado para evitar timeouts: lotes más pequeños, sin select, con retry
 */
async function insertChunksBatch(
  supabase: any,
  chunksToInsert: any[],
  jobRef: FirebaseFirestore.DocumentReference,
  chunksAlreadyProcessed: number,
  totalChunks: number
): Promise<void> {
  console.log('💾 Guardando chunks en Supabase...');
  // Reducir batch size para evitar timeouts (de 50 a 20)
  const batchSize = 20;
  let totalInserted = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 segundos entre reintentos
  
  for (let i = 0; i < chunksToInsert.length; i += batchSize) {
    const batch = chunksToInsert.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`  Insertando batch ${batchNumber} (${batch.length} chunks)...`);
    
    // Retry logic para manejar timeouts
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        // Eliminar .select() para reducir tiempo de respuesta
        // Solo insertar sin esperar confirmación de datos
        const { error } = await supabase
          .from('course_content_chunks')
          .insert(batch as any);
        
        if (error) {
          // Si es timeout, reintentar
          if (error.message?.includes('timeout') || error.message?.includes('statement timeout')) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.warn(`  ⚠️ Timeout en batch ${batchNumber}, reintentando (${retryCount}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
              continue;
            }
          }
          
          console.error(`Error insertando batch ${batchNumber}:`, error);
          console.error(`  Código:`, error.code);
          console.error(`  Detalles:`, error.details);
          console.error(`  Hint:`, error.hint);
          
          // Si el error persiste después de reintentos, lanzar error
          throw new Error(`Error insertando chunks en Supabase: ${error.message}`);
        }
        
        success = true;
        console.log(`  ✅ Batch ${batchNumber} insertado exitosamente (${batch.length} registros)`);
        
      } catch (error: any) {
        if (retryCount < maxRetries - 1) {
          retryCount++;
          console.warn(`  ⚠️ Error en batch ${batchNumber}, reintentando (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        } else {
          console.error(`  ❌ Error persistente después de ${maxRetries} intentos`);
          throw error;
        }
      }
    }
    
    totalInserted += batch.length;
    console.log(`  ✅ Insertados chunks ${i + 1}-${Math.min(i + batchSize, chunksToInsert.length)} (${totalInserted}/${chunksToInsert.length})`);
    
    // Actualizar progreso periódicamente (cada batch para feedback más frecuente)
    const currentProgress = chunksAlreadyProcessed + totalInserted;
    await jobRef.update({
      chunksProcessed: currentProgress,
      updatedAt: Timestamp.now(),
    });
    console.log(`💾 Progreso guardado en Firestore: ${currentProgress}/${totalChunks} chunks (${Math.round((currentProgress / totalChunks) * 100)}%)`);
    
    // Pequeña pausa entre batches para no sobrecargar la base de datos
    if (i + batchSize < chunksToInsert.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

/**
 * Procesa un job de archivo
 */
export const processFileJob = onDocumentCreated(
  {
    document: 'file_processing_jobs/{jobId}',
    memory: '4GiB', // Optimizado: reducido de 8GB a 4GB para reducir costos (suficiente para la mayoría de archivos)
    timeoutSeconds: 540, // 9 minutos (máximo para event triggers, la función se auto-continúa)
    maxInstances: 5, // Máximo 5 instancias (4GB * 5 = 20GB máximo, reducido de 40GB)
    cpu: 2, // Mantenido para buen rendimiento
    secrets: [supabaseUrl, supabaseServiceRoleKey, geminiApiKey],
  },
  async (event: any) => {
    const jobId = event.params.jobId;
    const jobData = event.data?.data();
    
    console.log(`📋 Job recibido: ${jobId}`);
    console.log(`   Status: ${jobData?.status || 'N/A'}`);
    console.log(`   Metadata: ${JSON.stringify(jobData?.metadata || {}, null, 2)}`);
    
    // Inicializar referencias de Firestore
    const db = getDb();
    const jobRef = db.collection('file_processing_jobs').doc(jobId);
    
    // Verificar si el job fue cancelado
    if (!jobData || jobData.status === 'cancelled') {
      console.log(`Job ${jobId} fue cancelado, saltando procesamiento...`);
      return;
    }
    
    // Procesar jobs pendientes o en processing (para continuar procesamiento)
    if (jobData.status !== 'pending' && jobData.status !== 'processing') {
      console.log(`Job ${jobId} no está pendiente ni en procesamiento (status: ${jobData?.status}), saltando...`);
      return;
    }
    
    // Si está en processing pero no necesita continuación, verificar si realmente está procesando
    if (jobData.status === 'processing' && !jobData.continuationNeeded) {
      // Verificar si el job está realmente procesando (menos de 2 horas desde startedAt)
      const startedAt = jobData.startedAt?.toDate();
      if (startedAt) {
        const hoursSinceStart = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceStart < 2) {
          console.log(`Job ${jobId} está procesando activamente (${Math.round(hoursSinceStart * 60)} min transcurridos), saltando...`);
          return;
        }
      }
    }
    
    // Verificar si es solo lectura (no procesar para RAG)
    const ragProcessingType = jobData.metadata?.ragProcessingType || 'full';
    if (ragProcessingType === 'readonly') {
      console.log(`Job ${jobId} es de tipo 'readonly', marcando como completado sin procesar RAG...`);
      
      // Actualizar job como completado sin procesar
      await jobRef.update({
        status: 'completed',
        updatedAt: Timestamp.now(),
        completedAt: Timestamp.now(),
        chunksProcessed: 0,
        chunksTotal: 0,
      });
      
      // Actualizar material en Supabase
      if (jobData.metadata?.materialId) {
        try {
          const supabaseClient = await getSupabase();
          await supabaseClient
            .from('materials')
            .update({
              rag_status: 'readonly',
              processed_at: new Date().toISOString(),
            })
            .eq('id', jobData.metadata.materialId);
        } catch (updateError) {
          console.error('Error actualizando material a readonly:', updateError);
        }
      }
      
      console.log(`✅ Job ${jobId} marcado como completado (solo lectura)`);
      return;
    }
    
    console.log(`🚀 Iniciando procesamiento del job ${jobId}`);
    console.log(`📄 Archivo: ${jobData.sourceFileName}`);
    console.log(`👤 Usuario: ${jobData.metadata?.userId}`);
    
    // Verificar si hay progreso previo (por si se canceló antes o se reanudó)
    let chunksAlreadyProcessed = 0;
    if (jobData.chunksProcessed && jobData.chunksProcessed > 0) {
      chunksAlreadyProcessed = jobData.chunksProcessed;
      console.log(`📊 Reanudando procesamiento: ${chunksAlreadyProcessed} chunks ya procesados anteriormente`);
    }
    
    // Tiempo de inicio para monitorear timeout
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 8 * 60 * 1000; // 8 minutos (dejar 1 minuto de buffer antes del timeout de 9 min)
    
    try {
      // 1. Actualizar estado a processing
      const startedAt = jobData.startedAt || Timestamp.now();
      await jobRef.update({
        status: 'processing',
        updatedAt: Timestamp.now(),
        startedAt: startedAt,
      });
      
      // 2. Obtener token de acceso de Google Drive del usuario
      const userId = jobData.metadata?.userId;
      if (!userId) {
        console.error('❌ userId no encontrado en metadata del job');
        console.error('   Metadata disponible:', JSON.stringify(jobData.metadata, null, 2));
        throw new Error('userId no encontrado en metadata del job');
      }
      
      console.log(`👤 Obteniendo token para userId: ${userId}`);
      const accessToken = await getGoogleDriveToken(userId);
      if (!accessToken) {
        console.error('❌ No se pudo obtener token de acceso de Google Drive');
        console.error('   userId:', userId);
        console.error('   Verificar logs anteriores para más detalles');
        throw new Error('No se pudo obtener token de acceso de Google Drive. El usuario debe conectar su cuenta de Google Drive.');
      }
      
      console.log(`✅ Token obtenido exitosamente (longitud: ${accessToken.length} caracteres)`);
      
      // 3. Configurar cliente de Google Drive
      if (!google) {
        google = (await import('googleapis')).google;
      }
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      // 4. Obtener metadata del archivo
      const fileMetadata = await drive.files.get({
        fileId: jobData.sourceFileId,
        fields: 'id, name, size, mimeType',
      });
      
      const mimeType = (fileMetadata.data as any).mimeType || 'application/pdf';
      const isImage = mimeType.startsWith('image/');
      const isScanned = jobData.pdfType === 'scanned';
      
      console.log(`📋 Tipo de archivo: ${mimeType}, Escaneado: ${isScanned}, Imagen: ${isImage}`);
      
      // 5. Descargar archivo de Google Drive
      console.log('⬇️ Descargando archivo de Google Drive...');
      const fileResponse = await drive.files.get(
        { fileId: jobData.sourceFileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      
      const fileBuffer = Buffer.from(fileResponse.data as ArrayBuffer);
      const fileSizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`✅ Archivo descargado: ${fileSizeMB} MB`);
      
      // Para archivos muy grandes, advertir sobre el uso de memoria
      if (fileBuffer.length > 500 * 1024 * 1024) { // > 500 MB
        console.log(`⚠️ Archivo grande detectado (${fileSizeMB} MB). Procesando en modo optimizado para memoria.`);
      }
      
      // 6. Extraer texto
      console.log('📝 Extrayendo texto del archivo...');
      let text: string;
      let pageData: Array<{pageNumber: number, text: string}> | undefined;
      let actualTotalPages = jobData.totalPages || 1;
      
      if (isImage || isScanned) {
        // Usar OCR
        console.log('🔍 Usando OCR para extraer texto...');
        const ocrResult = await extractTextWithOCR(fileBuffer, mimeType, accessToken);
        text = ocrResult.text; // Ya está limpio (la limpieza se hace dentro de extractTextWithOCR)
        // Para imágenes, crear estructura de página única
        pageData = [{
          pageNumber: ocrResult.pageNumber,
          text: text
        }];
        actualTotalPages = 1; // Imágenes son una sola "página"
      } else {
        // Extraer texto directamente del PDF con información de páginas
        const pdfResult = await extractTextFromPDF(fileBuffer);
        text = pdfResult.text;
        pageData = pdfResult.pages;
        actualTotalPages = pdfResult.totalPages;
        
        // Actualizar totalPages en el job si es diferente
        if (actualTotalPages !== jobData.totalPages) {
          console.log(`📄 Total de páginas actualizado: ${jobData.totalPages} → ${actualTotalPages}`);
          await jobRef.update({
            totalPages: actualTotalPages,
            updatedAt: Timestamp.now(),
          });
        }
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del archivo. El archivo puede estar vacío o ser una imagen sin texto.');
      }
      
      console.log(`✅ Texto extraído: ${text.length} caracteres de ${actualTotalPages} páginas`);
      
      // Liberar memoria del buffer del archivo después de extraer texto
      // El buffer ya no es necesario, solo necesitamos el texto
      // @ts-ignore
      if (global.gc && fileBuffer.length > 100 * 1024 * 1024) { // Solo para archivos > 100 MB
        // @ts-ignore
        global.gc();
        console.log('🗑️ Memoria del buffer del archivo liberada');
      }
      
      // 7. Dividir en chunks usando información real de páginas
      const chunkSize = jobData.metadata?.chunkSize || 60; // páginas por chunk (optimizado para reducir costos)
      const chunks = splitIntoChunks(text, actualTotalPages, chunkSize, pageData);
      
      console.log(`📦 Archivo dividido en ${chunks.length} chunks (${actualTotalPages} páginas totales)`);
      
      if (chunks.length === 0) {
        throw new Error('No se generaron chunks del texto extraído');
      }
      
      // 8. Generar embeddings y preparar para insertar en Supabase
      // Procesar en lotes pequeños para evitar exceder memoria
      const supabase = await getSupabase();
      const EMBEDDING_BATCH_SIZE = 20; // Procesar e insertar en lotes de 20 para reducir memoria
      let totalProcessed = chunksAlreadyProcessed;
      
      console.log('\n🧠 === GENERACIÓN DE EMBEDDINGS ===');
      console.log(`📊 Total de chunks a procesar: ${chunks.length}`);
      console.log(`📊 Chunks ya procesados: ${chunksAlreadyProcessed}`);
      console.log(`📊 Chunks pendientes: ${chunks.length - chunksAlreadyProcessed}`);
      console.log(`⏰ Tiempo de inicio: ${new Date().toISOString()}`);
      console.log(`📦 Tamaño de lote: ${EMBEDDING_BATCH_SIZE} chunks`);
      
      // Actualizar progreso inicial para que el usuario vea que el proceso está activo
      console.log(`💾 Actualizando progreso inicial en Firestore: ${chunksAlreadyProcessed}/${chunks.length} chunks`);
      await jobRef.update({
        chunksProcessed: chunksAlreadyProcessed,
        updatedAt: Timestamp.now(),
        status: 'processing',
      });
      console.log(`✅ Progreso inicial actualizado en Firestore`);
      console.log('🧠 Iniciando generación de embeddings y guardado en lotes...');
      
      // Liberar memoria del buffer del archivo si es posible
      // @ts-ignore
      if (global.gc) {
        // @ts-ignore
        global.gc();
        console.log('🗑️ Memoria liberada después de extraer texto');
      }
      
      for (let batchStart = chunksAlreadyProcessed; batchStart < chunks.length; batchStart += EMBEDDING_BATCH_SIZE) {
        // Verificar tiempo transcurrido
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > MAX_EXECUTION_TIME) {
          console.log(`⏰ Tiempo de ejecución cerca del límite (${Math.round(elapsedTime / 60000)} min). Guardando progreso y programando continuación...`);
          
          // Guardar progreso actual
          await jobRef.update({
            chunksProcessed: totalProcessed,
            updatedAt: Timestamp.now(),
            status: 'processing', // Mantener en processing para que continúe
            continuationNeeded: true,
            lastCheckpoint: Timestamp.now(),
          });
          
          console.log(`💾 Progreso guardado: ${totalProcessed}/${chunks.length} chunks`);
          console.log(`🔄 El job continuará automáticamente en la próxima ejecución`);
          return; // Salir para que se ejecute nuevamente con el progreso guardado
        }
        
        const batchEnd = Math.min(batchStart + EMBEDDING_BATCH_SIZE, chunks.length);
        const batch = chunks.slice(batchStart, batchEnd);
        const chunksToInsert: any[] = [];
        
        console.log(`  Procesando lote ${Math.floor(batchStart / EMBEDDING_BATCH_SIZE) + 1}: chunks ${batchStart + 1}-${batchEnd} de ${chunks.length}`);
        
        // Generar embeddings para este lote
        for (let i = 0; i < batch.length; i++) {
          const chunk = batch[i];
          const chunkIndex = batchStart + i;
          
          console.log(`    [${new Date().toISOString()}] Generando embedding ${chunkIndex + 1}/${chunks.length} (páginas ${chunk.pageStart}-${chunk.pageEnd})...`);
          
          try {
            const embeddingStartTime = Date.now();
            const embedding = await generateEmbedding(chunk.text);
            const embeddingTime = Date.now() - embeddingStartTime;
            
            console.log(`    ✅ Embedding ${chunkIndex + 1} generado en ${embeddingTime}ms`);
            
            // Optimizado: reducir metadatos para ahorrar almacenamiento
            // Eliminamos sourceFileId y sourceFileName (ya están en materials)
            chunksToInsert.push({
              course_id: parseInt(jobData.courseId),
              content: chunk.text,
              embedding: embedding,
              chunk_index: chunkIndex,
              metadata: {
                material_id: jobData.metadata?.materialId,
                // sourceFileId y sourceFileName eliminados - disponibles en materials
                pdfType: jobData.pdfType,
                category: jobData.metadata?.category,
                page_start: chunk.pageStart,
                page_end: chunk.pageEnd,
                total_pages: actualTotalPages,
              },
            });
            
            // Actualizar progreso después de cada 5 chunks generados (para feedback más frecuente)
            if ((i + 1) % 5 === 0 || i === batch.length - 1) {
              const currentProgress = totalProcessed + i + 1;
              console.log(`    📊 Progreso parcial: ${currentProgress}/${chunks.length} chunks procesados (${Math.round((currentProgress / chunks.length) * 100)}%)`);
            }
            
            // Pequeña pausa para no sobrecargar APIs
            if (i < batch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (embeddingError) {
            console.error(`    ❌ Error generando embedding para chunk ${chunkIndex + 1}:`, embeddingError);
            // Continuar con los demás chunks
          }
        }
        
        // Insertar este lote inmediatamente para liberar memoria
        if (chunksToInsert.length > 0) {
          console.log(`💾 Insertando batch de ${chunksToInsert.length} chunks en Supabase...`);
          await insertChunksBatch(supabase, chunksToInsert, jobRef, totalProcessed, chunks.length);
          totalProcessed += chunksToInsert.length;
          
          // Actualizar progreso inmediatamente después de insertar
          console.log(`📊 Actualizando progreso en Firestore: ${totalProcessed}/${chunks.length} chunks`);
          await jobRef.update({
            chunksProcessed: totalProcessed,
            updatedAt: Timestamp.now(),
          });
          console.log(`✅ Progreso actualizado: ${totalProcessed}/${chunks.length} chunks (${Math.round((totalProcessed / chunks.length) * 100)}%)`);
          
          // Liberar memoria después de insertar
          // @ts-ignore
          if (global.gc) {
            // @ts-ignore
            global.gc();
          }
          
          // Limpiar referencias
          chunksToInsert.length = 0;
        }
      }
      
      // Verificar si se completó todo el procesamiento
      if (totalProcessed < chunks.length) {
        console.log(`⏸️ Procesamiento parcial completado: ${totalProcessed}/${chunks.length} chunks`);
        console.log(`🔄 El job continuará automáticamente en la próxima ejecución`);
        return; // Salir para que continúe en la próxima ejecución
      }
      
      console.log(`✅ Todos los chunks procesados y guardados en Supabase`);
      
      // 10. Calcular costos reales
      const completedAt = Timestamp.now();
      const startedAtTimestamp = jobData.startedAt || Timestamp.now();
      const executionTimeSeconds = (completedAt.toMillis() - startedAtTimestamp.toMillis()) / 1000;
      
      // Calcular caracteres totales procesados
      const actualChars = text.length;
      
      // Estimar operaciones de Firestore
      // Writes: job updates + chunks insertados
      const firestoreWrites = Math.ceil(totalProcessed / 50) + totalProcessed + 5; // batches + chunks + job updates
      // Reads: job reads + verificaciones
      const firestoreReads = totalProcessed * 2 + 10; // verificaciones + job reads
      
      const actualCosts = calculateActualCosts(
        actualTotalPages,
        jobData.pdfType || 'unknown',
        chunks.length,
        actualChars,
        executionTimeSeconds,
        firestoreWrites,
        firestoreReads
      );
      
      console.log(`💰 Costos reales calculados:`);
      console.log(`   OCR: $${actualCosts.ocr.toFixed(4)}`);
      console.log(`   Embeddings: $${actualCosts.embeddings.toFixed(4)}`);
      console.log(`   Cloud Run: $${actualCosts.cloudRun.toFixed(4)}`);
      console.log(`   Firestore: $${actualCosts.firestore.toFixed(4)}`);
      console.log(`   Total: $${actualCosts.total.toFixed(4)}`);
      
      // Guardar costos en Supabase para el dashboard
      const supabaseClient = await getSupabase();
      try {
        const { error: costError } = await supabaseClient
          .from('processing_costs')
          .insert({
            job_id: jobId,
            user_id: jobData.metadata?.userId,
            course_id: parseInt(jobData.courseId),
            material_id: jobData.metadata?.materialId,
            file_name: jobData.sourceFileName,
            file_size: fileBuffer.length,
            total_pages: actualTotalPages,
            total_chunks: chunks.length,
            execution_time_seconds: executionTimeSeconds,
            pdf_type: jobData.pdfType || 'unknown',
            estimated_costs: jobData.metadata?.estimatedCosts?.estimatedCosts || null,
            actual_costs: actualCosts,
            cost_difference: actualCosts.total - (jobData.metadata?.estimatedCosts?.estimatedCosts?.total || 0),
            created_at: new Date().toISOString(),
          });
        
        if (costError) {
          console.error('⚠️ Error guardando costos en Supabase (continuando):', costError);
          // No fallar el job por esto, solo loguear
        } else {
          console.log('✅ Costos guardados en Supabase para dashboard');
        }
      } catch (costSaveError) {
        console.error('⚠️ Error al guardar costos (continuando):', costSaveError);
        // No fallar el job por esto
      }
      
      // 11. Actualizar material en Supabase
      if (jobData.metadata?.materialId) {
        console.log('📝 Actualizando estado del material en Supabase...');
        const { error: materialError } = await supabaseClient
          .from('materials')
          .update({
            rag_status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', jobData.metadata.materialId);
        
        if (materialError) {
          console.error('Error actualizando material:', materialError);
          // No fallar el job por esto
        } else {
          console.log('✅ Material actualizado en Supabase');
        }
      }
      
      // 12. Actualizar job en Firestore con costos reales
      await jobRef.update({
        status: 'completed',
        updatedAt: Timestamp.now(),
        completedAt: completedAt,
        chunksProcessed: totalProcessed,
        chunksTotal: chunks.length,
        continuationNeeded: false, // Ya no necesita continuación
        'metadata.actualCosts': {
          totalPages: actualTotalPages,
          pdfType: jobData.pdfType || 'unknown',
          estimatedCosts: {
            ocr: actualCosts.ocr,
            embeddings: actualCosts.embeddings,
            cloudRun: actualCosts.cloudRun,
            firestore: actualCosts.firestore,
            total: actualCosts.total,
          },
          processingTime: {
            estimatedMinutes: Math.round(executionTimeSeconds / 60),
            estimatedHours: parseFloat((executionTimeSeconds / 3600).toFixed(2)),
          },
        },
      });
      
      console.log(`✅ Job ${jobId} completado exitosamente`);
      console.log(`📊 Resumen: ${totalProcessed} chunks procesados y guardados`);
      console.log(`💰 Costo total real: $${actualCosts.total.toFixed(4)} USD`);
      
    } catch (error: any) {
      console.error(`❌ Error procesando job ${jobId}:`, error);
      console.error('Stack trace:', error.stack);
      
      // Actualizar estado a failed
      await jobRef.update({
        status: 'failed',
        errorMessage: error.message || 'Error desconocido',
        updatedAt: Timestamp.now(),
      });
      
      // Actualizar material en Supabase
      if (jobData?.metadata?.materialId) {
        try {
          const supabaseClient = await getSupabase();
          await supabaseClient
            .from('materials')
            .update({
              rag_status: 'failed',
              rag_error: error.message || 'Error en el procesamiento',
            })
            .eq('id', jobData.metadata.materialId);
        } catch (updateError) {
          console.error('Error actualizando material a failed:', updateError);
        }
      }
    }
  }
);


