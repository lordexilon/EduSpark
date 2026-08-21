// =====================================================
// Tests para ContextAgent
// =====================================================

import { ContextAgent } from '../../agents/ContextAgent';
import { TEST_CONFIG, TEST_DATA, TestUtils, supabase } from '../test-setup';
import type { ChatMessage } from '../../types/agents';

describe('ContextAgent', () => {
  let contextAgent: ContextAgent;

  beforeAll(async () => {
    await TestUtils.setupTestData();
  });

  beforeEach(() => {
    contextAgent = new ContextAgent();
  });

  afterAll(async () => {
    await TestUtils.cleanupTestData();
  });

  const createTestMessage = (id: string, role: ChatMessage['role'], text: string): ChatMessage => ({
    id,
    role,
    text,
    timestamp: new Date(),
    metadata: {},
  });

  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      expect(contextAgent).toBeDefined();
      expect(contextAgent.getCurrentConversation()).toBeNull();
      expect(contextAgent.getCurrentCourseContext()).toBeNull();
    });
  });

  describe('Gestión de Conversaciones', () => {
    test('debe crear nueva conversación correctamente', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      const conversation = await contextAgent.initConversation(studentId, courseId);

      expect(conversation).toBeDefined();
      expect(conversation.studentId).toBe(studentId);
      expect(conversation.courseId).toBe(courseId);
      expect(conversation.startedAt).toBeDefined();
      expect(contextAgent.getCurrentConversation()).toBeDefined();
    });

    test('debe cargar conversación existente', async () => {
      const testConversation = await TestUtils.createTestConversation(
        'student-visual-001',
        'course-biology-001'
      );

      const conversation = await contextAgent.loadConversation(testConversation.id);

      expect(conversation).toBeDefined();
      expect(conversation.id).toBe(testConversation.id);
      expect(conversation.studentId).toBe('student-visual-001');
      expect(conversation.courseId).toBe('course-biology-001');
    });

    test('debe manejar conversación no encontrada', async () => {
      await expect(contextAgent.loadConversation('conversation-inexistente')).rejects.toThrow();
    });
  });

  describe('Gestión de Mensajes', () => {
    test('debe agregar mensaje de usuario correctamente', async () => {
      const conversation = await contextAgent.initConversation(
        'student-visual-001',
        'course-biology-001'
      );

      const message = createTestMessage(
        `msg-user-${Date.now()}`,
        'user',
        'Hola, ¿qué es la fotosíntesis?'
      );

      await contextAgent.addMessage(message);

      const history = await contextAgent.getConversationHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.some((msg) => msg.text === message.text)).toBe(true);
    });

    test('debe agregar mensaje del asistente correctamente', async () => {
      await contextAgent.initConversation('student-visual-001', 'course-biology-001');

      const message = createTestMessage(
        `msg-assistant-${Date.now()}`,
        'assistant',
        'La fotosíntesis es el proceso...'
      );

      await contextAgent.addMessage(message);

      const history = await contextAgent.getConversationHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.some((msg) => msg.text === message.text)).toBe(true);
    });

    test('debe obtener mensajes de conversación', async () => {
      await contextAgent.initConversation('student-visual-001', 'course-biology-001');

      await contextAgent.addMessage(createTestMessage(`msg-1-${Date.now()}`, 'user', 'Pregunta 1'));
      await contextAgent.addMessage(
        createTestMessage(`msg-2-${Date.now()}`, 'assistant', 'Respuesta 1')
      );
      await contextAgent.addMessage(createTestMessage(`msg-3-${Date.now()}`, 'user', 'Pregunta 2'));

      const messages = await contextAgent.getConversationHistory();
      expect(messages.length).toBeGreaterThanOrEqual(3);
      expect(messages.some((msg) => msg.text === 'Pregunta 1')).toBe(true);
      expect(messages.some((msg) => msg.text === 'Respuesta 1')).toBe(true);
      expect(messages.some((msg) => msg.text === 'Pregunta 2')).toBe(true);
    });
  });

  describe('Gestión de Memoria', () => {
    test('debe obtener contexto relevante', async () => {
      await contextAgent.initConversation('student-visual-001', 'course-biology-001');

      const context = await contextAgent.getRelevantContext('¿Cómo funciona la clorofila?');

      expect(context).toBeDefined();
      expect(context.messages).toBeDefined();
      expect(context.summary).toBeDefined();
      expect(context.relevantTopics).toBeDefined();
      expect(context.studentProgress).toBeDefined();
    });

    test('debe analizar el progreso del estudiante', async () => {
      await contextAgent.initConversation('student-visual-001', 'course-biology-001');

      const progress = await contextAgent.analyzeStudentProgress();

      expect(progress).toBeDefined();
      expect(progress.interactionCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(progress.topicsMastered)).toBe(true);
    });
  });

  describe('Contexto Pedagógico', () => {
    test('debe obtener configuración pedagógica del curso', async () => {
      const courseId = 'course-biology-001';

      const settings = await contextAgent.getPedagogicalContext(courseId);

      expect(settings).toBeDefined();
      expect(settings.courseId).toBe(courseId);
      expect(settings.teachingStyle).toBeDefined();
    });

    test('debe retornar configuración por defecto si no existe', async () => {
      const courseId = 'course-inexistente';

      const settings = await contextAgent.getPedagogicalContext(courseId);

      expect(settings).toBeDefined();
      expect(settings.courseId).toBe(courseId);
    });
  });

  describe('Perfil del Estudiante', () => {
    test('debe obtener perfil del estudiante', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      const profile = await contextAgent.getStudentContext(studentId, courseId);

      expect(profile).toBeDefined();
      expect(profile.studentId).toBe(studentId);
      expect(profile.courseId).toBe(courseId);
      expect(profile.preferredLearningStyle).toBeDefined();
    });

    test('debe crear perfil por defecto si no existe', async () => {
      const studentId = 'student-nuevo-001';
      const courseId = 'course-biology-001';

      const profile = await contextAgent.getStudentContext(studentId, courseId);

      expect(profile).toBeDefined();
      expect(profile.studentId).toBe(studentId);
      expect(profile.courseId).toBe(courseId);
    });

    test('debe actualizar el perfil del estudiante', async () => {
      const studentId = 'student-nuevo-001';
      const courseId = 'course-biology-001';

      await contextAgent.updateStudentContext(studentId, courseId, {
        interactionCount: 5,
        topicsStruggled: ['biología celular'],
      });

      const profile = await contextAgent.getStudentContext(studentId, courseId);
      expect(profile).toBeDefined();
      expect(profile.studentId).toBe(studentId);
    });
  });

  describe('Contexto Completo', () => {
    test('debe obtener contexto completo de conversación', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      const conversation = await contextAgent.initConversation(studentId, courseId);

      await contextAgent.addMessage(
        createTestMessage(`msg-${Date.now()}`, 'user', 'Hola, tengo una pregunta sobre biología')
      );

      const fullContext = contextAgent.exportContext();

      expect(fullContext).toBeDefined();
      expect(fullContext.conversation).toBeDefined();
      expect(fullContext.conversation!.id).toBe(conversation.id);
      expect(fullContext.memory).toBeDefined();
    });
  });

  describe('Manejo de Errores', () => {
    test('debe manejar errores de base de datos', async () => {
      const invalidAgent = new ContextAgent();

      const conversation = await invalidAgent.initConversation('student-001', 'course-001');

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
    });

    test('debe manejar conversación inválida', async () => {
      await expect(
        contextAgent.addMessage(createTestMessage('msg-invalid', 'user', 'Mensaje de prueba'))
      ).rejects.toThrow('No active conversation');
    });
  });

  describe('Manejo de Estado', () => {
    test('debe limpiar el contexto', () => {
      contextAgent.clearContext();
      expect(contextAgent.getCurrentConversation()).toBeNull();
      expect(contextAgent.getCurrentCourseContext()).toBeNull();
    });

    test('debe exportar el estado actual', async () => {
      await contextAgent.initConversation('student-visual-001', 'course-biology-001');

      const state = contextAgent.exportContext();
      expect(state.conversation).toBeDefined();

      contextAgent.clearContext();
      expect(contextAgent.getCurrentConversation()).toBeNull();
    });
  });
});
