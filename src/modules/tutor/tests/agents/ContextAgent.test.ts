// =====================================================
// Tests para ContextAgent
// =====================================================

import { ContextAgent } from '../../agents/ContextAgent';
import { TEST_CONFIG, TEST_DATA, TestUtils, supabase } from '../test-setup';

describe('ContextAgent', () => {
  let contextAgent: ContextAgent;
  
  beforeAll(async () => {
    await TestUtils.setupTestData();
  });
  
  beforeEach(() => {
    contextAgent = new ContextAgent(supabase);
  });
  
  afterAll(async () => {
    await TestUtils.cleanupTestData();
  });
  
  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      expect(contextAgent).toBeDefined();
      expect(contextAgent.getStatus()).toEqual({
        isProcessing: false,
        currentConversation: null,
        memorySize: 0,
        lastError: null
      });
    });
  });
  
  describe('Gestión de Conversaciones', () => {
    test('debe crear nueva conversación correctamente', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      
      const conversation = await contextAgent.initConversation(studentId, courseId);
      
      expect(conversation).toBeDefined();
      expect(conversation.student_id).toBe(studentId);
      expect(conversation.course_id).toBe(courseId);
      expect(conversation.started_at).toBeDefined();
      
      // Verificar que se creó en la base de datos
      const { data: dbConversation } = await supabase
        .from('tutor_conversations')
        .select('*')
        .eq('id', conversation.id)
        .single();
      
      expect(dbConversation).toBeDefined();
    });
    
    test('debe cargar conversación existente', async () => {
      // Crear conversación de prueba
      const testConversation = await TestUtils.createTestConversation(
        'student-visual-001',
        'course-biology-001'
      );
      
      const conversation = await contextAgent.loadConversation(testConversation.id);
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBe(testConversation.id);
      expect(conversation.student_id).toBe('student-visual-001');
      expect(conversation.course_id).toBe('course-biology-001');
    });
    
    test('debe manejar conversación no encontrada', async () => {
      await expect(contextAgent.loadConversation('conversation-inexistente'))
        .rejects.toThrow('Conversación no encontrada');
    });
  });
  
  describe('Gestión de Mensajes', () => {
    let testConversation: any;
    
    beforeEach(async () => {
      testConversation = await TestUtils.createTestConversation(
        'student-visual-001',
        'course-biology-001'
      );
    });
    
    test('debe agregar mensaje de usuario correctamente', async () => {
      const message = {
        role: 'user' as const,
        content: 'Hola, ¿qué es la fotosíntesis?',
        audioUrl: null
      };
      
      const result = await contextAgent.addMessage(testConversation.id, message);
      
      expect(result).toBeDefined();
      expect(result.role).toBe('user');
      expect(result.content).toBe(message.content);
      expect(result.conversation_id).toBe(testConversation.id);
      
      // Verificar que se guardó en la base de datos
      const { data: dbMessage } = await supabase
        .from('tutor_messages')
        .select('*')
        .eq('id', result.id)
        .single();
      
      expect(dbMessage).toBeDefined();
    });
    
    test('debe agregar mensaje del asistente correctamente', async () => {
      const message = {
        role: 'assistant' as const,
        content: 'La fotosíntesis es el proceso...',
        audioUrl: 'https://example.com/audio.mp3'
      };
      
      const result = await contextAgent.addMessage(testConversation.id, message);
      
      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
      expect(result.content).toBe(message.content);
      expect(result.audio_url).toBe(message.audioUrl);
    });
    
    test('debe obtener mensajes de conversación', async () => {
      // Agregar varios mensajes
      await contextAgent.addMessage(testConversation.id, {
        role: 'user',
        content: 'Pregunta 1',
        audioUrl: null
      });
      
      await contextAgent.addMessage(testConversation.id, {
        role: 'assistant',
        content: 'Respuesta 1',
        audioUrl: null
      });
      
      await contextAgent.addMessage(testConversation.id, {
        role: 'user',
        content: 'Pregunta 2',
        audioUrl: null
      });
      
      const messages = await contextAgent.getConversationMessages(testConversation.id);
      
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Pregunta 1');
      expect(messages[1].content).toBe('Respuesta 1');
      expect(messages[2].content).toBe('Pregunta 2');
    });
  });
  
  describe('Gestión de Memoria', () => {
    let testConversation: any;
    
    beforeEach(async () => {
      testConversation = await TestUtils.createTestConversation(
        'student-visual-001',
        'course-biology-001'
      );
      
      // Agregar mensajes de prueba
      await contextAgent.addMessage(testConversation.id, {
        role: 'user',
        content: '¿Qué es la fotosíntesis?',
        audioUrl: null
      });
      
      await contextAgent.addMessage(testConversation.id, {
        role: 'assistant',
        content: 'La fotosíntesis es el proceso por el cual las plantas...',
        audioUrl: null
      });
    });
    
    test('debe obtener contexto relevante', async () => {
      const query = '¿Cómo funciona la clorofila?';
      
      const context = await contextAgent.getRelevantContext(testConversation.id, query);
      
      expect(context).toBeDefined();
      expect(context.conversationId).toBe(testConversation.id);
      expect(context.messages).toBeDefined();
      expect(context.messages.length).toBeGreaterThan(0);
      expect(context.summary).toBeDefined();
    });
    
    test('debe generar resumen de conversación', async () => {
      const summary = await contextAgent.generateConversationSummary(testConversation.id);
      
      expect(summary).toBeDefined();
      expect(summary.conversationId).toBe(testConversation.id);
      expect(summary.topic).toBeDefined();
      expect(summary.keyPoints).toBeDefined();
      expect(summary.keyPoints.length).toBeGreaterThan(0);
    });
    
    test('debe limpiar memoria antigua', async () => {
      const initialSize = contextAgent.getStatus().memorySize;
      
      await contextAgent.cleanupOldMemory(1); // Limpiar mensajes de más de 1 día
      
      const finalSize = contextAgent.getStatus().memorySize;
      expect(finalSize).toBeLessThanOrEqual(initialSize);
    });
  });
  
  describe('Contexto Pedagógico', () => {
    test('debe obtener configuración pedagógica del curso', async () => {
      const courseId = 'course-biology-001';
      
      const settings = await contextAgent.getPedagogicalContext(courseId);
      
      expect(settings).toBeDefined();
      expect(settings.course_id).toBe(courseId);
      expect(settings.teaching_style).toBe('socratico');
      expect(settings.tone_preference).toBe('amigable');
      expect(settings.detail_level).toBe('medio');
    });
    
    test('debe manejar curso sin configuración pedagógica', async () => {
      const courseId = 'course-inexistente';
      
      const settings = await contextAgent.getPedagogicalContext(courseId);
      
      expect(settings).toBeNull();
    });
  });
  
  describe('Perfil del Estudiante', () => {
    test('debe obtener perfil del estudiante', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      
      const profile = await contextAgent.getStudentContext(studentId, courseId);
      
      expect(profile).toBeDefined();
      expect(profile.student_id).toBe(studentId);
      expect(profile.course_id).toBe(courseId);
      expect(profile.preferred_learning_style).toBe('visual');
    });
    
    test('debe crear perfil por defecto si no existe', async () => {
      const studentId = 'student-nuevo-001';
      const courseId = 'course-biology-001';
      
      const profile = await contextAgent.getStudentContext(studentId, courseId);
      
      expect(profile).toBeDefined();
      expect(profile.student_id).toBe(studentId);
      expect(profile.course_id).toBe(courseId);
      expect(profile.preferred_learning_style).toBe('visual'); // Por defecto
    });
  });
  
  describe('Contexto Completo', () => {
    test('debe obtener contexto completo de conversación', async () => {
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      
      const conversation = await contextAgent.initConversation(studentId, courseId);
      
      // Agregar mensajes
      await contextAgent.addMessage(conversation.id, {
        role: 'user',
        content: 'Hola, tengo una pregunta sobre biología',
        audioUrl: null
      });
      
      const fullContext = await contextAgent.getFullContext(conversation.id);
      
      expect(fullContext).toBeDefined();
      expect(fullContext.conversation).toBeDefined();
      expect(fullContext.pedagogicalSettings).toBeDefined();
      expect(fullContext.studentProfile).toBeDefined();
      expect(fullContext.recentMessages).toBeDefined();
      expect(fullContext.conversationSummary).toBeDefined();
    });
  });
  
  describe('Manejo de Errores', () => {
    test('debe manejar errores de base de datos', async () => {
      // Usar cliente Supabase inválido
      const invalidAgent = new ContextAgent(null as any);
      
      await expect(invalidAgent.initConversation('student-001', 'course-001'))
        .rejects.toThrow();
    });
    
    test('debe manejar conversación inválida', async () => {
      await expect(contextAgent.addMessage('conversation-invalida', {
        role: 'user',
        content: 'Mensaje de prueba',
        audioUrl: null
      })).rejects.toThrow();
    });
  });
  
  describe('Manejo de Estado', () => {
    test('debe actualizar estado correctamente', () => {
      const initialState = contextAgent.getStatus();
      expect(initialState.isProcessing).toBe(false);
      
      // Simular procesamiento
      (contextAgent as any).updateStatus({ isProcessing: true });
      expect(contextAgent.getStatus().isProcessing).toBe(true);
    });
    
    test('debe resetear estado', () => {
      contextAgent.reset();
      
      const status = contextAgent.getStatus();
      expect(status.isProcessing).toBe(false);
      expect(status.currentConversation).toBeNull();
      expect(status.memorySize).toBe(0);
      expect(status.lastError).toBeNull();
    });
  });
});
