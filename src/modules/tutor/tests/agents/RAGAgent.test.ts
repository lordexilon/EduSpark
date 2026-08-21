// =====================================================
// Tests para RAGAgent
// =====================================================

import { RAGAgent } from '../../agents/RAGAgent';
import { ragService } from '../../services/ragService';
import { TEST_DATA } from '../test-setup';
import type { ConversationContext } from '../../types/agents';
import type { PedagogicalSettings, StudentProfile } from '../../types/pedagogical';

describe('RAGAgent', () => {
  let ragAgent: RAGAgent;

  const baseContext: ConversationContext = {
    studentId: 'student-visual-001',
    courseId: 'course-biology-001',
    conversationId: 'test-conv-001',
    pedagogicalSettings: TEST_DATA.pedagogicalSettings[0] as unknown as PedagogicalSettings,
    studentProfile: {
      id: 'student-visual-001',
      studentId: 'student-visual-001',
      courseId: 'course-biology-001',
      preferredLearningStyle: 'visual',
      interactionCount: 1,
      avgSessionDuration: 10,
      topicsStruggled: [],
      topicsMastered: ['biología celular'],
      lastUpdated: new Date(),
    },
    recentMessages: [],
  };

  const mockRagData = {
    success: true,
    message: 'Respuesta RAG personalizada',
    metadata: {
      model: 'gemini-2.5-flash',
      source: 'A2A RAG',
      contextUsed: 'Biología General',
      timestamp: new Date().toISOString(),
      sources: ['Biología General', 'Harrison'],
      sourceMetadata: [],
      confidence: 0.9,
    },
  };

  beforeEach(() => {
    ragAgent = new RAGAgent();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      expect(ragAgent).toBeDefined();
    });
  });

  describe('Consultas RAG', () => {
    test('debe procesar consulta básica correctamente', async () => {
      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      const result = await ragAgent.query('¿Qué es la fotosíntesis?', baseContext);

      expect(result).toBeDefined();
      expect(result.answer).toBe('Respuesta RAG personalizada');
      expect(result.sources).toEqual(['Biología General', 'Harrison']);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
    });

    test('debe manejar errores del servicio RAG correctamente', async () => {
      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: null, error: 'Error de RAG', success: false });

      const result = await ragAgent.query('Consulta de prueba', baseContext);

      expect(result).toBeDefined();
      expect(result.answer).toContain('Lo siento');
      expect(result.sources).toEqual([]);
      expect(result.metadata.error).toBeDefined();
    });

    test('debe manejar errores de conexión correctamente', async () => {
      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockRejectedValue(new Error('Error de conexión'));

      const result = await ragAgent.query('Consulta de prueba', baseContext);

      expect(result).toBeDefined();
      expect(result.answer).toContain('Lo siento');
    });
  });

  describe('Personalización del Estudiante', () => {
    test('debe aplicar perfil del estudiante', () => {
      const response = 'Respuesta base del tutor';
      const profile = baseContext.studentProfile;

      const personalizedResponse = ragAgent.applyStudentProfile(response, profile);

      expect(personalizedResponse).toContain('Respuesta base del tutor');
    });
  });

  describe('Integración con Personalización', () => {
    test('debe combinar configuración pedagógica y perfil del estudiante', async () => {
      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      const result = await ragAgent.query('¿Cómo funciona la evolución?', baseContext);

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('debe conservar la metadata pedagógica en la respuesta', async () => {
      const mockWithMetadata = {
        ...mockRagData,
        metadata: {
          ...mockRagData.metadata,
          sourceMetadata: [
            {
              title: 'Biología General',
              sourceFileName: 'Biología General.pdf',
              materialId: 'm1',
              pageStart: 10,
              pageEnd: 12,
            },
          ],
        },
      };

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockWithMetadata, error: null, success: true });

      const result = await ragAgent.query('¿Qué es la célula?', baseContext);

      expect(result).toBeDefined();
      expect(result.metadata.pedagogicalSettings).toBeDefined();
      expect(result.metadata.studentProfile).toBeDefined();
      expect(result.metadata.sourceMetadata).toHaveLength(1);
    });
  });
});
