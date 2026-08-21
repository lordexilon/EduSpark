// services/textToSpeechService.ts
// Servicio para Google Cloud Text-to-Speech API
// Voces premium Journey y Studio (ultra naturales)

import { resolveGeminiApiKey } from '@/modules/tutor/utils/env';

// URL base de la API de Google Cloud Text-to-Speech
const TTS_BASE_URL = 'https://texttospeech.googleapis.com/v1';

// Voces premium multiidioma (ordenadas por calidad)
export type SpanishVoice =
  // ESPAÑOL - JOURNEY VOICES (ULTRA NATURALES)
  | 'es-US-Journey-F'
  | 'es-US-Journey-D'
  // ESPAÑOL - STUDIO VOICES (PREMIUM)
  | 'es-US-Studio-B'
  // ESPAÑOL - NEURAL2 VOICES (ALTA CALIDAD)
  | 'es-US-Neural2-A'
  | 'es-US-Neural2-B'
  | 'es-ES-Neural2-A'
  | 'es-ES-Neural2-B'
  // ESPAÑOL - WAVENET VOICES (BUENA CALIDAD)
  | 'es-US-Wavenet-A'
  | 'es-US-Wavenet-B'
  // INGLÉS - JOURNEY VOICES
  | 'en-US-Journey-F'
  | 'en-US-Journey-D'
  // PORTUGUÉS - NEURAL2 VOICES (Journey no disponible para pt-BR)
  | 'pt-BR-Neural2-A'
  | 'pt-BR-Neural2-B'
  // PORTUGUÉS - WAVENET VOICES (fallback)
  | 'pt-BR-Wavenet-A'
  | 'pt-BR-Wavenet-B';

export interface TTSOptions {
  voice?: SpanishVoice;
  languageCode?: string;
  speakingRate?: number; // 0.25 a 4.0 (por defecto 1.0)
  pitch?: number; // -20.0 a 20.0 (por defecto 0.0)
  volumeGainDb?: number; // -96.0 a 16.0 (por defecto 0.0)
}

export interface TTSResponse {
  audioContent: string; // Base64 encoded audio
  timepoints?: Array<{
    markName: string;
    timeSeconds: number;
  }>;
}

// =====================================================
// CLASE PRINCIPAL
// =====================================================

export class TextToSpeechService {
  private apiKey: string;

  constructor(apiKey?: string) {
    const { key, missing } = resolveGeminiApiKey();
    if (missing || !key) {
      throw new Error('GEMINI_API_KEY no está configurada para Text-to-Speech');
    }
    this.apiKey = apiKey || key;
  }

