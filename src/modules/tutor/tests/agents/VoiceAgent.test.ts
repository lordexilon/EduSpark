// =====================================================
// Tests para VoiceAgent
// =====================================================

import { VoiceAgent } from '../../agents/VoiceAgent';
import { TEST_CONFIG, MockServices } from '../test-setup';

describe('VoiceAgent', () => {
  let voiceAgent: VoiceAgent;
  
  beforeEach(() => {
    voiceAgent = new VoiceAgent(TEST_CONFIG.gemini.apiKey);
  });
  
  afterEach(() => {
    // Cleanup
    voiceAgent.stopListening();
    voiceAgent.stopSpeech();
  });
  
  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      expect(voiceAgent).toBeDefined();
      expect(voiceAgent.getStatus()).toEqual({
        isListening: false,
        isSpeaking: false,
        isPaused: false,
        currentVoice: 'Kore',
        currentSpeed: 1.0
      });
    });
  });
  
  describe('Configuración de Voz', () => {
    test('debe cambiar la voz correctamente', () => {
      voiceAgent.setVoice('Charon');
      expect(voiceAgent.getStatus().currentVoice).toBe('Charon');
    });
    
    test('debe cambiar la velocidad correctamente', () => {
      voiceAgent.setSpeed(1.5);
      expect(voiceAgent.getStatus().currentSpeed).toBe(1.5);
    });
    
    test('debe validar rangos de velocidad', () => {
      // Velocidad muy baja
      voiceAgent.setSpeed(0.1);
      expect(voiceAgent.getStatus().currentSpeed).toBe(0.5); // Mínimo
      
      // Velocidad muy alta
      voiceAgent.setSpeed(3.0);
      expect(voiceAgent.getStatus().currentSpeed).toBe(2.0); // Máximo
    });
  });
  
  describe('Síntesis de Voz', () => {
    test('debe sintetizar texto correctamente', async () => {
      const testText = 'Hola, soy EduSpark tu tutor virtual';
      
      // Mock del servicio de Gemini
      const mockSpeak = jest.spyOn(voiceAgent as any, 'synthesizeWithGemini')
        .mockResolvedValue(new Blob(['audio data'], { type: 'audio/mpeg' }));
      
      await voiceAgent.speak(testText);
      
      expect(mockSpeak).toHaveBeenCalledWith(testText, {
        voiceName: 'Kore',
        speed: 1.0
      });
      
      mockSpeak.mockRestore();
    });
    
    test('debe manejar errores de síntesis', async () => {
      const testText = 'Texto de prueba';
      
      // Mock de error
      const mockSpeak = jest.spyOn(voiceAgent as any, 'synthesizeWithGemini')
        .mockRejectedValue(new Error('Error de síntesis'));
      
      await expect(voiceAgent.speak(testText)).rejects.toThrow('Error de síntesis');
      
      mockSpeak.mockRestore();
    });
    
    test('debe pausar y reanudar correctamente', async () => {
      const testText = 'Texto largo para pausar';
      
      // Mock del servicio
      const mockSpeak = jest.spyOn(voiceAgent as any, 'synthesizeWithGemini')
        .mockResolvedValue(new Blob(['audio data'], { type: 'audio/mpeg' }));
      
      await voiceAgent.speak(testText);
      
      // Pausar
      voiceAgent.pauseSpeech();
      expect(voiceAgent.getStatus().isPaused).toBe(true);
      
      // Reanudar
      voiceAgent.resumeSpeech();
      expect(voiceAgent.getStatus().isPaused).toBe(false);
      
      mockSpeak.mockRestore();
    });
  });
  
  describe('Reconocimiento de Voz', () => {
    test('debe iniciar reconocimiento correctamente', async () => {
      // Mock del Web Speech API
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        continuous: false,
        interimResults: false,
        lang: 'es-ES'
      };
      
      // Mock global
      (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
      (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);
      
      const promise = voiceAgent.startListening();
      
      // Simular resultado
      setTimeout(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            results: [{
              0: { transcript: 'Hola mundo' },
              isFinal: true
            }]
          });
        }
      }, 100);
      
      const result = await promise;
      expect(result).toBe('Hola mundo');
      expect(mockRecognition.start).toHaveBeenCalled();
    });
    
    test('debe manejar errores de reconocimiento', async () => {
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        continuous: false,
        interimResults: false,
        lang: 'es-ES'
      };
      
      (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
      (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);
      
      const promise = voiceAgent.startListening();
      
      // Simular error
      setTimeout(() => {
        if (mockRecognition.onerror) {
          mockRecognition.onerror({ error: 'no-speech' });
        }
      }, 100);
      
      await expect(promise).rejects.toThrow('Error de reconocimiento: no-speech');
    });
    
    test('debe detener reconocimiento correctamente', () => {
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        continuous: false,
        interimResults: false,
        lang: 'es-ES'
      };
      
      (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
      (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);
      
      voiceAgent.startListening();
      voiceAgent.stopListening();
      
      expect(mockRecognition.stop).toHaveBeenCalled();
    });
  });
  
  describe('Integración con Configuración Pedagógica', () => {
    test('debe aplicar configuración de voz del docente', async () => {
      const pedagogicalSettings = {
        voiceName: 'Charon',
        voiceSpeed: 0.8,
        tonePreference: 'formal'
      };
      
      voiceAgent.applyPedagogicalSettings(pedagogicalSettings);
      
      expect(voiceAgent.getStatus().currentVoice).toBe('Charon');
      expect(voiceAgent.getStatus().currentSpeed).toBe(0.8);
    });
    
    test('debe adaptar tono según preferencia del docente', async () => {
      const testText = 'Explicación de concepto';
      
      const mockSpeak = jest.spyOn(voiceAgent as any, 'synthesizeWithGemini')
        .mockResolvedValue(new Blob(['audio data'], { type: 'audio/mpeg' }));
      
      // Aplicar configuración formal
      voiceAgent.applyPedagogicalSettings({
        tonePreference: 'formal',
        voiceName: 'Charon',
        voiceSpeed: 0.8
      });
      
      await voiceAgent.speak(testText);
      
      expect(mockSpeak).toHaveBeenCalledWith(testText, {
        voiceName: 'Charon',
        speed: 0.8,
        tone: 'formal'
      });
      
      mockSpeak.mockRestore();
    });
  });
  
  describe('Manejo de Estado', () => {
    test('debe actualizar estado correctamente', () => {
      const initialState = voiceAgent.getStatus();
      expect(initialState.isListening).toBe(false);
      expect(initialState.isSpeaking).toBe(false);
      
      // Simular cambio de estado
      (voiceAgent as any).updateStatus({ isListening: true });
      expect(voiceAgent.getStatus().isListening).toBe(true);
    });
    
    test('debe limpiar estado al detener', () => {
      voiceAgent.stopListening();
      voiceAgent.stopSpeech();
      
      const status = voiceAgent.getStatus();
      expect(status.isListening).toBe(false);
      expect(status.isSpeaking).toBe(false);
      expect(status.isPaused).toBe(false);
    });
  });
});
