// =====================================================
// Tests End-to-End de Personalización Pedagógica
// =====================================================

import { TEST_DATA, TestUtils, supabase } from '../test-setup';
import { AgentCoordinator } from '../../agents/AgentCoordinator';
import { TEST_CONFIG } from '../test-setup';

describe('Personalización Pedagógica - E2E', () => {
  let agentCoordinator: AgentCoordinator;
  
  beforeAll(async () => {
    console.log('🚀 Configurando tests E2E...');
    await TestUtils.setupTestData();
    agentCoordinator = new AgentCoordinator(
      TEST_CONFIG.gemini.apiKey,
      TEST_CONFIG.n8n.webhookUrl,
      supabase
    );
  });
  
  afterAll(async () => {
    console.log('🧹 Limpiando datos de prueba...');
    await TestUtils.cleanupTestData();
  });
  
  describe('Escenario 1: Estudiante Visual + Docente Socrático', () => {
    test('debe personalizar respuesta para estilo visual y metodología socrática', async () => {
      console.log('📊 Probando: Estudiante Visual + Docente Socrático');
      
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Qué es la fotosíntesis?';
      
      // Verificar configuración pedagógica
      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.teaching_style).toBe('socratico');
      expect(pedagogicalSettings.tone_preference).toBe('amigable');
      
      // Verificar perfil del estudiante
      const studentProfile = await TestUtils.getStudentProfile(studentId, courseId);
      expect(studentProfile.preferred_learning_style).toBe('visual');
      
      // Procesar consulta
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      // Verificar personalización
      expect(response).toBeDefined();
      expect(response.personalization).toBeDefined();
      expect(response.personalization.appliedStyle).toBe('socratico');
      expect(response.personalization.learningStyle).toBe('visual');
      
      // Verificar que se guardó en la base de datos
      const messages = await TestUtils.getConversationMessages(response.conversationId);
      expect(messages.length).toBeGreaterThan(0);
      
      console.log('✅ Test completado: Estudiante Visual + Docente Socrático');
    });
  });
  
  describe('Escenario 2: Estudiante Auditivo + Docente Directo', () => {
    test('debe personalizar respuesta para estilo auditivo y metodología directa', async () => {
      console.log('📊 Probando: Estudiante Auditivo + Docente Directo');
      
      const studentId = 'student-auditory-002';
      const courseId = 'course-chemistry-002';
      const query = 'Explica la síntesis de proteínas';
      
      // Verificar configuración pedagógica
      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.teaching_style).toBe('directo');
      expect(pedagogicalSettings.tone_preference).toBe('formal');
      expect(pedagogicalSettings.detail_level).toBe('avanzado');
      
      // Verificar perfil del estudiante
      const studentProfile = await TestUtils.getStudentProfile(studentId, courseId);
      expect(studentProfile.preferred_learning_style).toBe('auditory');
      
      // Procesar consulta
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      // Verificar personalización
      expect(response).toBeDefined();
      expect(response.personalization).toBeDefined();
      expect(response.personalization.appliedStyle).toBe('directo');
      expect(response.personalization.learningStyle).toBe('auditory');
      
      console.log('✅ Test completado: Estudiante Auditivo + Docente Directo');
    });
  });
  
  describe('Escenario 3: Estudiante Kinestésico + Docente Constructivista', () => {
    test('debe personalizar respuesta para estilo kinestésico y metodología constructivista', async () => {
      console.log('📊 Probando: Estudiante Kinestésico + Docente Constructivista');
      
      const studentId = 'student-kinesthetic-003';
      const courseId = 'course-physics-003';
      const query = '¿Cómo funciona un laboratorio de física?';
      
      // Verificar configuración pedagógica
      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.teaching_style).toBe('constructivista');
      expect(pedagogicalSettings.tone_preference).toBe('motivador');
      expect(pedagogicalSettings.detail_level).toBe('basico');
      
      // Verificar perfil del estudiante
      const studentProfile = await TestUtils.getStudentProfile(studentId, courseId);
      expect(studentProfile.preferred_learning_style).toBe('kinesthetic');
      
      // Procesar consulta
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      // Verificar personalización
      expect(response).toBeDefined();
      expect(response.personalization).toBeDefined();
      expect(response.personalization.appliedStyle).toBe('constructivista');
      expect(response.personalization.learningStyle).toBe('kinesthetic');
      
      console.log('✅ Test completado: Estudiante Kinestésico + Docente Constructivista');
    });
  });
  
  describe('Escenario 4: Persistencia de Memoria', () => {
    test('debe mantener contexto entre múltiples consultas', async () => {
      console.log('📊 Probando: Persistencia de Memoria');
      
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      
      // Primera consulta
      const response1 = await agentCoordinator.handleUserInput('Hola, soy Ana', {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      const conversationId = response1.conversationId;
      expect(conversationId).toBeDefined();
      
      // Segunda consulta - debe recordar el nombre
      const response2 = await agentCoordinator.handleUserInput('¿Te acuerdas de mi nombre?', {
        studentId,
        courseId,
        conversationId,
        isAudio: false
      });
      
      expect(response2.conversationId).toBe(conversationId);
      
      // Tercera consulta - debe mantener contexto
      const response3 = await agentCoordinator.handleUserInput('¿Qué estudiamos hoy?', {
        studentId,
        courseId,
        conversationId,
        isAudio: false
      });
      
      expect(response3.conversationId).toBe(conversationId);
      
      // Verificar que se guardaron todos los mensajes
      const messages = await TestUtils.getConversationMessages(conversationId);
      expect(messages.length).toBeGreaterThanOrEqual(3);
      
      console.log('✅ Test completado: Persistencia de Memoria');
    });
  });
  
  describe('Escenario 5: Múltiples Estudiantes en el Mismo Curso', () => {
    test('debe personalizar respuestas para diferentes estudiantes', async () => {
      console.log('📊 Probando: Múltiples Estudiantes en el Mismo Curso');
      
      const courseId = 'course-biology-001';
      const students = [
        'student-visual-001',
        'student-auditory-002',
        'student-kinesthetic-003'
      ];
      
      const responses = [];
      
      for (const studentId of students) {
        const response = await agentCoordinator.handleUserInput('¿Qué es la biología?', {
          studentId,
          courseId,
          conversationId: null,
          isAudio: false
        });
        
        responses.push({
          studentId,
          response,
          personalization: response.personalization
        });
      }
      
      // Verificar que cada estudiante tiene su propia conversación
      const conversationIds = responses.map(r => r.response.conversationId);
      const uniqueConversationIds = [...new Set(conversationIds)];
      expect(uniqueConversationIds.length).toBe(3);
      
      // Verificar que cada respuesta está personalizada
      responses.forEach(({ studentId, personalization }) => {
        expect(personalization).toBeDefined();
        expect(personalization.learningStyle).toBeDefined();
      });
      
      console.log('✅ Test completado: Múltiples Estudiantes en el Mismo Curso');
    });
  });
  
  describe('Escenario 6: Configuración de Voces', () => {
    test('debe aplicar configuración de voz del docente', async () => {
      console.log('📊 Probando: Configuración de Voces');
      
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = 'Hola, ¿cómo estás?';
      
      // Verificar configuración de voz
      const pedagogicalSettings = await TestUtils.getPedagogicalSettings(courseId);
      expect(pedagogicalSettings.voice_name).toBe('Kore');
      expect(pedagogicalSettings.voice_speed).toBe(1.0);
      
      // Procesar consulta con audio
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      // Mock de transcripción y síntesis
      jest.spyOn(agentCoordinator['voiceAgent'] as any, 'transcribeAudio')
        .mockResolvedValue(query);
      
      jest.spyOn(agentCoordinator['voiceAgent'] as any, 'synthesizeWithGemini')
        .mockResolvedValue(new Blob(['audio response'], { type: 'audio/mpeg' }));
      
      const response = await agentCoordinator.handleUserInput(audioBlob, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: true
      });
      
      expect(response).toBeDefined();
      expect(response.audioUrl).toBeDefined();
      
      console.log('✅ Test completado: Configuración de Voces');
    });
  });
  
  describe('Escenario 7: Escalas de Calificación', () => {
    test('debe aplicar escala de calificación personalizada', async () => {
      console.log('📊 Probando: Escalas de Calificación');
      
      const studentId = 'student-visual-001';
      const courseId = 'course-biology-001';
      const query = '¿Cómo me fue en el examen?';
      
      // Verificar escala de calificación
      const { data: gradingScale } = await supabase
        .from('course_grading_scales')
        .select('*')
        .eq('course_id', courseId)
        .single();
      
      expect(gradingScale).toBeDefined();
      expect(gradingScale.scale).toBeDefined();
      
      // Procesar consulta
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response).toBeDefined();
      expect(response.personalization).toBeDefined();
      
      console.log('✅ Test completado: Escalas de Calificación');
    });
  });
  
  describe('Escenario 8: Rendimiento y Latencia', () => {
    test('debe responder en tiempo aceptable', async () => {
      console.log('📊 Probando: Rendimiento y Latencia');
      
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
      
      expect(response).toBeDefined();
      expect(responseTime).toBeLessThan(5000); // Menos de 5 segundos
      
      console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);
      console.log('✅ Test completado: Rendimiento y Latencia');
    });
  });
  
  describe('Escenario 9: Manejo de Errores', () => {
    test('debe manejar errores gracefully', async () => {
      console.log('📊 Probando: Manejo de Errores');
      
      const studentId = 'student-inexistente';
      const courseId = 'course-inexistente';
      const query = '¿Qué es la biología?';
      
      // Debe manejar estudiante y curso inexistentes
      const response = await agentCoordinator.handleUserInput(query, {
        studentId,
        courseId,
        conversationId: null,
        isAudio: false
      });
      
      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      
      console.log('✅ Test completado: Manejo de Errores');
    });
  });
  
  describe('Escenario 10: Validación Completa del Sistema', () => {
    test('debe ejecutar flujo completo sin errores', async () => {
      console.log('📊 Probando: Validación Completa del Sistema');
      
      const testCases = [
        {
          studentId: 'student-visual-001',
          courseId: 'course-biology-001',
          query: '¿Qué es la fotosíntesis?',
          expectedStyle: 'socratico',
          expectedLearningStyle: 'visual'
        },
        {
          studentId: 'student-auditory-002',
          courseId: 'course-chemistry-002',
          query: 'Explica la síntesis de proteínas',
          expectedStyle: 'directo',
          expectedLearningStyle: 'auditory'
        },
        {
          studentId: 'student-kinesthetic-003',
          courseId: 'course-physics-003',
          query: '¿Cómo funciona un laboratorio?',
          expectedStyle: 'constructivista',
          expectedLearningStyle: 'kinesthetic'
        }
      ];
      
      for (const testCase of testCases) {
        const response = await agentCoordinator.handleUserInput(testCase.query, {
          studentId: testCase.studentId,
          courseId: testCase.courseId,
          conversationId: null,
          isAudio: false
        });
        
        expect(response).toBeDefined();
        expect(response.personalization).toBeDefined();
        expect(response.personalization.appliedStyle).toBe(testCase.expectedStyle);
        expect(response.personalization.learningStyle).toBe(testCase.expectedLearningStyle);
        
        console.log(`✅ ${testCase.studentId} + ${testCase.courseId}: ${testCase.expectedStyle} + ${testCase.expectedLearningStyle}`);
      }
      
      console.log('🎉 ¡Todos los tests E2E completados exitosamente!');
    });
  });
});
