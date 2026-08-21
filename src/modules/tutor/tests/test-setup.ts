// =====================================================
// Configuración de Testing para Audio-Tutor Multi-Agente
// =====================================================

// =====================================================
// Configuración de Testing para Audio-Tutor Multi-Agente
// =====================================================

// Usar la instancia principal de Supabase para evitar múltiples instancias
import { supabase } from '../lib/supabase-shared';
export { supabase };

// Configuración de testing
export const TEST_CONFIG = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co',
    anonKey:
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8',
  },
  n8n: {
    webhookUrl: process.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/test',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'test-api-key',
  },
};

// Datos de prueba
export const TEST_DATA = {
  students: [
    {
      id: 'student-visual-001',
      name: 'Ana Visual',
      email: 'ana.visual@test.com',
      learningStyle: 'visual',
      topicsStruggled: ['química orgánica', 'física cuántica'],
      topicsMastered: ['biología celular', 'anatomía'],
    },
    {
      id: 'student-auditory-002',
      name: 'Carlos Auditivo',
      email: 'carlos.auditory@test.com',
      learningStyle: 'auditory',
      topicsStruggled: ['matemáticas avanzadas'],
      topicsMastered: ['historia', 'literatura'],
    },
    {
      id: 'student-kinesthetic-003',
      name: 'María Kinestésica',
      email: 'maria.kinesthetic@test.com',
      learningStyle: 'kinesthetic',
      topicsStruggled: ['teoría abstracta'],
      topicsMastered: ['laboratorio', 'experimentos'],
    },
  ],

  teachers: [
    {
      id: 'teacher-socratic-001',
      name: 'Dr. Sócrates',
      email: 'socrates@test.com',
      teachingStyle: 'socratico',
      tonePreference: 'amigable',
      detailLevel: 'medio',
    },
    {
      id: 'teacher-direct-002',
      name: 'Prof. Directo',
      email: 'directo@test.com',
      teachingStyle: 'directo',
      tonePreference: 'formal',
      detailLevel: 'avanzado',
    },
    {
      id: 'teacher-constructivist-003',
      name: 'Dra. Constructivista',
      email: 'constructivista@test.com',
      teachingStyle: 'constructivista',
      tonePreference: 'motivador',
      detailLevel: 'basico',
    },
  ],

  courses: [
    {
      id: 'course-biology-001',
      name: 'Biología General',
      description: 'Curso introductorio de biología',
      teacherId: 'teacher-socratic-001',
    },
    {
      id: 'course-chemistry-002',
      name: 'Química Orgánica',
      description: 'Curso avanzado de química orgánica',
      teacherId: 'teacher-direct-002',
    },
    {
      id: 'course-physics-003',
      name: 'Física Experimental',
      description: 'Laboratorio de física',
      teacherId: 'teacher-constructivist-003',
    },
  ],

  pedagogicalSettings: [
    {
      courseId: 'course-biology-001',
      teacherId: 'teacher-socratic-001',
      teachingStyle: 'socratico',
      tonePreference: 'amigable',
      detailLevel: 'medio',
      useExamples: true,
      encourageQuestions: true,
      voiceName: 'Kore',
      voiceSpeed: 1.0,
    },
    {
      courseId: 'course-chemistry-002',
      teacherId: 'teacher-direct-002',
      teachingStyle: 'directo',
      tonePreference: 'formal',
      detailLevel: 'avanzado',
      useExamples: true,
      encourageQuestions: false,
      voiceName: 'Charon',
      voiceSpeed: 0.8,
    },
    {
      courseId: 'course-physics-003',
      teacherId: 'teacher-constructivist-003',
      teachingStyle: 'constructivista',
      tonePreference: 'motivador',
      detailLevel: 'basico',
      useExamples: true,
      encourageQuestions: true,
      voiceName: 'Aoede',
      voiceSpeed: 1.2,
    },
  ],

  gradingScales: [
    {
      courseId: 'course-biology-001',
      name: 'Escala Biológica',
      scale: [
        { grade: 'A+', minScore: 95, maxScore: 100, description: 'Excelente' },
        { grade: 'A', minScore: 90, maxScore: 94, description: 'Muy bueno' },
        { grade: 'B+', minScore: 85, maxScore: 89, description: 'Bueno' },
        { grade: 'B', minScore: 80, maxScore: 84, description: 'Satisfactorio' },
        { grade: 'C', minScore: 70, maxScore: 79, description: 'Aceptable' },
        { grade: 'F', minScore: 0, maxScore: 69, description: 'Reprobado' },
      ],
    },
    {
      courseId: 'course-chemistry-002',
      name: 'Escala Química',
      scale: [
        { grade: 'Excelente', minScore: 90, maxScore: 100, description: 'Dominio total' },
        { grade: 'Bueno', minScore: 80, maxScore: 89, description: 'Dominio satisfactorio' },
        { grade: 'Regular', minScore: 70, maxScore: 79, description: 'Dominio básico' },
        { grade: 'Deficiente', minScore: 0, maxScore: 69, description: 'Sin dominio' },
      ],
    },
  ],

  testQueries: [
    {
      query: '¿Qué es la fotosíntesis?',
      expectedStyle: 'socratico',
      expectedTone: 'amigable',
      expectedDetail: 'medio',
      courseId: 'course-biology-001',
      studentId: 'student-visual-001',
    },
    {
      query: 'Explica la síntesis de proteínas',
      expectedStyle: 'directo',
      expectedTone: 'formal',
      expectedDetail: 'avanzado',
      courseId: 'course-chemistry-002',
      studentId: 'student-auditory-002',
    },
    {
      query: '¿Cómo funciona un laboratorio de física?',
      expectedStyle: 'constructivista',
      expectedTone: 'motivador',
      expectedDetail: 'basico',
      courseId: 'course-physics-003',
      studentId: 'student-kinesthetic-003',
    },
  ],
};

