// =====================================================
// Agente de Voz para Audio-Tutor Multi-Agente
// Manejo de entrada/salida de audio con Gemini 2.5 Flash TTS
// =====================================================

import { synthesizeSpeech } from '@/services/geminiService';
import { resolveGeminiApiKey } from '../utils/env';
import type { VoiceConfig, VoiceAgentStatus, AudioCapabilities } from '../types/agents';
import type { PedagogicalSettings } from '../types/pedagogical';

// =====================================================
// Clase VoiceAgent
// =====================================================

export class VoiceAgent {
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private currentVoice: VoiceConfig;
  private recognition: SpeechRecognition | null = null;
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private capabilities: AudioCapabilities | null = null;

  constructor(initialVoice: VoiceConfig = { voiceName: 'Kore', speed: 1.2 }) {
    // Velocidad por defecto aumentada a 1.2 para respuestas más rápidas
    this.currentVoice = initialVoice;
    this.initializeCapabilities();
    // Pre-inicializar AudioContext para mejorar velocidad de respuesta
    this.preInitializeAudioContext();
  }

  /**
   * Pre-inicializa el AudioContext para mejorar la velocidad de respuesta
   */
  private preInitializeAudioContext(): void {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Suspender inmediatamente para no consumir recursos hasta que se necesite
        if (this.audioContext.state === 'running') {
          this.audioContext.suspend();
        }
        console.log('✅ VoiceAgent: AudioContext pre-inicializado para mejor rendimiento');
      }
    } catch (error) {
      console.warn('⚠️ VoiceAgent: No se pudo pre-inicializar AudioContext:', error);
    }
  }

  /**
   * Inicializa las capacidades de audio del dispositivo
   */
  private async initializeCapabilities(): Promise<void> {
    try {
      // Verificar AudioContext
      const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);

      // Verificar Speech Recognition
      const supportsSpeechRecognition = !!(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );

      // Verificar micrófono
      let hasMicrophone = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hasMicrophone = true;
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        hasMicrophone = false;
        console.warn('Microphone access denied or not available:', err);
      }

      this.capabilities = {
        hasMicrophone,
        hasSpeakers: hasAudioContext,
        hasAudioContext,
        supportsSpeechRecognition,
      };

      if (supportsSpeechRecognition) {
        this.initializeSpeechRecognition();
      }
    } catch (error) {
      console.error('Error initializing audio capabilities:', error);
      this.capabilities = {
        hasMicrophone: false,
        hasSpeakers: false,
        hasAudioContext: false,
        supportsSpeechRecognition: false,
      };
    }
  }

  /**
   * Inicializa el reconocimiento de voz
   */
  private initializeSpeechRecognition(): void {
    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();

      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES';
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      this.recognition = null;
    }
  }

  /**
   * Inicia la escucha de voz
   */
  async startListening(): Promise<string> {
    if (!this.capabilities?.supportsSpeechRecognition || !this.recognition) {
      throw new Error('Speech recognition not available');
    }

    if (this.isListening) {
      throw new Error('Already listening');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        try {
          const transcript = event.results[0]?.[0]?.transcript || '';
          this.isListening = false;
          resolve(transcript);
        } catch (error) {
          console.error('Error procesando resultado de reconocimiento:', error);
          this.isListening = false;
          reject(new Error('Error procesando resultado de reconocimiento de voz'));
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * Detiene la escucha de voz
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Reproduce audio usando Gemini 2.5 Flash TTS
   */
  async speak(text: string, voiceSettings?: Partial<VoiceConfig>): Promise<void> {
    if (this.isSpeaking && !this.isPaused) {
      throw new Error('Already speaking');
    }

    if (this.isPaused) {
      this.resumeSpeech();
      return;
    }

    try {
      this.isSpeaking = true;
      this.isPaused = false;

      // Configurar voz
      const voiceConfig = { ...this.currentVoice, ...voiceSettings };

      // Verificar si hay API key de Gemini configurada
      const { missing } = resolveGeminiApiKey();
      if (missing) {
        console.warn('GEMINI_API_KEY no configurada. Saltando síntesis de voz.');
        // Simular audio para continuar el flujo
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return;
      }

      // Generar audio con Gemini usando voces expresivas
      // Mapear configuración de voz a estilos expresivos
      const expressiveStyles: Array<
        | 'friendly'
        | 'professional'
        | 'energetic'
        | 'calm'
        | 'excited'
        | 'empathetic'
        | 'authoritative'
        | 'warm'
        | 'clear'
      > = [];

      // Determinar estilos basados en la voz seleccionada
      switch (voiceConfig.voiceName) {
        case 'Kore':
          expressiveStyles.push('professional', 'clear');
          break;
        case 'Charon':
          expressiveStyles.push('authoritative', 'professional');
          break;
        case 'Fenrir':
          expressiveStyles.push('energetic', 'excited');
          break;
        case 'Aoede':
          expressiveStyles.push('warm', 'empathetic');
          break;
        case 'Puck':
          expressiveStyles.push('friendly', 'calm');
          break;
      }

      console.log('🎤 VoiceAgent: Generando audio con voces expresivas de Gemini 2.5 Flash', {
        voiceName: voiceConfig.voiceName,
        speed: voiceConfig.speed,
        styles: expressiveStyles,
        model: 'gemini-2.5-flash', // Modelo correcto con Modality.AUDIO
        expressivePrompts: true, // Indicaciones expresivas activadas
      });

      const audioContent = await synthesizeSpeech(text, {
        voiceName: voiceConfig.voiceName,
        speed: voiceConfig.speed,
        styles: expressiveStyles,
        useNaturalPrompts: true, // Activar indicaciones naturales para voces expresivas
      });

      if (!audioContent) {
        // Si no hay audio (porque el modelo no lo soporta o está desactivado), simplemente retornar
        console.warn(
          '⚠️ VoiceAgent: No se pudo generar audio - síntesis desactivada o no disponible'
        );
        this.isSpeaking = false;
        this.isPaused = false;
        return;
      }

      console.log('✅ VoiceAgent: Audio expresivo generado exitosamente');

      // Reproducir audio
      await this.playAudio(audioContent, voiceConfig);
    } catch (error) {
      this.isSpeaking = false;
      this.isPaused = false;
      throw error;
    }
  }

  /**
   * Reproduce el audio generado (MP3 from Google Cloud TTS)
   */
  private async playAudio(base64Audio: string, voiceConfig: VoiceConfig): Promise<void> {
    try {
      console.log('🔊 VoiceAgent: Iniciando reproducción de audio expresivo', {
        audioLength: base64Audio.length,
        voiceName: voiceConfig.voiceName,
        speed: voiceConfig.speed,
      });

      // Crear contexto de audio si no existe
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('✅ VoiceAgent: AudioContext creado');
      }

      // Reanudar contexto si está suspendido (requerido por navegadores modernos)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('✅ VoiceAgent: AudioContext reanudado');
      }

      const audioContext = this.audioContext;

      // Decodificar audio base64 a ArrayBuffer
      const audioData = this.decodeBase64(base64Audio);
      console.log('✅ VoiceAgent: Audio base64 decodificado', {
        dataLength: audioData.length,
      });

      // Usar decodeAudioData nativo del navegador para MP3
      // Esto maneja automáticamente el formato MP3 de Google Cloud TTS
      const buffer = await audioContext.decodeAudioData(audioData.buffer);

      console.log('✅ VoiceAgent: Audio MP3 decodificado correctamente', {
        samples: buffer.length,
        duration: `${buffer.duration.toFixed(2)}s`,
        sampleRate: buffer.sampleRate,
      });

      // Crear fuente de audio
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      // Aplicar velocidad de voz - validar exhaustivamente
      let speed = 1.0; // Default

      if (voiceConfig && voiceConfig.speed !== undefined && voiceConfig.speed !== null) {
        const parsedSpeed = Number(voiceConfig.speed);

        // Validar que sea un número finito y esté en rango válido
        if (Number.isFinite(parsedSpeed) && parsedSpeed >= 0.25 && parsedSpeed <= 2.0) {
          speed = parsedSpeed;
        } else {
          console.warn('Invalid playback speed:', voiceConfig.speed, '- using default 1.0');
        }
      }

      // Asignar con seguridad
      try {
        source.playbackRate.value = speed;
      } catch (e) {
        console.error('Error setting playbackRate to', speed, ':', e);
        // Si falla, no lanzar error, continuar con audio sin control de velocidad
      }

      // Configurar eventos
      source.onended = () => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.audioSource = null;
      };

      // Reproducir
      source.start();
      this.audioSource = source;

      console.log('✅ VoiceAgent: Audio expresivo iniciado', {
        duration: `${buffer.duration.toFixed(2)}s`,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        playbackRate: speed,
      });
    } catch (error) {
      console.error('❌ VoiceAgent: Error reproduciendo audio expresivo:', error);
      this.isSpeaking = false;
      this.isPaused = false;
      throw error;
    }
  }

  /**
   * Pausa la reproducción de audio
   */
  pauseSpeech(): void {
    if (this.audioContext && this.isSpeaking && !this.isPaused) {
      this.audioContext.suspend();
      this.isPaused = true;
    }
  }

  /**
   * Reanuda la reproducción de audio
   */
  resumeSpeech(): void {
    if (this.audioContext && this.isSpeaking && this.isPaused) {
      this.audioContext.resume();
      this.isPaused = false;
    }
  }

  /**
   * Detiene la reproducción de audio
   */
  stopSpeech(): void {
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    this.isSpeaking = false;
    this.isPaused = false;
  }

  /**
   * Cambia la voz del agente
   */
  setVoice(voiceName: VoiceConfig['voiceName']): void {
    this.updateVoiceConfig({ voiceName });
  }

  /**
   * Cambia la velocidad de la voz, validando el rango permitido
   */
  setSpeed(speed: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, speed));
    this.updateVoiceConfig({ speed: clamped });
  }

  /**
   * Aplica la configuración de voz desde la configuración pedagógica
   */
  applyPedagogicalSettings(
    settings: Pick<PedagogicalSettings, 'voiceName' | 'voiceSpeed' | 'tonePreference'>
  ): void {
    this.updateVoiceConfig({
      voiceName: settings.voiceName,
      speed: settings.voiceSpeed,
    });
  }

  /**
   * Obtiene el estado actual del agente
   */
  getStatus(): VoiceAgentStatus {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentVoice: { ...this.currentVoice },
    };
  }

  /**
   * Actualiza la configuración de voz
   */
  updateVoiceConfig(newConfig: Partial<VoiceConfig>): void {
    this.currentVoice = { ...this.currentVoice, ...newConfig };
  }

  /**
   * Obtiene las capacidades de audio del dispositivo
   */
  getCapabilities(): AudioCapabilities | null {
    return this.capabilities;
  }

  /**
   * Verifica si el agente está listo para usar
   */
  isReady(): boolean {
    return (
      this.capabilities !== null && this.capabilities.hasAudioContext && this.recognition !== null
    );
  }

  /**
   * Decodifica base64 a Uint8Array
   */
  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Decodifica datos de audio para AudioContext
   * Gemini 2.5 Flash devuelve audio en formato PCM lineal (16-bit, mono, 24kHz)
   */
  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    try {
      // Gemini TTS devuelve audio PCM lineal de 16-bit
      // Formato: PCM 16-bit, mono, 24kHz (según documentación de Gemini)
      const sampleRate = 24000; // Tasa de muestreo estándar de Gemini TTS

      // Convertir bytes a Int16Array (little-endian)
      const int16Array = new Int16Array(data.length / 2);
      for (let i = 0; i < int16Array.length; i++) {
        const byte1 = data[i * 2];
        const byte2 = data[i * 2 + 1];
        // Little-endian: byte bajo primero, byte alto segundo
        int16Array[i] = (byte2 << 8) | byte1;
        // Convertir de signed 16-bit a float32 (-32768 a 32767 -> -1.0 a 1.0)
        if (int16Array[i] >= 32768) {
          int16Array[i] -= 65536; // Convertir unsigned a signed
        }
      }

      const frameCount = int16Array.length;
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Normalizar a rango [-1.0, 1.0]
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      console.log('✅ VoiceAgent: Audio decodificado correctamente', {
        samples: frameCount,
        duration: `${(frameCount / sampleRate).toFixed(2)}s`,
        sampleRate,
      });

      return buffer;
    } catch (error) {
      console.error('❌ VoiceAgent: Error decodificando audio:', error);
      throw new Error(
        `Error decodificando audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Limpia recursos del agente
   */
  cleanup(): void {
    this.stopListening();
    this.stopSpeech();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.recognition = null;
  }
}
