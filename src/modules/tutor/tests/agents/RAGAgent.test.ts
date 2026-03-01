// =====================================================
// Tests para RAGAgent
// =====================================================

import { RAGAgent } from '../../agents/RAGAgent';
import { TEST_CONFIG, TEST_DATA, MockServices } from '../test-setup';

describe('RAGAgent', () => {
  let ragAgent: RAGAgent;
  
  beforeEach(() => {
    ragAgent = new RAGAgent(TEST_CONFIG.n8n.webhookUrl);
  });
  
  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      expect(ragAgent).toBeDefined();
      expect(ragAgent.getStatus()).toEqual({
        isProcessing: false,
        lastQuery: null,
        lastResponse: null,
        errorCount: 0
      });
    });
  });
  
  describe('Consultas RAG', () => {
    test('debe procesar consulta básica correctamente', async () => {
      const query = '¿Qué es la fotosíntesis?';
      const context = {
        studentId: 'student-visual-001',
        courseId: 'course-biology-001',
        conversationId: 'test-conv-001'
      };
      
      // Mock del servicio n8n
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockResolvedValue(MockServices.mockN8nResponse);
      
      const result = await ragAgent.query(query, context);
      
      expect(mockQuery).toHaveBeenCalledWith({
        query,
        context: {
          studentId: context.studentId,
          courseId: context.courseId,
          conversationId: context.conversationId,
          pedagogicalSettings: undefined,
          studentProfile: undefined
        }
      });
      
      expect(result).toEqual({
        response: MockServices.mockN8nResponse.response,
        sources: MockServices.mockN8nResponse.sources,
        personalization: MockServices.mockN8nResponse.personalization,
        query,
        context
      });
      
      mockQuery.mockRestore();
    });
    
    test('debe enriquecer contexto con configuración pedagógica', async () => {
      const query = 'Explica la síntesis de proteínas';
      const context = {
        studentId: 'student-auditory-002',
        courseId: 'course-chemistry-002',
        conversationId: 'test-conv-002'
      };
      
      const pedagogicalSettings = TEST_DATA.pedagogicalSettings[1]; // Estilo directo
      
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockResolvedValue(MockServices.mockN8nResponse);
      
      const result = await ragAgent.query(query, context, pedagogicalSettings);
      
      expect(mockQuery).toHaveBeenCalledWith({
        query,
        context: {
          studentId: context.studentId,
          courseId: context.courseId,
          conversationId: context.conversationId,
          pedagogicalSettings,
          studentProfile: undefined
        }
      });
      
      mockQuery.mockRestore();
    });
    
    test('debe aplicar perfil del estudiante', async () => {
      const query = '¿Cómo funciona un laboratorio?';
      const context = {
        studentId: 'student-kinesthetic-003',
        courseId: 'course-physics-003',
        conversationId: 'test-conv-003'
      };
      
      const studentProfile = TEST_DATA.students[2]; // Estudiante kinestésico
      
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockResolvedValue(MockServices.mockN8nResponse);
      
      const result = await ragAgent.query(query, context, undefined, studentProfile);
      
      expect(mockQuery).toHaveBeenCalledWith({
        query,
        context: {
          studentId: context.studentId,
          courseId: context.courseId,
          conversationId: context.conversationId,
          pedagogicalSettings: undefined,
          studentProfile
        }
      });
      
      mockQuery.mockRestore();
    });
    
    test('debe manejar errores de n8n correctamente', async () => {
      const query = 'Consulta de prueba';
      const context = {
        studentId: 'student-001',
        courseId: 'course-001',
        conversationId: 'conv-001'
      };
      
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockRejectedValue(new Error('Error de n8n'));
      
      await expect(ragAgent.query(query, context)).rejects.toThrow('Error de n8n');
      
      // Verificar que se incrementa el contador de errores
      expect(ragAgent.getStatus().errorCount).toBe(1);
      
      mockQuery.mockRestore();
    });
    
    test('debe reintentar en caso de error temporal', async () => {
      const query = 'Consulta de prueba';
      const context = {
        studentId: 'student-001',
        courseId: 'course-001',
        conversationId: 'conv-001'
      };
      
      let attemptCount = 0;
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Error temporal');
          }
          return MockServices.mockN8nResponse;
        });
      
      const result = await ragAgent.query(query, context);
      
      expect(attemptCount).toBe(3);
      expect(result).toBeDefined();
      
      mockQuery.mockRestore();
    });
  });
  
  describe('Enriquecimiento de Contexto', () => {
    test('debe enriquecer contexto con configuración pedagógica', () => {
      const baseContext = 'Contexto base de la consulta';
      const pedagogicalSettings = {
        teachingStyle: 'socratico',
        tonePreference: 'amigable',
        detailLevel: 'medio',
        useExamples: true,
        encourageQuestions: true
      };
      
      const enrichedContext = ragAgent.enrichContextWithPedagogy(baseContext, pedagogicalSettings);
      
      expect(enrichedContext).toContain('socratico');
      expect(enrichedContext).toContain('amigable');
      expect(enrichedContext).toContain('medio');
      expect(enrichedContext).toContain('ejemplos');
      expect(enrichedContext).toContain('preguntas');
    });
    
    test('debe aplicar perfil del estudiante', () => {
      const response = 'Respuesta base del tutor';
      const studentProfile = {
        preferredLearningStyle: 'visual',
        topicsStruggled: ['química orgánica'],
        topicsMastered: ['biología celular']
      };
      
      const personalizedResponse = ragAgent.applyStudentProfile(response, studentProfile);
      
      expect(personalizedResponse).toContain('visual');
      expect(personalizedResponse).toContain('química orgánica');
      expect(personalizedResponse).toContain('biología celular');
    });
  });
  
  describe('Manejo de Estado', () => {
    test('debe actualizar estado durante procesamiento', async () => {
      const query = 'Consulta de prueba';
      const context = {
        studentId: 'student-001',
        courseId: 'course-001',
        conversationId: 'conv-001'
      };
      
      let stateUpdates: any[] = [];
      const originalUpdateStatus = (ragAgent as any).updateStatus;
      (ragAgent as any).updateStatus = (status: any) => {
        stateUpdates.push(status);
        originalUpdateStatus.call(ragAgent, status);
      };
      
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockImplementation(async () => {
          // Simular procesamiento
          await new Promise(resolve => setTimeout(resolve, 100));
          return MockServices.mockN8nResponse;
        });
      
      await ragAgent.query(query, context);
      
      expect(stateUpdates).toContainEqual({ isProcessing: true });
      expect(stateUpdates).toContainEqual({ 
        isProcessing: false, 
        lastQuery: query,
        lastResponse: expect.any(Object)
      });
      
      mockQuery.mockRestore();
    });
    
    test('debe resetear estado correctamente', () => {
      ragAgent.reset();
      
      const status = ragAgent.getStatus();
      expect(status.isProcessing).toBe(false);
      expect(status.lastQuery).toBeNull();
      expect(status.lastResponse).toBeNull();
      expect(status.errorCount).toBe(0);
    });
  });
  
  describe('Validación de Entrada', () => {
    test('debe validar consulta vacía', async () => {
      const context = {
        studentId: 'student-001',
        courseId: 'course-001',
        conversationId: 'conv-001'
      };
      
      await expect(ragAgent.query('', context)).rejects.toThrow('Consulta no puede estar vacía');
    });
    
    test('debe validar contexto requerido', async () => {
      const query = 'Consulta de prueba';
      
      await expect(ragAgent.query(query, {} as any)).rejects.toThrow('Contexto de conversación requerido');
    });
    
    test('debe validar URL de webhook', () => {
      expect(() => new RAGAgent('')).toThrow('URL de webhook n8n requerida');
    });
  });
  
  describe('Integración con Personalización', () => {
    test('debe combinar configuración pedagógica y perfil del estudiante', async () => {
      const query = '¿Cómo funciona la evolución?';
      const context = {
        studentId: 'student-visual-001',
        courseId: 'course-biology-001',
        conversationId: 'test-conv-001'
      };
      
      const pedagogicalSettings = TEST_DATA.pedagogicalSettings[0]; // Socrático
      const studentProfile = TEST_DATA.students[0]; // Visual
      
      const mockQuery = jest.spyOn(ragAgent as any, 'callN8nWebhook')
        .mockResolvedValue(MockServices.mockN8nResponse);
      
      const result = await ragAgent.query(query, context, pedagogicalSettings, studentProfile);
      
      expect(mockQuery).toHaveBeenCalledWith({
        query,
        context: {
          studentId: context.studentId,
          courseId: context.courseId,
          conversationId: context.conversationId,
          pedagogicalSettings,
          studentProfile
        }
      });
      
      // Verificar que la respuesta incluye personalización
      expect(result.personalization).toBeDefined();
      
      mockQuery.mockRestore();
    });
  });
});
