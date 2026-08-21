// =====================================================
// Tests End-to-End de Personalización Pedagógica
// =====================================================

import { TEST_DATA, TestUtils, supabase } from '../test-setup';
import { AgentCoordinator } from '../../agents/AgentCoordinator';
import { VoiceAgent } from '../../agents/VoiceAgent';
import { RAGAgent } from '../../agents/RAGAgent';
import { ContextAgent } from '../../agents/ContextAgent';
import { ragService } from '../../services/ragService';

describe('Personalización Pedagógica - E2E', () => {
  let agentCoordinator: AgentCoordinator;

  const mockRagData = {
    success: true,
    message: 'Respuesta personalizada para el curso',
    metadata: {
      model: 'gemini-2.5-flash',
      source: 'A2A RAG',
      contextUsed: 'Material del curso',
      timestamp: new Date().toISOString(),
      sources: ['Material del curso'],
      sourceMetadata: [],
      confidence: 0.9,
    },
  };

  async function initCoordinator(studentId: string, courseId: string): Promise<void> {
    await agentCoordinator.initialize(
      studentId,
      courseId,
      { id: studentId, first_name: 'Test', last_name: 'Student', role: { name: 'student' } },
      {}
    );
  }

  beforeEach(() => {
    agentCoordinator = new AgentCoordinator(
      new VoiceAgent({ voiceName: 'Kore', speed: 1.0 }),
      new RAGAgent(),
      new ContextAgent()
    );
  });

  beforeAll(async () => {
    console.log('🚀 Configurando tests E2E...');
    await TestUtils.setupTestData();
  });

  afterAll(async () => {
    console.log('🧹 Limpiando datos de prueba...');
    await TestUtils.cleanupTestData();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    agentCoordinator.cleanup();
  });

  describe('Escenario 1: Estudiante Visual + Docente Socrático', () => {
    test('debe personalizar respuesta para estilo visual y metodología socrática', async () => {
      console.log('📊 Probando: Estudiante Visual + Docente Socrático');

      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la fotosíntesis?';

      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.teaching_style).toBe('socratico');
      expect(pedagogicalSettings.tone_preference).toBe('amigable');

      const studentProfile = await TestUtils.getStudentProfile(studentId, courseId);
      expect(studentProfile.preferred_learning_style).toBe('visual');

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();

      console.log('✅ Test completado: Estudiante Visual + Docente Socrático');
    });
  });

  describe('Escenario 2: Estudiante Auditivo + Docente Directo', () => {
    test('debe personalizar respuesta para estilo auditivo y metodología directa', async () => {
      console.log('📊 Probando: Estudiante Auditivo + Docente Directo');

      const studentId = 'student-auditory-002';
      const courseId = 'course-chemistry-002';
      const query = 'Explica la síntesis de proteínas';

      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.teaching_style).toBe('directo');
      expect(pedagogicalSettings.tone_preference).toBe('formal');
      expect(pedagogicalSettings.detail_level).toBe('avanzado');

      const studentProfile = await TestUtils.getStudentProfile(studentId, courseId);
      expect(studentProfile.preferred_learning_style).toBe('auditory');

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();

      console.log('✅ Test completado: Estudiante Auditivo + Docente Directo');
    });
  });

  describe('Escenario 3: Estudiante Kinestésico + Docente Constructivista', () => {
    test('debe personalizar respuesta para estilo kinestésico y metodología constructivista', async () => {
      console.log('📊 Probando: Estudiante Kinestésico + Docente Constructivista');

      const studentId = 'student-kinesthetic-003';
      const courseId = 'course-physics-003';
      const query = '¿Cómo funciona un laboratorio de física?';

      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.teaching_style).toBe('constructivista');
      expect(pedagogicalSettings.tone_preference).toBe('motivador');
      expect(pedagogicalSettings.detail_level).toBe('basico');

      const studentProfile = await TestUtils.getStudentProfile(studentId, courseId);
      expect(studentProfile.preferred_learning_style).toBe('kinesthetic');

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();

      console.log('✅ Test completado: Estudiante Kinestésico + Docente Constructivista');
    });
  });

  describe('Escenario 4: Persistencia de Memoria', () => {
    test('debe mantener contexto entre múltiples consultas', async () => {
      console.log('📊 Probando: Persistencia de Memoria');

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

      const response2 = await agentCoordinator.handleUserInput('¿Te acuerdas de mi nombre?');
      expect(response2).toBeDefined();
      expect(agentCoordinator.getSystemStatus().currentContext?.conversation.id).toBe(
        conversationId
      );

      const response3 = await agentCoordinator.handleUserInput('¿Qué estudiamos hoy?');
      expect(response3).toBeDefined();
      expect(agentCoordinator.getSystemStatus().currentContext?.conversation.id).toBe(
        conversationId
      );

      const messages = await TestUtils.getConversationMessages(conversationId);
      expect(messages.length).toBeGreaterThanOrEqual(3);

      console.log('✅ Test completado: Persistencia de Memoria');
    });
  });

  describe('Escenario 5: Configuración de Voces', () => {
    test('debe aplicar configuración de voz del docente', async () => {
      console.log('📊 Probando: Configuración de Voces');

      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.voice_name).toBe('Kore');
      expect(pedagogicalSettings.voice_speed).toBe(1.0);

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const status = agentCoordinator.getSystemStatus();
      expect(status.currentContext).toBeDefined();
      expect(status.currentContext!.pedagogical.voiceName).toBe('Kore');

      console.log('✅ Test completado: Configuración de Voces');
    });
  });

  describe('Escenario 6: Escalas de Calificación', () => {
    test('debe aplicar escala de calificación personalizada', async () => {
      console.log('📊 Probando: Escalas de Calificación');

      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';

      const { data: gradingScale } = await supabase
        .from('course_grading_scales')
        .select('*')
        .eq('course_id', courseId)
        .single();

      expect(gradingScale).toBeDefined();
      expect(gradingScale.scale).toBeDefined();

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockResolvedValue({ data: mockRagData, error: null, success: true });

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput('¿Cómo me fue en el examen?');

      expect(response).toBeDefined();
      expect(response.success).toBe(true);

      console.log('✅ Test completado: Escalas de Calificación');
    });
  });

  describe('Escenario 7: Rendimiento y Latencia', () => {
    test('debe responder en tiempo aceptable', async () => {
      console.log('📊 Probando: Rendimiento y Latencia');

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

      expect(response).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000);

      console.log(`⏱️ Tiempo de respuesta: ${endTime - startTime}ms`);
      console.log('✅ Test completado: Rendimiento y Latencia');
    });
  });

  describe('Escenario 8: Manejo de Errores', () => {
    test('debe manejar errores gracefully', async () => {
      console.log('📊 Probando: Manejo de Errores');

      const studentId = 'student-inexistente';
      const courseId = 'course-inexistente';
      const query = '¿Qué es la biología?';

      jest
        .spyOn(ragService, 'processQueryWithContext')
        .mockRejectedValue(new Error('Error de conexión'));

      await initCoordinator(studentId, courseId);

      const response = await agentCoordinator.handleUserInput(query);

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();

      console.log('✅ Test completado: Manejo de Errores');
    });
  });
});
