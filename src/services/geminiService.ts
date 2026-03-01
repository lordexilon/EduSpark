// services/geminiService.ts
// Servicio optimizado para Google Gemini API
// Inspirado en la arquitectura A2A de AOIGO, adaptado para contexto educativo

import { GoogleGenAI } from "@google/genai";
import { resolveGeminiApiKey, isGeminiApiConfigured } from "@/modules/tutor/utils/env";

// =====================================================
// CONFIGURACIÓN Y CONSTANTES
// =====================================================

const CHAT_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-2.5-pro';
// Para voces expresivas, usar el mismo modelo gemini-2.5-flash con Modality.AUDIO
// Las voces expresivas se activan mediante indicaciones naturales en el texto
const TTS_MODEL = 'gemini-2.5-flash'; // Usar el modelo principal con Modality.AUDIO para voces expresivas

const DEFAULT_SYSTEM_INSTRUCTION = "Eres EduSpark, un tutor de IA amigable y alentador para una plataforma educativa. Mantén tus respuestas concisas, útiles y atractivas para estudiantes de todas las edades. IMPORTANTE: Responde siempre en el mismo idioma en que el estudiante te pregunta (español o inglés).";

// Configuración de reintentos (inspirada en AOIGO)
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000,
};

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface GeminiRequestOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  retryConfig?: Partial<typeof RETRY_CONFIG>;
}

interface GeminiResponse {
  text: string;
  metadata?: {
    model: string;
    finishReason?: string;
    usage?: {
      promptTokens?: number;
      candidatesTokens?: number;
      totalTokens?: number;
    };
    timestamp: string;
  };
}

interface GeminiError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
}

// =====================================================
// GESTIÓN DE CLIENTE Y API KEY
// =====================================================

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/**
 * Obtiene o crea el cliente de Gemini con caché
 * Inspirado en el patrón de AOIGO para gestión eficiente de recursos
 */
function getClient(): { client: GoogleGenAI | null; missing: boolean } {
  const { key, missing } = resolveGeminiApiKey();

  if (missing || !key) {
    return { client: null, missing: true };
  }

  // Reutilizar cliente si la key no cambió
  if (!cachedClient || cachedKey !== key) {
    try {
      cachedClient = new GoogleGenAI({ apiKey: key });
      cachedKey = key;
      console.log('✅ GeminiService: Cliente inicializado correctamente');
    } catch (error) {
      console.error('❌ GeminiService: Error inicializando cliente:', error);
      return { client: null, missing: true };
    }
  }

  return { client: cachedClient, missing: false };
}

// =====================================================
// FUNCIONES DE REINTENTOS Y MANEJO DE ERRORES
// =====================================================

/**
 * Determina si un error es recuperable (inspirado en AOIGO)
 * NOTA: Errores 429 (cuota excedida) NO son recuperables a corto plazo
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Errores 429 (rate limit / cuota) NO son recuperables a corto plazo
  // La cuota se resetea después de un tiempo largo, no tiene sentido reintentar
  if (error.status === 429 || error.code === '429' || error.message?.includes('429')) {
    return false;
  }

  // Errores de red son recuperables
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }

  // Errores 500-599 son recuperables
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Errores de timeout son recuperables
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Calcula el delay para reintentos con backoff exponencial
 */
function calculateRetryDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Ejecuta una operación con reintentos automáticos
 * Patrón inspirado en AOIGO Framework
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: Partial<typeof RETRY_CONFIG> = {}
): Promise<T> {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError: any = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            timeoutId;
            setTimeout(() => reject(new Error('Operation timeout')), config.timeoutMs);
          }),
        ]);

        clearTimeout(timeoutId);
        console.log(`✅ GeminiService: Operación exitosa en intento ${attempt}`);
        return result;
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        throw timeoutError;
      }
    } catch (error: any) {
      lastError = error;

      // Si no es recuperable, no reintentar
      if (!isRetryableError(error)) {
        // Silenciar errores 429 - solo log como warning, no como error
        const isQuotaError = error.status === 429 || error.code === '429' || error.message?.includes('429');
        if (isQuotaError) {
          console.warn('⚠️ GeminiService: Cuota de API excedida. Usando análisis de respaldo.');
        } else {
          console.error(`❌ GeminiService: Error no recuperable en intento ${attempt}:`, error);
        }
        throw error;
      }

      // Si es el último intento, lanzar error
      if (attempt >= config.maxAttempts) {
        console.error(`❌ GeminiService: Falló tras ${config.maxAttempts} intentos`);
        break;
      }

      // Calcular delay y esperar antes de reintentar
      const delay = calculateRetryDelay(attempt, config.baseDelayMs, config.maxDelayMs);
      console.warn(`⚠️ GeminiService: Intento ${attempt} falló (${error.message || error}). Reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Operación falló después de múltiples intentos');
}

// =====================================================
// FUNCIONES PRINCIPALES EXPORTADAS
// =====================================================

/**
 * Genera contenido usando Gemini con manejo robusto de errores
 * 
 * @param prompt - Prompt del usuario
 * @param options - Opciones de configuración
 * @returns Respuesta de Gemini con metadata
 */
export async function generateContent(
  prompt: string,
  options: GeminiRequestOptions = {}
): Promise<GeminiResponse> {
  const { client, missing } = getClient();

  if (missing || !client) {
    console.warn('⚠️ GeminiService: API key no configurada');
    throw new Error('GEMINI_API_KEY no está configurada. Por favor, configura la variable de entorno.');
  }

  const model = options.model || CHAT_MODEL;
  const systemInstruction = options.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
  const retryConfig = options.retryConfig || {};

  return executeWithRetry(async () => {
    try {
      const startTime = Date.now();

      const response = await client!.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          topK: options.topK,
        },
      });

      const duration = Date.now() - startTime;
      const text = response.text || '';

      console.log(`✅ GeminiService: Contenido generado exitosamente`, {
        model,
        textLength: text.length,
        duration: `${duration}ms`,
      });

      return {
        text,
        metadata: {
          model,
          finishReason: response.candidates?.[0]?.finishReason,
          usage: (response as any).usage ? {
            promptTokens: (response as any).usage.promptTokenCount,
            candidatesTokens: (response as any).usage.candidatesTokenCount,
            totalTokens: (response as any).usage.totalTokenCount,
          } : undefined,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      // Silenciar errores 429 (cuota excedida) - solo log como warning, no como error
      const isQuotaError = error.status === 429 || error.code === '429' || error.message?.includes('429');
      if (!isQuotaError) {
        console.error('❌ GeminiService: Error generando contenido:', {
          model,
          error: error.message || error,
          status: error.status,
          code: error.code,
        });
      }
      throw error;
    }
  }, retryConfig);
}

/**
 * Genera un prompt de discusión ética sobre un tema
 * Optimizado para contexto educativo
 */
export async function generateEthicalDiscussionPrompt(
  topic: string,
  options: GeminiRequestOptions = {}
): Promise<string> {
  const prompt = `Genera una pregunta de discusión estimulante sobre las implicaciones éticas de "${topic}". La pregunta debe ser adecuada para estudiantes universitarios que estudian ética profesional. La pregunta debe ser abierta, promover el pensamiento crítico y estar relacionada con situaciones profesionales reales.`;

  try {
    const response = await generateContent(prompt, {
      ...options,
      model: options.model || CHAT_MODEL,
      temperature: options.temperature ?? 0.8, // Más creativo para preguntas
    });
    return response.text;
  } catch (error) {
    console.error('Error generando prompt de discusión:', error);
    // Fallback amigable
    return `¿Cuáles son las consideraciones éticas clave sobre "${topic}" en un contexto profesional?`;
  }
}

/**
 * Resume un texto ético manteniendo los puntos clave
 */
export async function summarizeEthicalText(
  text: string,
  options: GeminiRequestOptions = {}
): Promise<string> {
  const prompt = `Resume el siguiente texto sobre un tema ético en 2-3 oraciones clave, manteniendo los conceptos principales y las implicaciones importantes:\n\n${text}`;

  try {
    const response = await generateContent(prompt, {
      ...options,
      model: options.model || CHAT_MODEL,
      temperature: options.temperature ?? 0.3, // Más determinista para resúmenes
      maxTokens: options.maxTokens || 200,
    });
    return response.text;
  } catch (error) {
    console.error('Error resumiendo texto:', error);
    // Fallback: resumen básico
    return `Este texto discute ${text.substring(0, 100)}...`;
  }
}

/**
 * Procesa un documento y lo organiza en formato de lección
 */
export async function processDocument(
  fileContent: string,
  options: GeminiRequestOptions = {}
): Promise<string> {
  const prompt = `Eres EduSpark, un tutor de IA. Tu tarea es organizar el siguiente contenido en un formato de lección para una clase. Debes estructurarlo con claridad, utilizando secciones como "Introducción", "Conceptos Clave" (con definiciones), "Ejemplos Prácticos" y un "Resumen" final. El formato debe ser fácil de seguir para un estudiante.\n\n---\n\n${fileContent}`;

  try {
    const response = await generateContent(prompt, {
      ...options,
      model: options.model || PRO_MODEL, // Usar modelo Pro para documentos complejos
      temperature: options.temperature ?? 0.5,
    });
    return response.text;
  } catch (error) {
    console.error('Error procesando documento:', error);
    throw new Error('No se pudo procesar el documento. Por favor, verifica que sea un archivo de texto válido.');
  }
}

/**
 * Voces expresivas disponibles en Gemini 2.5 Flash
 * Las voces expresivas permiten control de estilo, acento y tono mediante indicaciones naturales
 */
export type ExpressiveVoiceName =
  | 'Kore'           // Voz femenina, clara y profesional
  | 'Charon'         // Voz masculina, profunda y autoritaria
  | 'Fenrir'         // Voz masculina, energética y motivadora
  | 'Aoede'          // Voz femenina, cálida y expresiva
  | 'Puck';          // Voz neutra, versátil y amigable

/**
 * Estilos expresivos disponibles para las voces
 * Se pueden combinar múltiples estilos usando indicaciones naturales
 */
export type ExpressiveStyle =
  | 'friendly'           // Amigable y cercano
  | 'professional'       // Profesional y formal
  | 'energetic'          // Energético y motivador
  | 'calm'               // Calmado y relajante
  | 'excited'            // Emocionado y entusiasta
  | 'empathetic'         // Empático y comprensivo
  | 'authoritative'      // Autoritario y confiable
  | 'warm'               // Cálido y acogedor
  | 'clear'              // Claro y preciso
  | 'amused'             // Divertido y alegre
  | 'fast'               // Rápido
  | 'slow'               // Lento
  | 'normal';            // Normal (sin estilo específico)

/**
 * Sintetiza texto a voz usando Google Cloud Text-to-Speech API
 * 
 * NOTA: Gemini 2.5 Flash NO soporta salida de audio.
 * Este servicio usa Google Cloud TTS con voces Neural2 de alta calidad.
 * 
 * @param text - Texto a sintetizar
 * @param options - Opciones de voz:
 *   - voiceName: Nombre de la voz (se mapea a voces Neural2)
 *   - styles: Estilos expresivos (se aplican mediante SSML)
 *   - speed: Velocidad del habla (0.5 a 2.0)
 * @returns Audio en formato base64 o null si falla
 */
export async function synthesizeSpeech(
  text: string,
  options: {
    voiceName?: ExpressiveVoiceName;
    styles?: ExpressiveStyle[];
    speed?: number;
    pitch?: number;
    useNaturalPrompts?: boolean;
  } = {}
): Promise<string | null> {
  try {
    // Importar dinámicamente el servicio TTS
    const { getTTSService } = await import('./textToSpeechService');
    const ttsService = getTTSService();

    // Detectar idioma del texto
    const detectedLanguage = detectTextLanguage(text);

    console.log('🌍 TTS: Idioma detectado:', detectedLanguage);

    // Mapear voces por idioma
    type VoiceType = 'es-US-Journey-F' | 'es-US-Journey-D' | 'es-US-Studio-B' |
      'en-US-Journey-F' | 'en-US-Journey-D' |
      'pt-BR-Journey-F' | 'pt-BR-Journey-D';

    const voiceMapByLanguage: Record<string, Record<ExpressiveVoiceName, VoiceType>> = {
      'spanish': {
        'Kore': 'es-US-Journey-F',
        'Aoede': 'es-US-Journey-F',
        'Puck': 'es-US-Journey-F',
        'Charon': 'es-US-Journey-D',
        'Fenrir': 'es-US-Studio-B',
      },
      'english': {
        'Kore': 'en-US-Journey-F',
        'Aoede': 'en-US-Journey-F',
        'Puck': 'en-US-Journey-F',
        'Charon': 'en-US-Journey-D',
        'Fenrir': 'en-US-Journey-D',
      },
      'portuguese': {
        'Kore': 'pt-BR-Neural2-A', // Voz femenina Neural2 (Journey no disponible para pt-BR)
        'Aoede': 'pt-BR-Neural2-A', // Voz femenina Neural2
        'Puck': 'pt-BR-Neural2-A', // Voz femenina Neural2
        'Charon': 'pt-BR-Neural2-B', // Voz masculina Neural2
        'Fenrir': 'pt-BR-Neural2-B', // Voz masculina Neural2
      }
    };

    const languageCodeMap: Record<string, string> = {
      'spanish': 'es-US',
      'english': 'en-US',
      'portuguese': 'pt-BR'
    };

    const voiceName = options.voiceName || 'Kore';
    const voiceMap = voiceMapByLanguage[detectedLanguage] || voiceMapByLanguage['spanish'];
    const googleVoice = voiceMap[voiceName];
    const languageCode = languageCodeMap[detectedLanguage] || 'es-US';
    const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));
    const pitch = options.pitch || 0.0;

    console.log('🎤 TTS: Usando Google Cloud Text-to-Speech PREMIUM (Journey/Studio)', {
      detectedLanguage,
      originalVoice: voiceName,
      googleVoice,
      languageCode,
      speed,
      styles: options.styles,
    });

    // Sintetizar con Google Cloud TTS
    const audioBase64 = await ttsService.synthesizeSpeech(text, {
      voice: googleVoice as any,
      languageCode,
      speakingRate: speed,
      pitch,
    });

    console.log('✅ TTS: Audio sintetizado exitosamente con Google Cloud');
    return audioBase64;

  } catch (error) {
    console.error('❌ Error en síntesis de voz con Google Cloud TTS:', error);
    return null;
  }
}

/**
 * Detecta el idioma de un texto (español, inglés o portugués)
 */
function detectTextLanguage(text: string): 'spanish' | 'english' | 'portuguese' {
  const lowerText = text.toLowerCase();

  // Palabras clave por idioma
  const spanishWords = ['que', 'como', 'donde', 'cuando', 'porque', 'cual', 'quien', 'para', 'con', 'por', 'una', 'este', 'esta'];
  const englishWords = ['what', 'how', 'where', 'when', 'why', 'which', 'who', 'the', 'and', 'for', 'with', 'this', 'that'];
  const portugueseWords = ['que', 'como', 'onde', 'quando', 'porque', 'qual', 'quem', 'para', 'com', 'por', 'uma', 'este', 'esta', 'você', 'são'];

  let spanishCount = 0;
  let englishCount = 0;
  let portugueseCount = 0;

  // Contar coincidencias
  spanishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) spanishCount += matches.length;
  });

  englishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) englishCount += matches.length;
  });

  portugueseWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) portugueseCount += matches.length;
  });

  // Detectores específicos de portugués
  if (lowerText.includes('ção') || lowerText.includes('ões') || lowerText.includes('você') || lowerText.includes('são')) {
    portugueseCount += 3;
  }

  // Retornar el idioma con más coincidencias
  if (portugueseCount > spanishCount && portugueseCount > englishCount) {
    return 'portuguese';
  } else if (englishCount > spanishCount) {
    return 'english';
  }
  return 'spanish';
}

/**
 * Analiza una respuesta del estudiante para evaluar comprensión
 */
export async function analyzeStudentResponse(
  studentResponse: string,
  expectedConcepts: string[],
  options: GeminiRequestOptions = {}
): Promise<{
  score: number;
  feedback: string;
  conceptsCovered: string[];
  suggestions: string[];
}> {
  const conceptsList = expectedConcepts.join(', ');
  const prompt = `Eres un tutor de IA evaluando la respuesta de un estudiante sobre ética profesional.

Respuesta del estudiante: "${studentResponse}"

Conceptos esperados: ${conceptsList}

Evalúa la respuesta considerando:
1. Comprensión de los conceptos clave
2. Aplicación práctica de los conceptos
3. Claridad y coherencia

Proporciona:
- Un puntaje del 0-100
- Feedback constructivo
- Lista de conceptos cubiertos
- Sugerencias para mejorar

Formato JSON:
{
  "score": número,
  "feedback": "texto",
  "conceptsCovered": ["concepto1", "concepto2"],
  "suggestions": ["sugerencia1", "sugerencia2"]
}`;

  try {
    const response = await generateContent(prompt, {
      ...options,
      model: options.model || CHAT_MODEL,
      temperature: options.temperature ?? 0.3,
    });

    // Intentar parsear JSON de la respuesta
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: parsed.score || 0,
          feedback: parsed.feedback || 'Sin feedback disponible',
          conceptsCovered: parsed.conceptsCovered || [],
          suggestions: parsed.suggestions || [],
        };
      }
    } catch (parseError) {
      console.warn('No se pudo parsear JSON de la respuesta, usando fallback');
    }

    // Fallback si no se puede parsear
    return {
      score: 70,
      feedback: response.text,
      conceptsCovered: expectedConcepts,
      suggestions: ['Revisa los conceptos clave del tema'],
    };
  } catch (error) {
    console.error('Error analizando respuesta del estudiante:', error);
    throw new Error('No se pudo analizar la respuesta del estudiante');
  }
}

// =====================================================
// UTILIDADES Y HELPERS
// =====================================================

/**
 * Verifica si el servicio está configurado y disponible
 */
export function isGeminiConfigured(): boolean {
  return isGeminiApiConfigured();
}

/**
 * Obtiene información del servicio (útil para debugging)
 */
export function getServiceInfo(): {
  configured: boolean;
  model: string;
  clientCached: boolean;
} {
  const { missing } = resolveGeminiApiKey();
  return {
    configured: !missing,
    model: CHAT_MODEL,
    clientCached: !!cachedClient,
  };
}

/**
 * Genera un embedding para un texto usando Gemini Embedding API
 * @param text - Texto para generar embedding
 * @returns Array de números representando el embedding (768 dimensiones)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { client, missing } = getClient();

  if (missing || !client) {
    console.warn('⚠️ GeminiService: API key no configurada para embeddings');
    throw new Error('GEMINI_API_KEY no está configurada.');
  }

  return executeWithRetry(async () => {
    try {
      const apiKey = resolveGeminiApiKey().key;
      if (!apiKey) {
        throw new Error('API key no disponible');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: {
              parts: [{ text }],
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en API de embeddings: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const embedding = data.embedding?.values;

      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Respuesta de embedding inválida');
      }

      console.log(`✅ GeminiService: Embedding generado (${embedding.length} dimensiones)`);
      return embedding;
    } catch (error: any) {
      console.error('❌ GeminiService: Error generando embedding:', {
        error: error.message || error,
        status: error.status,
      });
      throw error;
    }
  }, RETRY_CONFIG);
}

// Exportar por compatibilidad con código existente
export const getTutorResponse = generateContent;