  /**
   * Sintetiza texto a voz usando Google Cloud TTS
   *
   * @param text - Texto a sintetizar (máximo 5000 caracteres)
   * @param options - Opciones de voz y configuración
   * @returns Audio en formato base64 (MP3)
   */
  async synthesizeSpeech(text: string, options: TTSOptions = {}): Promise<string> {
    // Validar longitud del texto
    if (text.length > 5000) {
      console.warn('⚠️ TTS: Texto muy largo, truncando a 5000 caracteres');
      text = text.substring(0, 5000);
    }

    const {
      voice = 'es-US-Journey-F', // Voz premium por defecto (ultra natural)
      languageCode = 'es-US',
      speakingRate = 1.0,
      pitch = 0.0,
      volumeGainDb = 0.0,
    } = options;

    try {
      const response = await fetch(`${TTS_BASE_URL}/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voice,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: Math.max(0.25, Math.min(4.0, speakingRate)),
            pitch: Math.max(-20.0, Math.min(20.0, pitch)),
            volumeGainDb: Math.max(-96.0, Math.min(16.0, volumeGainDb)),
            effectsProfileId: ['headphone-class-device'], // Optimiza para auriculares
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`TTS API Error: ${error.error?.message || response.statusText}`);
      }

      const data: TTSResponse = await response.json();

      console.log('✅ TTS: Audio sintetizado exitosamente', {
        voice,
        textLength: text.length,
        speakingRate,
      });

      return data.audioContent;
    } catch (error: any) {
      console.error('❌ TTS: Error sintetizando voz:', error);
      throw error;
    }
  }

  /**
   * Convierte base64 audio a ArrayBuffer
   *
   * @param base64Audio - Audio en formato base64
   * @returns ArrayBuffer con los datos de audio
   */
  base64ToArrayBuffer(base64Audio: string): ArrayBuffer {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }

  /**
   * Reproduce audio desde base64 (MP3 format from Google Cloud TTS)
   *
   * @param base64Audio - Audio en formato base64 (MP3)
   * @returns Promise que se resuelve cuando termina la reproducción
   */
  async playAudio(base64Audio: string): Promise<void> {
    try {
      // Convertir base64 a ArrayBuffer
      const audioBuffer = this.base64ToArrayBuffer(base64Audio);

      // Crear AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Decodificar el audio MP3 usando la API nativa del navegador
      // Esto maneja automáticamente el formato MP3
      const audioData = await audioContext.decodeAudioData(audioBuffer);

      // Crear source y conectar
      const source = audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(audioContext.destination);

      // Reproducir
      source.start(0);

      console.log('✅ TTS: Audio reproduciendo', {
        duration: `${audioData.duration.toFixed(2)}s`,
        sampleRate: audioData.sampleRate,
        channels: audioData.numberOfChannels,
      });

      return new Promise((resolve, reject) => {
        source.onended = () => {
          console.log('✅ TTS: Reproducción completada');
          resolve();
        };

        source.onerror = (error) => {
          console.error('❌ TTS: Error en reproducción:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('❌ TTS: Error reproduciendo audio:', error);
      throw error;
    }
  }

  /**
   * Sintetiza y reproduce audio en un solo paso
   *
   * @param text - Texto a sintetizar y reproducir
   * @param options - Opciones de voz
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const audioBase64 = await this.synthesizeSpeech(text, options);
    await this.playAudio(audioBase64);
  }

  /**
   * Divide texto largo en chunks para síntesis
   * Útil para textos mayores a 5000 caracteres
   *
   * @param text - Texto a dividir
   * @param maxLength - Longitud máxima por chunk (por defecto 4500)
   * @returns Array de chunks de texto
   */
  splitTextIntoChunks(text: string, maxLength: number = 4500): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Si una sola oración es muy larga, dividirla por comas
        if (sentence.length > maxLength) {
          const parts = sentence.split(',');
          for (const part of parts) {
            if ((currentChunk + part).length > maxLength) {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = part;
            } else {
              currentChunk += part;
            }
          }
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Sintetiza y reproduce texto largo dividiéndolo en chunks
   *
   * @param text - Texto largo a reproducir
   * @param options - Opciones de voz
   */
  async speakLongText(text: string, options: TTSOptions = {}): Promise<void> {
    const chunks = this.splitTextIntoChunks(text);

    console.log(`🎤 TTS: Reproduciendo texto largo en ${chunks.length} partes`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎤 TTS: Reproduciendo parte ${i + 1}/${chunks.length}`);
      await this.speak(chunks[i], options);
    }
  }
}

// =====================================================
// INSTANCIA SINGLETON
// =====================================================

let ttsInstance: TextToSpeechService | null = null;

/**
 * Obtiene la instancia singleton del servicio TTS
 */
export function getTTSService(): TextToSpeechService {
  if (!ttsInstance) {
    ttsInstance = new TextToSpeechService();
  }
  return ttsInstance;
}

// =====================================================
// FUNCIONES DE CONVENIENCIA
// =====================================================

/**
 * Función rápida para sintetizar y reproducir texto
 *
 * @param text - Texto a reproducir
 * @param voice - Voz a usar (por defecto es-US-Journey-F - ultra natural)
 */
export async function speak(text: string, voice?: SpanishVoice): Promise<void> {
  const tts = getTTSService();
  await tts.speak(text, { voice });
}

/**
 * Función para obtener solo el audio sin reproducirlo
 *
 * @param text - Texto a sintetizar
 * @param options - Opciones de voz
 * @returns Audio en formato base64
 */
export async function getAudio(text: string, options?: TTSOptions): Promise<string> {
  const tts = getTTSService();
  return await tts.synthesizeSpeech(text, options);
}
