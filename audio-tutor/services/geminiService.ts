
import { GoogleGenAI, Modality } from "@google/genai";
import { resolveGeminiApiKey } from "../utils/env";

const chatModel = 'gemini-2.5-flash';
const proModel = 'gemini-2.5-pro';
const ttsModel = 'gemini-2.5-flash-preview-tts';

const systemInstruction = "Eres EduSpark, un tutor de IA amigable y alentador para una plataforma educativa. Mantén tus respuestas concisas, útiles y atractivas para estudiantes de todas las edades.";

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


export const synthesizeSpeech = async (text: string): Promise<string | null> => {
  try {
    const { client, missing } = getClient();
    if (missing || !client) {
      console.warn("GEMINI_API_KEY no configurada. Saltando síntesis de voz.");
      return null;
    }

    const response = await client.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    }
    return null;
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    return null;
  }
};
