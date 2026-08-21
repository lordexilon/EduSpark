// =====================================================
// Tests para VoiceAgent
// =====================================================

import { VoiceAgent } from '../../agents/VoiceAgent';
import * as geminiService from '../../services/geminiService';

describe('VoiceAgent', () => {
  let voiceAgent: VoiceAgent;

  beforeEach(() => {
    voiceAgent = new VoiceAgent({ voiceName: 'Kore', speed: 1.0 });
  });

  afterEach(() => {
    voiceAgent.stopListening();
    voiceAgent.stopSpeech();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      expect(voiceAgent).toBeDefined();
      expect(voiceAgent.getStatus()).toEqual({
        isListening: false,
        isSpeaking: false,
        isPaused: false,
        currentVoice: { voiceName: 'Kore', speed: 1.0 },
      });
    });
  });

  describe('Configuración de Voz', () => {
    test('debe cambiar la voz correctamente', () => {
      voiceAgent.setVoice('Charon');
      expect(voiceAgent.getStatus().currentVoice.voiceName).toBe('Charon');
    });

    test('debe cambiar la velocidad correctamente', () => {
      voiceAgent.setSpeed(1.5);
      expect(voiceAgent.getStatus().currentVoice.speed).toBe(1.5);
    });

    test('debe validar rangos de velocidad', () => {
      voiceAgent.setSpeed(0.1);
      expect(voiceAgent.getStatus().currentVoice.speed).toBe(0.5);

      voiceAgent.setSpeed(3.0);
      expect(voiceAgent.getStatus().currentVoice.speed).toBe(2.0);
    });
  });

  describe('Síntesis de Voz', () => {
    test('debe sintetizar texto correctamente', async () => {
      const testText = 'Hola, soy EduSpark tu tutor virtual';

      jest.spyOn(geminiService, 'synthesizeSpeech').mockResolvedValue('base64audio');
      jest.spyOn(voiceAgent as any, 'playAudio').mockResolvedValue(undefined);

      await voiceAgent.speak(testText);

      expect(geminiService.synthesizeSpeech).toHaveBeenCalledWith(
        testText,
        expect.objectContaining({ voiceName: 'Kore', speed: 1.0 })
      );
    });

    test('debe manejar errores de síntesis', async () => {
      const testText = 'Texto de prueba';

      jest
        .spyOn(geminiService, 'synthesizeSpeech')
        .mockRejectedValue(new Error('Error de síntesis'));

      await expect(voiceAgent.speak(testText)).rejects.toThrow('Error de síntesis');
    });

    test('debe pausar y reanudar correctamente', async () => {
      const testText = 'Texto largo para pausar';

      jest.spyOn(geminiService, 'synthesizeSpeech').mockResolvedValue('base64audio');
      jest.spyOn(voiceAgent as any, 'playAudio').mockResolvedValue(undefined);

      await voiceAgent.speak(testText);

      voiceAgent.pauseSpeech();
      expect(voiceAgent.getStatus().isPaused).toBe(true);

      voiceAgent.resumeSpeech();
      expect(voiceAgent.getStatus().isPaused).toBe(false);
    });
  });

  describe('Reconocimiento de Voz', () => {
    test('debe iniciar reconocimiento correctamente', async () => {
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        continuous: false,
        interimResults: false,
        lang: 'es-ES',
      };

      (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
      (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);

      const agent = new VoiceAgent({ voiceName: 'Kore', speed: 1.0 });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const promise = agent.startListening();

      setTimeout(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            results: [
              {
                0: { transcript: 'Hola mundo' },
                isFinal: true,
              },
            ],
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
        lang: 'es-ES',
      };

      (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
      (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);

      const agent = new VoiceAgent({ voiceName: 'Kore', speed: 1.0 });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const promise = agent.startListening();

      setTimeout(() => {
        if (mockRecognition.onerror) {
          mockRecognition.onerror({ error: 'no-speech' });
        }
      }, 100);

      await expect(promise).rejects.toThrow('no-speech');
    });

    test('debe detener reconocimiento correctamente', async () => {
      const mockRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        continuous: false,
        interimResults: false,
        lang: 'es-ES',
      };

      (window as any).SpeechRecognition = jest.fn(() => mockRecognition);
      (window as any).webkitSpeechRecognition = jest.fn(() => mockRecognition);

      const agent = new VoiceAgent({ voiceName: 'Kore', speed: 1.0 });
      await new Promise((resolve) => setTimeout(resolve, 0));

      agent.startListening();
      agent.stopListening();

      expect(mockRecognition.stop).toHaveBeenCalled();
    });
  });

  describe('Integración con Configuración Pedagógica', () => {
    test('debe aplicar configuración de voz del docente', () => {
      const pedagogicalSettings = {
        voiceName: 'Charon' as const,
        voiceSpeed: 0.8,
        tonePreference: 'formal' as const,
      };

      voiceAgent.applyPedagogicalSettings(pedagogicalSettings);

      expect(voiceAgent.getStatus().currentVoice.voiceName).toBe('Charon');
      expect(voiceAgent.getStatus().currentVoice.speed).toBe(0.8);
    });

    test('debe adaptar tono según preferencia del docente', async () => {
      const testText = 'Explicación de concepto';

      jest.spyOn(geminiService, 'synthesizeSpeech').mockResolvedValue('base64audio');
      jest.spyOn(voiceAgent as any, 'playAudio').mockResolvedValue(undefined);

      voiceAgent.applyPedagogicalSettings({
        tonePreference: 'formal',
        voiceName: 'Charon',
        voiceSpeed: 0.8,
      });

      await voiceAgent.speak(testText);

      expect(geminiService.synthesizeSpeech).toHaveBeenCalledWith(
        testText,
        expect.objectContaining({ voiceName: 'Charon', speed: 0.8 })
      );
    });
  });

  describe('Manejo de Estado', () => {
    test('debe actualizar estado correctamente', () => {
      const initialState = voiceAgent.getStatus();
      expect(initialState.isListening).toBe(false);
      expect(initialState.isSpeaking).toBe(false);

      voiceAgent.setVoice('Kore');
      expect(voiceAgent.getStatus().currentVoice.voiceName).toBe('Kore');
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
