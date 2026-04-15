/**
 * EJEMPLO PRÁCTICO: Conversión de Voz con Gemini 2.5 Flash
 * 
 * Este archivo muestra cómo usar la conversión de voz en tiempo real
 * para exportar a otro proyecto.
 */

import { GoogleGenAI, Modality } from "@google/genai";

// =====================================================
// CONFIGURACIÓN BÁSICA
// =====================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
const TTS_MODEL = 'gemini-2.5-flash';

// =====================================================
// TIPOS
// =====================================================

type VoiceName = 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck';
type Style = 'friendly' | 'professional' | 'energetic' | 'calm' | 'excited' | 
             'empathetic' | 'authoritative' | 'warm' | 'clear' | 'amused' | 'fast' | 'slow';

interface VoiceOptions {
  voiceName?: VoiceName;
  styles?: Style[];
  speed?: number; // 0.5 a 2.0
}

// =====================================================
// FUNCIÓN PRINCIPAL: SINTETIZAR VOZ
// =====================================================

/**
 * Convierte texto a audio usando Gemini 2.5 Flash
 * 
 * @param text - Texto a convertir
 * @param options - Opciones de voz
 * @returns Audio en Base64 o null
 */
export async function convertirTextoAVoz(
  text: string,
  options: VoiceOptions = {}
): Promise<string | null> {
  try {
    // 1. Validar API Key
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY no configurada');
      return null;
    }

    // 2. Crear cliente Gemini
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // 3. Configurar voz y estilos
    const voiceName = options.voiceName || 'Kore';
    const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));

    // 4. Construir texto con indicaciones expresivas
    let textoConEstilos = text;
    
    if (options.styles && options.styles.length > 0) {
      const estilosTexto = `[${options.styles.join(' and ')}]`;
      textoConEstilos = `${estilosTexto} ${text}`;
    } else {
      // Estilos por defecto según la voz
      const estilosPorDefecto: Record<VoiceName, string> = {
        'Kore': '[professional and clear]',
        'Charon': '[authoritative and professional]',
        'Fenrir': '[energetic and excited]',
        'Aoede': '[warm and empathetic]',
        'Puck': '[friendly and calm]',
      };
      textoConEstilos = `${estilosPorDefecto[voiceName]} ${text}`;
    }

    // 5. Agregar velocidad si es diferente a 1.0
    if (speed !== 1.0) {
      if (speed > 1.5) textoConEstilos = `[extremely fast] ${textoConEstilos}`;
      else if (speed > 1.2) textoConEstilos = `[fast] ${textoConEstilos}`;
      else if (speed < 0.7) textoConEstilos = `[slow] ${textoConEstilos}`;
    }

    console.log('🎤 Generando audio con:', { voiceName, speed, textoConEstilos });

    // 6. Llamar a la API de Gemini
    const response = await client.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: textoConEstilos }] }],
      config: {
        responseModalities: [Modality.AUDIO], // ← CRÍTICO: Activar modo audio
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
          ...(speed !== 1.0 && { speakingRate: speed }),
        },
      },
    });

    // 7. Extraer audio Base64
    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (audioBase64) {
      console.log('✅ Audio generado exitosamente');
      return audioBase64;
    }

    console.warn('⚠️ No se recibió audio en la respuesta');
    return null;

  } catch (error) {
    console.error('❌ Error generando audio:', error);
    return null;
  }
}

// =====================================================
// FUNCIÓN: REPRODUCIR AUDIO
// =====================================================

/**
 * Reproduce audio Base64 usando Web Audio API
 * 
 * @param audioBase64 - Audio en Base64
 * @param speed - Velocidad de reproducción (opcional)
 */
