// =====================================================
// Tests de Integración para el Sistema Multi-Agente
// =====================================================

import { AgentCoordinator } from '../../agents/AgentCoordinator';
import { VoiceAgent } from '../../agents/VoiceAgent';
import { RAGAgent } from '../../agents/RAGAgent';
import { ContextAgent } from '../../agents/ContextAgent';
import { ragService } from '../../services/ragService';
import { TEST_DATA, TestUtils, supabase } from '../test-setup';

describe('Sistema Multi-Agente - Integración', () => {
  let agentCoordinator: AgentCoordinator;

  const mockRagData = {
    success: true,
    message: 'Respuesta RAG personalizada',
    metadata: {
      model: 'gemini-2.5-flash',
      source: 'A2A RAG',
      contextUsed: 'Biología General',
      timestamp: new Date().toISOString(),
      sources: ['Biología General'],
      sourceMetadata: [],
      confidence: 0.9,
    },
  };

  const testUser = {
    id: 'student-visual-001',
    first_name: 'Ana',
    last_name: 'Visual',
    role: { name: 'student' },
  };

  async function initCoordinator(studentId: string, courseId: string): Promise<void> {
    await agentCoordinator.initialize(studentId, courseId, { ...testUser, id: studentId }, {});
  }

  beforeAll(async () => {
    await TestUtils.setupTestData();
  });

  beforeEach(() => {
    agentCoordinator = new AgentCoordinator(
      new VoiceAgent({ voiceName: 'Kore', speed: 1.0 }),
      new RAGAgent(),
      new ContextAgent()
    );
  });

  afterAll(async () => {
    await TestUtils.cleanupTestData();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    agentCoordinator.cleanup();
  });

  describe('Flujo Completo de Conversación', () => {
    test('debe procesar consulta de texto con personalización completa', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la fotosíntesis?';

      jest.spyOn(ragService, 'processQueryWithContext').mockResolvedValue({
        data: {
          ...mockRagData,
          message:
            'La fotosíntesis es el proceso por el cual las plantas convierten la luz solar en energía química...',
        },
        error: null,
        success: true,
      });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toContain('fotosíntesis');
      expect(response.agentUsed).toBe('rag');
    });

    test('debe responder cuando el servicio RAG falla', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la biología?';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: null, error: 'Error de RAG', success: false });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('Personalización por Estilo Pedagógico', () => {
    test('debe aplicar estilo pedagógico del curso', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la evolución?';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.metadata.confidence).toBeGreaterThan(0);
    });
  });

  describe('Personalización por Perfil de Estudiante', () => {
    test('debe adaptar respuesta para estudiante visual', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la célula?';

      jest.spyOn(ragService, 'processQueryWithContext').mockResolvedValue({
        data: {
          ...mockRagData,
          message: 'La célula es como una fábrica microscópica. Imagina un diagrama donde...',
        },
        error: null,
        success: true,
      });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toContain('diagrama');
    });
  });

  describe('Persistencia de Memoria', () => {
    test('debe mantener conversación entre sesiones', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const response1 = await agentCoordinator.handleUserInput('Hola, soy Ana');
      expect(response1).toBeDefined();

      const conversationId = agentCoordinator.getSystemStatus().currentContext?.conversation.id;
      expect(conversationId).toBeDefined();

      const response2 = await agentCoordinator.handleUserInput('¿Te acuerdas de mí?');
      expect(response2).toBeDefined();
      expect(agentCoordinator.getSystemStatus().currentContext?.conversation.id).toBe(
        conversationId
      );

      const messages = await agentCoordinator['contextAgent'].getConversationHistory();
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Manejo de Errores', () => {
    test('debe manejar error del servicio RAG gracefully', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la biología?';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockRejectedValue(new Error('Error de RAG'));

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(response.message).toContain('Lo siento');
    });
  });

  describe('Rendimiento', () => {
    test('debe responder en menos de 5 segundos', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la biología?';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const startTime = Date.now();
      const response = await agentCoordinator.handleUserInput(query);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
      expect(response).toBeDefined();
    });

    test('debe manejar múltiples consultas concurrentes', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const queries = ['¿Qué es la biología?', '¿Qué es la química?', '¿Qué es la física?'];

      const responses = await Promise.all(
        queries.map((query) => agentCoordinator.handleUserInput(query))
      );

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
      });
    });
  });
});