// Utilidades de testing
export class TestUtils {
  static async setupTestData() {
    console.log('🧪 Configurando datos de prueba...');

    try {
      // Limpiar datos existentes
      await this.cleanupTestData();

      // Insertar datos de prueba
      await this.insertTestData();

      console.log('✅ Datos de prueba configurados correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error configurando datos de prueba:', error);
      return false;
    }
  }

  static async cleanupTestData() {
    console.log('🧹 Limpiando datos de prueba...');

    // Limpiar en orden inverso para evitar problemas de FK
    await supabase.from('tutor_messages').delete().like('conversation_id', 'test-%');
    await supabase.from('tutor_conversations').delete().like('id', 'test-%');
    await supabase.from('course_grading_scales').delete().like('course_id', 'course-%');
    await supabase.from('course_pedagogical_settings').delete().like('course_id', 'course-%');
    await supabase.from('student_learning_profiles').delete().like('student_id', 'student-%');
  }

  static async insertTestData() {
    // Insertar perfiles de estudiantes
    const { error: studentError } = await supabase.from('student_learning_profiles').insert(
      TEST_DATA.students.map((student) => ({
        student_id: student.id,
        course_id: 'course-biology-001', // Asignar a un curso por defecto
        preferred_learning_style: student.learningStyle,
        topics_struggled: student.topicsStruggled,
        topics_mastered: student.topicsMastered,
        created_at: new Date().toISOString(),
      }))
    );

    if (studentError) throw studentError;

    // Insertar configuración pedagógica
    const { error: pedError } = await supabase
      .from('course_pedagogical_settings')
      .insert(TEST_DATA.pedagogicalSettings);

    if (pedError) throw pedError;

    // Insertar escalas de calificación
    const { error: gradeError } = await supabase
      .from('course_grading_scales')
      .insert(TEST_DATA.gradingScales);

    if (gradeError) throw gradeError;
  }

  static async createTestConversation(studentId: string, courseId: string) {
    const { data, error } = await supabase
      .from('tutor_conversations')
      .insert({
        id: `test-conv-${Date.now()}`,
        student_id: studentId,
        course_id: courseId,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        metadata: { test: true },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async addTestMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    const { data, error } = await supabase
      .from('tutor_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        created_at: new Date().toISOString(),
        metadata: { test: true },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getConversationMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('tutor_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getPedagogicalSettings(courseId: string) {
    const { data, error } = await supabase
      .from('course_pedagogical_settings')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getStudentProfile(studentId: string, courseId: string) {
    const { data, error } = await supabase
      .from('student_learning_profiles')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (error) throw error;
    return data;
  }
}

// Mock para servicios externos en testing
export class MockServices {
  static mockGeminiResponse = {
    text: 'Esta es una respuesta de prueba personalizada',
    sources: [{ title: 'Test Source', url: 'https://test.com', relevance: 0.95 }],
  };

  static mockN8nResponse = {
    response: 'Respuesta RAG personalizada',
    sources: [{ title: 'RAG Source', url: 'https://rag.com', relevance: 0.9 }],
    personalization: {
      appliedStyle: 'socratico',
      examplesIncluded: true,
      questionsEncouraged: true,
    },
  };

  static async mockGeminiCall(prompt: string, context: any) {
    // Simular latencia
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      ...this.mockGeminiResponse,
      personalization: context.pedagogicalSettings || {},
      studentContext: context.studentProfile || {},
    };
  }

  static async mockN8nCall(query: string, context: any) {
    // Simular latencia
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      ...this.mockN8nResponse,
      query,
      context,
    };
  }
}

export default {
  TEST_CONFIG,
  TEST_DATA,
  TestUtils,
  MockServices,
  supabase,
};