export async function reproducirAudio(
  audioBase64: string,
  speed: number = 1.0
): Promise<void> {
  try {
    // 1. Crear AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 2. Reanudar si está suspendido
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // 3. Decodificar Base64 a bytes
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. Decodificar PCM a AudioBuffer
    // Gemini devuelve: PCM 16-bit, mono, 24kHz
    const sampleRate = 24000;
    const int16Array = new Int16Array(bytes.length / 2);

    for (let i = 0; i < int16Array.length; i++) {
      const byte1 = bytes[i * 2];
      const byte2 = bytes[i * 2 + 1];
      // Little-endian: byte bajo primero
      int16Array[i] = (byte2 << 8) | byte1;
      // Convertir unsigned a signed
      if (int16Array[i] >= 32768) {
        int16Array[i] -= 65536;
      }
    }

    const buffer = audioContext.createBuffer(1, int16Array.length, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Normalizar a [-1.0, 1.0]
    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768.0;
    }

    // 5. Crear fuente de audio y reproducir
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(audioContext.destination);
    source.start();

    console.log('🔊 Audio reproduciéndose');

  } catch (error) {
    console.error('❌ Error reproduciendo audio:', error);
    throw error;
  }
}

// =====================================================
// FUNCIÓN COMPLETA: CONVERTIR Y REPRODUCIR
// =====================================================

/**
 * Convierte texto a voz y lo reproduce automáticamente
 * 
 * @param text - Texto a convertir
 * @param options - Opciones de voz
 */
export async function hablar(
  text: string,
  options: VoiceOptions = {}
): Promise<void> {
  // 1. Convertir texto a audio
  const audioBase64 = await convertirTextoAVoz(text, options);

  if (!audioBase64) {
    throw new Error('No se pudo generar el audio');
  }

  // 2. Reproducir audio
  await reproducirAudio(audioBase64, options.speed || 1.0);
}

// =====================================================
// EJEMPLOS DE USO
// =====================================================

/**
 * Ejemplo 1: Uso básico
 */
export async function ejemploBasico() {
  await hablar('Hola, ¿cómo estás?', {
    voiceName: 'Kore',
    speed: 1.0
  });
}

/**
 * Ejemplo 2: Con estilos expresivos
 */
export async function ejemploConEstilos() {
  await hablar('¡Bienvenido al sistema!', {
    voiceName: 'Aoede',
    styles: ['warm', 'empathetic'],
    speed: 1.2
  });
}

/**
 * Ejemplo 3: Voz energética
 */
export async function ejemploEnergico() {
  await hablar('¡Vamos a empezar!', {
    voiceName: 'Fenrir',
    styles: ['energetic', 'excited'],
    speed: 1.5
  });
}

/**
 * Ejemplo 4: Solo generar audio (sin reproducir)
 */
export async function ejemploSoloGenerar() {
  const audioBase64 = await convertirTextoAVoz('Este es un ejemplo', {
    voiceName: 'Puck',
    styles: ['friendly', 'clear']
  });

  if (audioBase64) {
    // Guardar o usar el audio según necesites
    console.log('Audio generado:', audioBase64.substring(0, 50) + '...');
    
    // O reproducir después
    await reproducirAudio(audioBase64);
  }
}

// =====================================================
// USO EN REACT (EJEMPLO)
// =====================================================

/**
 * Ejemplo de uso en un componente React
 */
/*
import { useState } from 'react';
import { hablar } from './ejemplo-uso-voz-gemini';

function MiComponente() {
  const [hablando, setHablando] = useState(false);

  const handleHablar = async () => {
    try {
      setHablando(true);
      await hablar('Hola desde React', {
        voiceName: 'Kore',
        styles: ['friendly'],
        speed: 1.0
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setHablando(false);
    }
  };

  return (
    <button onClick={handleHablar} disabled={hablando}>
      {hablando ? 'Hablando...' : 'Reproducir'}
    </button>
  );
}
*/

// =====================================================
// EXPORTACIONES
// =====================================================

export default {
  convertirTextoAVoz,
  reproducirAudio,
  hablar,
  ejemploBasico,
  ejemploConEstilos,
  ejemploEnergico,
  ejemploSoloGenerar,
};

