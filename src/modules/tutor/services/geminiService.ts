import { GoogleGenAI, Modality } from '@google/genai';
import { resolveGeminiApiKey } from '../utils/env';

const chatModel = 'gemini-2.5-flash';
const proModel = 'gemini-2.5-pro';
// NOTA: La síntesis de voz usa Generative Language API (Gemini) con Modality.AUDIO
// Esto permite generar audio directamente desde Gemini sin necesidad de APIs adicionales

const systemInstruction =
  'Eres EduSpark, un tutor de IA amigable y alentador para una plataforma educativa. Mantén tus respuestas concisas, útiles y atractivas para estudiantes de todas las edades. IMPORTANTE: Responde siempre en el mismo idioma en que el estudiante te pregunta (español o inglés). Si pregunta en inglés, responde en inglés; si pregunta en español, responde en español.';

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

const getClient = (): { client: GoogleGenAI | null; missing: boolean } => {
  const { key, missing } = resolveGeminiApiKey();

  if (missing || !key) {
    return { client: null, missing: true };
  }

  if (!cachedClient || cachedKey !== key) {
    cachedClient = new GoogleGenAI({ apiKey: key });
    cachedKey = key;
  }

  return { client: cachedClient, missing: false };
};

export const getTutorResponse = async (prompt: string): Promise<string> => {
  try {
    const { client, missing } = getClient();
    if (missing || !client) {
      console.warn('GEMINI_API_KEY no configurada. Usando respuesta de respaldo.');
      return 'Lo siento, no tengo acceso al servicio de Gemini en este momento. Inténtalo más tarde.';
    }

    const response = await client.models.generateContent({
      model: chatModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error('Error getting tutor response:', error);
    return 'Lo siento, estoy teniendo problemas para conectarme en este momento. Por favor, inténtalo de nuevo más tarde.';
  }
};

export const processDocument = async (fileContent: string): Promise<string> => {
  const prompt = `Eres EduSpark, un tutor de IA. Tu tarea es organizar el siguiente contenido en un formato de lección para una clase. Debes estructurarlo con claridad, utilizando secciones como "Introducción", "Conceptos Clave" (con definiciones), "Ejemplos Prácticos" y un "Resumen" final. El formato debe ser fácil de seguir para un estudiante. Aquí está el contenido:\n\n---\n\n${fileContent}`;
  try {
    const { client, missing } = getClient();
    if (missing || !client) {
      console.warn('GEMINI_API_KEY no configurada. No se puede procesar documentos.');
      return 'Lo siento, no puedo procesar documentos en este momento porque la configuración de Gemini no está completa.';
    }

    const response = await client.models.generateContent({
      model: proModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error('Error processing document:', error);
    return 'Lo siento, tuve un problema al procesar el documento. Por favor, asegúrate de que sea un archivo de texto e inténtalo de nuevo.';
  }
};

/**
 * Sintetiza texto a voz usando Generative Language API (Gemini) con salida de audio nativa
 * Usa Modality.AUDIO para generar audio directamente desde Gemini 2.5 Flash
 *
 * @param text - Texto a sintetizar
 * @param options - Opciones de voz:
 *   - voiceName: Nombre de la voz (Kore, Charon, Fenrir, Aoede, Puck)
 *   - styles: Estilos expresivos (friendly, professional, energetic, etc.)
 *   - speed: Velocidad del habla (no aplica directamente, se controla con prompts)
 *   - useNaturalPrompts: Usar indicaciones naturales para voces expresivas
 */
export const synthesizeSpeech = async (
  text: string,
  options: {
    voiceName?: 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck';
    styles?: Array<
      | 'friendly'
      | 'professional'
      | 'energetic'
      | 'calm'
      | 'excited'
      | 'empathetic'
      | 'authoritative'
      | 'warm'
      | 'clear'
      | 'amused'
      | 'fast'
      | 'slow'
    >;
    speed?: number;
    useNaturalPrompts?: boolean;
  } = {}
): Promise<string | null> => {
  try {
    const { client, missing } = getClient();

    if (missing || !client) {
      console.warn('⚠️ Gemini API Key no configurada. Saltando síntesis de voz.');
      return null;
    }

    const voiceName = options.voiceName || 'Kore';
    const styles = options.styles || ['friendly', 'clear'];
    const useNaturalPrompts = options.useNaturalPrompts !== false;

    // Construir prompt con indicaciones expresivas si está habilitado
    let promptText = text;
    if (useNaturalPrompts && styles.length > 0) {
      const styleDescriptions = styles
        .map((style) => {
          switch (style) {
            case 'friendly':
              return 'amigable y cercano';
            case 'professional':
              return 'profesional y claro';
            case 'energetic':
              return 'energético y entusiasta';
            case 'calm':
              return 'calmado y sereno';
            case 'excited':
              return 'emocionado y animado';
            case 'empathetic':
              return 'empático y comprensivo';
            case 'authoritative':
              return 'autoritativo y confiable';
            case 'warm':
              return 'cálido y acogedor';
            case 'clear':
              return 'claro y articulado';
            case 'amused':
              return 'divertido y ligero';
            case 'fast':
              return 'rápido';
            case 'slow':
              return 'lento y pausado';
            default:
              return style;
          }
        })
        .join(', ');

      // Agregar indicación de estilo al inicio del texto
      promptText = `[Lee esto con un tono ${styleDescriptions}]: ${text}`;
    }

    console.log('🎤 Gemini TTS: Generando audio con Generative Language API', {
      voiceName,
      styles,
      textLength: text.length,
      useNaturalPrompts,
    });

    // Usar Gemini 2.5 Flash con Modality.AUDIO para generar audio
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction: `Eres un tutor virtual. Lee el texto proporcionado con un tono ${styles.join(', ')} y natural.`,
        responseModalities: [Modality.AUDIO], // Solicitar respuesta en formato audio
      },
    });

    // Extraer audio de la respuesta
    // La estructura de respuesta de Gemini: response.candidates[0].content.parts[]
    const candidates = (response as any).candidates || [];
    if (candidates.length === 0) {
      console.warn('⚠️ Gemini TTS: No se recibieron candidatos en la respuesta');
      return null;
    }

    const content = candidates[0]?.content;
    if (!content) {
      console.warn('⚠️ Gemini TTS: No se recibió contenido en la respuesta');
      return null;
    }

    const parts = content.parts || [];
    const audioPart = parts.find((part: any) => part.audio || part.inlineData);

    if (!audioPart) {
      console.warn('⚠️ Gemini TTS: No se encontró parte de audio en la respuesta');
      return null;
    }

    // El audio puede venir en diferentes formatos
    let audioData: any = audioPart.audio || audioPart.inlineData?.data;

    if (!audioData) {
      console.warn('⚠️ Gemini TTS: No se encontró datos de audio en la parte');
      return null;
    }

    // Convertir audio a base64 para compatibilidad
    let base64Audio: string;

    if (typeof audioData === 'string') {
      // Si ya es base64 (puede venir con prefijo data:audio/...;base64,)
      if (audioData.startsWith('data:')) {
        base64Audio = audioData.split(',')[1] || audioData;
      } else {
        base64Audio = audioData;
      }
    } else if (audioData instanceof Uint8Array) {
      // Convertir Uint8Array a base64
      const binaryString = Array.from(audioData)
        .map((byte) => String.fromCharCode(byte))
        .join('');
      base64Audio = btoa(binaryString);
    } else if (audioData instanceof ArrayBuffer) {
      // Convertir ArrayBuffer a base64
      const bytes = new Uint8Array(audioData);
      const binaryString = Array.from(bytes)
        .map((byte) => String.fromCharCode(byte))
        .join('');
      base64Audio = btoa(binaryString);
    } else {
      console.warn('⚠️ Gemini TTS: Formato de audio no reconocido:', typeof audioData);
      return null;
    }

    console.log('✅ Gemini TTS: Audio generado exitosamente', {
      audioLength: base64Audio.length,
      voiceName,
    });

    return base64Audio;
  } catch (error) {
    console.error('❌ Error en síntesis de voz con Gemini:', error);
    return null;
  }
};
