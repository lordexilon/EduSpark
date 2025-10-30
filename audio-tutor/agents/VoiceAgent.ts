// =====================================================
// Agente de Voz para Audio-Tutor Multi-Agente
// Manejo de entrada/salida de audio con Gemini 2.5 Flash TTS
// =====================================================

import { synthesizeSpeech } from '../services/geminiService';
import { resolveGeminiApiKey } from '../utils/env';
import type { VoiceConfig, VoiceAgentStatus, AudioCapabilities } from '../types/agents';

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

  constructor(initialVoice: VoiceConfig = { voiceName: 'Kore', speed: 1.0 }) {
    this.currentVoice = initialVoice;
    this.initializeCapabilities();
  }

  /**
   * Inicializa las capacidades de audio del dispositivo
   */
  private async initializeCapabilities(): Promise<void> {
    try {
      // Verificar AudioContext
      const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
      
      // Verificar Speech Recognition
      const supportsSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      
      // Verificar micrófono
      let hasMicrophone = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hasMicrophone = true;
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        hasMicrophone = false;
        console.warn('Microphone access denied or not available:', err);
      }

      this.capabilities = {
        hasMicrophone,
        hasSpeakers: hasAudioContext,
        hasAudioContext,
        supportsSpeechRecognition
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
        supportsSpeechRecognition: false
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
      }

      // Generar audio con Gemini
      const audioContent = await synthesizeSpeech(text);
      
      if (!audioContent) {
        throw new Error('Failed to generate speech');
      }

      // Reproducir audio
      await this.playAudio(audioContent, voiceConfig);

    } catch (error) {
      this.isSpeaking = false;
      this.isPaused = false;
      throw error;
    }
  }

  /**
   * Reproduce el audio generado
   */
  private async playAudio(base64Audio: string, voiceConfig: VoiceConfig): Promise<void> {
    try {
      // Crear contexto de audio si no existe
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = this.audioContext;

      // Decodificar audio base64
      const audioData = this.decodeBase64(base64Audio);
      const buffer = await this.decodeAudioData(audioData, audioContext);

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

    } catch (error) {
      console.error('Error playing audio:', error);
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
   * Obtiene el estado actual del agente
   */
  getStatus(): VoiceAgentStatus {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentVoice: { ...this.currentVoice }
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
    return this.capabilities !== null && 
           this.capabilities.hasAudioContext && 
           this.recognition !== null;
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
   */
  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
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
