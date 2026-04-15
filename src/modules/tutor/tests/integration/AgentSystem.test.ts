// =====================================================
// Tests de Integración para el Sistema Multi-Agente
// =====================================================

import { AgentCoordinator } from '../../agents/AgentCoordinator';
import { TEST_CONFIG, TEST_DATA, TestUtils, supabase } from '../test-setup';

describe('Sistema Multi-Agente - Integración', () => {
  let agentCoordinator: AgentCoordinator;
  
  beforeAll(async () => {
    await TestUtils.setupTestData();
  });
  
  beforeEach(() => {
    agentCoordinator = new AgentCoordinator(
      TEST_CONFIG.gemini.apiKey,
      TEST_CONFIG.n8n.webhookUrl,
      supabase
    );
  });
  
  afterAll(async () => {
    await TestUtils.cleanupTestData();
  });
  
  describe('Flujo Completo de Conversación', () => {
    test('debe procesar consulta de texto con personalización completa', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la fotosíntesis?';
      
      // Mock de servicios externos
      const mockGeminiResponse = {
        text: 'La fotosíntesis es el proceso por el cual las plantas convierten la luz solar en energía química...',
        sources: [
          { title: 'Biología General', url: 'https://example.com', relevance: 0.95 }
        ]
      };
      
      const mockN8nResponse = {
        response: 'Respuesta RAG personalizada',
        sources: MockServices.mockN8nResponse.sources,
        personalization: {
          appliedStyle: 'socratico',
          examplesIncluded: true,
          questionsEncouraged: true
        }
      };
      
      // Mock de servicios
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue(mockGeminiResponse);
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response).toBeDefined();
      expect(response.text).toContain('fotosíntesis');
      expect(response.personalization).toBeDefined();
      expect(response.personalization.appliedStyle).toBe('socratico');
    });
    
    test('debe procesar consulta de audio con síntesis de voz', async () => {
      const studentId = 'student-auditory-002';
      const courseId = 'course-chemistry-002';
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      // Mock de transcripción
      jest.spyOn(agentCoordinator['voiceAgent'] as any, 'transcribeAudio')
        .mockResolvedValue('Explica la síntesis de proteínas');
      
      // Mock de servicios
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(MockServices.mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: 'La síntesis de proteínas es un proceso complejo...',
          sources: []
        });
      
      jest.spyOn(agentCoordinator['voiceAgent'] as any, 'synthesizeWithGemini')
        .mockResolvedValue(new Blob(['audio response'], { type: 'audio/mpeg' }));
      
      const response = await agentCoordinator.handleUserInput(audioBlob, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: true
      });
      
      expect(response).toBeDefined();
      expect(response.text).toContain('síntesis de proteínas');
      expect(response.audioUrl).toBeDefined();
    });
  });
  
  describe('Personalización por Estilo Pedagógico', () => {
    test('debe aplicar estilo socrático correctamente', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001'; // Estilo socrático
      const query = '¿Qué es la evolución?';
      
      const mockN8nResponse = {
        response: '¿Qué entiendes por evolución? ¿Has observado cambios en los seres vivos?',
        sources: [],
        personalization: {
          appliedStyle: 'socratico',
          examplesIncluded: true,
          questionsEncouraged: true
        }
      };
      
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: mockN8nResponse.response,
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response.personalization.appliedStyle).toBe('socratico');
      expect(response.text).toContain('¿Qué entiendes');
      expect(response.text).toContain('¿Has observado');
    });
    
    test('debe aplicar estilo directo correctamente', async () => {
      const studentId = 'student-auditory-002';
      const courseId = 'course-chemistry-002'; // Estilo directo
      const query = 'Explica la tabla periódica';
      
      const mockN8nResponse = {
        response: 'La tabla periódica es una disposición sistemática de los elementos químicos...',
        sources: [],
        personalization: {
          appliedStyle: 'directo',
          examplesIncluded: true,
          questionsEncouraged: false
        }
      };
      
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: mockN8nResponse.response,
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response.personalization.appliedStyle).toBe('directo');
      expect(response.text).toContain('disposición sistemática');
    });
    
    test('debe aplicar estilo constructivista correctamente', async () => {
      const studentId = 'student-kinesthetic-003';
      const courseId = 'course-physics-003'; // Estilo constructivista
      const query = '¿Cómo funciona un laboratorio?';
      
      const mockN8nResponse = {
        response: 'Imagina que estás en un laboratorio. ¿Qué herramientas necesitarías? ¿Cómo las usarías?',
        sources: [],
        personalization: {
          appliedStyle: 'constructivista',
          examplesIncluded: true,
          questionsEncouraged: true
        }
      };
      
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: mockN8nResponse.response,
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response.personalization.appliedStyle).toBe('constructivista');
      expect(response.text).toContain('Imagina que estás');
    });
  });
  
  describe('Personalización por Perfil de Estudiante', () => {
    test('debe adaptar respuesta para estudiante visual', async () => {
      const studentId = 'student-visual-001'; // Estudiante visual
      const courseId = 'course-biology-001';
      const query = '¿Qué es la célula?';
      
      const mockN8nResponse = {
        response: 'La célula es como una fábrica microscópica. Imagina un diagrama donde...',
        sources: [],
        personalization: {
          appliedStyle: 'socratico',
          learningStyle: 'visual',
          examplesIncluded: true
        }
      };
      
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: mockN8nResponse.response,
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response.personalization.learningStyle).toBe('visual');
      expect(response.text).toContain('diagrama');
    });
    
    test('debe adaptar respuesta para estudiante auditivo', async () => {
      const studentId = 'student-auditory-002'; // Estudiante auditivo
      const courseId = 'course-chemistry-002';
      const query = '¿Qué es la química?';
      
      const mockN8nResponse = {
        response: 'La química es como una sinfonía de elementos. Escucha cómo se combinan...',
        sources: [],
        personalization: {
          appliedStyle: 'directo',
          learningStyle: 'auditory',
          examplesIncluded: true
        }
      };
      
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: mockN8nResponse.response,
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response.personalization.learningStyle).toBe('auditory');
      expect(response.text).toContain('sinfonía');
    });
    
    test('debe adaptar respuesta para estudiante kinestésico', async () => {
      const studentId = 'student-kinesthetic-003'; // Estudiante kinestésico
      const courseId = 'course-physics-003';
      const query = '¿Qué es la física?';
      
      const mockN8nResponse = {
        response: 'La física es como un experimento que puedes tocar. Prueba a mover tu mano...',
        sources: [],
        personalization: {
          appliedStyle: 'constructivista',
          learningStyle: 'kinesthetic',
          examplesIncluded: true
        }
      };
      
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(mockN8nResponse);
      
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: mockN8nResponse.response,
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response.personalization.learningStyle).toBe('kinesthetic');
      expect(response.text).toContain('experimento');
    });
  });
  
  describe('Persistencia de Memoria', () => {
    test('debe mantener conversación entre sesiones', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      
      // Primera sesión
      const response1 = await agentCoordinator.handleUserInput('Hola, soy Ana', {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      const conversationId = response1.conversationId;
      expect(conversationId).toBeDefined();
      
      // Segunda sesión - cargar conversación existente
      const response2 = await agentCoordinator.handleUserInput('¿Te acuerdas de mí?', {
        studentId,
        courseId,
        conversationId,
        isAudio: false
      });
      
      expect(response2.conversationId).toBe(conversationId);
      
      // Verificar que se mantiene el contexto
      const messages = await agentCoordinator['contextAgent'].getConversationMessages(conversationId);
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
    
    test('debe generar resumen de conversación', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      
      // Crear conversación con múltiples mensajes
      const response1 = await agentCoordinator.handleUserInput('¿Qué es la fotosíntesis?', {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      const response2 = await agentCoordinator.handleUserInput('¿Y la respiración celular?', {
        studentId,
        courseId,
        conversationId: response1.conversationId,
        isAudio: false
      });
      
      const summary = await agentCoordinator['contextAgent'].generateConversationSummary(response1.conversationId);
      
      expect(summary).toBeDefined();
      expect(summary.topic).toContain('biología');
      expect(summary.keyPoints.length).toBeGreaterThan(0);
    });
  });
  
  describe('Manejo de Errores', () => {
    test('debe manejar error de n8n gracefully', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la biología?';
      
      // Mock de error en n8n
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockRejectedValue(new Error('Error de n8n'));
      
      // Mock de respuesta de fallback
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockResolvedValue({
          text: 'Lo siento, no puedo acceder a la información del curso en este momento.',
          sources: []
        });
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response).toBeDefined();
      expect(response.text).toContain('no puedo acceder');
    });
    
    test('debe manejar error de Gemini gracefully', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la biología?';
      
      // Mock de respuesta de n8n
      jest.spyOn(agentCoordinator['ragAgent'] as any, 'callN8nWebhook')
        .mockResolvedValue(MockServices.mockN8nResponse);
      
      // Mock de error en Gemini
      jest.spyOn(agentCoordinator['geminiService'] as any, 'generateText')
        .mockRejectedValue(new Error('Error de Gemini'));
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response).toBeDefined();
      expect(response.text).toContain('Error procesando');
    });
  });
  
  describe('Rendimiento', () => {
    test('debe responder en menos de 3 segundos', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la biología?';
      
      const startTime = Date.now();
      
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(3000); // Menos de 3 segundos
      expect(response).toBeDefined();
    });
    
    test('debe manejar múltiples consultas concurrentes', async () => {
      const queries = [
        '¿Qué es la biología?',
        '¿Qué es la química?',
        '¿Qué es la física?'
      ];
      
      const promises = queries.map((query, index) => 
        agentCoordinator.handleUserInput(query, {
          studentId: `student-${index}`,
          courseId: 'course-biology-001',
          conversationId: null,
          isAudio: false
        })
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.text).toBeDefined();
      });
    });
  });
});
