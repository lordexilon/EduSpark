
import { GoogleGenAI, Modality } from "@google/genai";
import { resolveGeminiApiKey } from "../utils/env";

const chatModel = 'gemini-2.5-flash';
const proModel = 'gemini-2.5-pro';
// Para voces expresivas, usar el mismo modelo gemini-2.5-flash con Modality.AUDIO
// Las voces expresivas se activan mediante indicaciones naturales en el texto
const ttsModel = 'gemini-2.5-flash'; // Usar el modelo principal con Modality.AUDIO para voces expresivas

const systemInstruction = "Eres EduSpark, un tutor de IA amigable y alentador para una plataforma educativa. Mantén tus respuestas concisas, útiles y atractivas para estudiantes de todas las edades. IMPORTANTE: Responde siempre en el mismo idioma en que el estudiante te pregunta (español o inglés). Si pregunta en inglés, responde en inglés; si pregunta en español, responde en español.";

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
      console.warn("GEMINI_API_KEY no configurada. Usando respuesta de respaldo.");
      return "Lo siento, no tengo acceso al servicio de Gemini en este momento. Inténtalo más tarde.";
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
    console.error("Error getting tutor response:", error);
    return "Lo siento, estoy teniendo problemas para conectarme en este momento. Por favor, inténtalo de nuevo más tarde.";
  }
};

export const processDocument = async (fileContent: string): Promise<string> => {
  const prompt = `Eres EduSpark, un tutor de IA. Tu tarea es organizar el siguiente contenido en un formato de lección para una clase. Debes estructurarlo con claridad, utilizando secciones como "Introducción", "Conceptos Clave" (con definiciones), "Ejemplos Prácticos" y un "Resumen" final. El formato debe ser fácil de seguir para un estudiante. Aquí está el contenido:\n\n---\n\n${fileContent}`;
  try {
    const { client, missing } = getClient();
    if (missing || !client) {
      console.warn("GEMINI_API_KEY no configurada. No se puede procesar documentos.");
      return "Lo siento, no puedo procesar documentos en este momento porque la configuración de Gemini no está completa.";
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
    console.error("Error processing document:", error);
    return "Lo siento, tuve un problema al procesar el documento. Por favor, asegúrate de que sea un archivo de texto e inténtalo de nuevo.";
  }
};


/**
 * Sintetiza texto a voz usando Voces Expresivas de Gemini 2.5 Flash
 * 
 * Las voces expresivas permiten control de estilo, acento y tono mediante
 * indicaciones en lenguaje natural como "[friendly and warm]" o "[extremely fast]"
 * 
 * @param text - Texto a sintetizar
 * @param options - Opciones de voz expresiva:
 *   - voiceName: Nombre de la voz (Kore, Charon, Fenrir, Aoede, Puck)
 *   - styles: Array de estilos expresivos (friendly, professional, energetic, etc.)
 *   - speed: Velocidad del habla (0.5 a 2.0, por defecto 1.0)
 *   - useNaturalPrompts: Si es true, usa indicaciones naturales en el texto
 */
export const synthesizeSpeech = async (
  text: string,
  options: {
    voiceName?: 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck';
    styles?: Array<'friendly' | 'professional' | 'energetic' | 'calm' | 'excited' | 'empathetic' | 'authoritative' | 'warm' | 'clear' | 'amused' | 'fast' | 'slow'>;
    speed?: number;
    useNaturalPrompts?: boolean;
  } = {}
): Promise<string | null> => {
  try {
    const { client, missing } = getClient();
    if (missing || !client) {
      console.warn("GEMINI_API_KEY no configurada. Saltando síntesis de voz.");
      return null;
    }

    const voiceName = options.voiceName || 'Kore';
    const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));
    
    // SIEMPRE usar indicaciones expresivas para activar las voces expresivas de Gemini 2.5 Flash
    // Las voces expresivas se activan mediante indicaciones naturales en el texto
    let expressiveText = text;
    const stylePrompts: string[] = [];
    
    if (options.styles && options.styles.length > 0) {
      // Mapear estilos a indicaciones naturales
      const styleMap: Record<string, string> = {
        'friendly': 'friendly',
        'professional': 'professional',
        'energetic': 'energetic',
        'calm': 'calm',
        'excited': 'excited',
        'empathetic': 'empathetic',
        'authoritative': 'authoritative',
        'warm': 'warm',
        'clear': 'clear',
        'amused': 'amused',
        'fast': 'extremely fast',
        'slow': 'slow',
      };

      options.styles.forEach(style => {
        if (styleMap[style]) {
          stylePrompts.push(styleMap[style]);
        }
      });
    }

    // Si no se proporcionaron estilos, usar estilos por defecto según la voz
    if (stylePrompts.length === 0) {
      switch (voiceName) {
        case 'Kore':
          stylePrompts.push('professional', 'clear');
          break;
        case 'Charon':
          stylePrompts.push('authoritative', 'professional');
          break;
        case 'Fenrir':
          stylePrompts.push('energetic', 'excited');
          break;
        case 'Aoede':
          stylePrompts.push('warm', 'empathetic');
          break;
        case 'Puck':
          stylePrompts.push('friendly', 'calm');
          break;
      }
    }

    // Agregar indicación de velocidad si es diferente a normal
    if (speed !== 1.0) {
      if (speed > 1.5) stylePrompts.push('extremely fast');
      else if (speed > 1.2) stylePrompts.push('fast');
      else if (speed < 0.7) stylePrompts.push('slow');
    }

    // Construir texto con indicaciones expresivas (SIEMPRE activar voces expresivas)
    if (stylePrompts.length > 0) {
      const promptText = `[${stylePrompts.join(' and ')}]`;
      expressiveText = `${promptText} ${text}`;
      console.log('🎤 GeminiService: Activando voces expresivas con indicaciones:', promptText);
    } else {
      // Fallback: usar estilo amigable por defecto
      expressiveText = `[friendly and clear] ${text}`;
      console.log('🎤 GeminiService: Usando estilo expresivo por defecto: friendly and clear');
    }

    const response = await client.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: expressiveText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
          // Configuración adicional para voces expresivas
          ...(speed !== 1.0 && { speakingRate: speed }),
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      console.log('✅ GeminiService: Audio expresivo sintetizado exitosamente', {
        voiceName,
        styles: options.styles,
        speed,
      });
      return base64Audio;
    }
    return null;
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    return null;
  }
};
