// =====================================================
// Servicio de Supabase para Audio-Tutor Multi-Agente
// Gestión de conversaciones, memoria y personalización
// =====================================================

import { supabase } from '../lib/supabase-shared';
import type { Conversation, ChatMessage, SupabaseResponse } from '../types/agents';
import type {
  PedagogicalSettings,
  StudentProfile,
  GradingScale,
  CourseImage,
  CourseContext,
} from '../types/pedagogical';

// =====================================================
// Gestión de Conversaciones
// =====================================================

export const saveConversation = async (
  studentId: string,
  courseId: string,
  metadata: Record<string, any> = {}
): Promise<SupabaseResponse<Conversation>> => {
  try {
    // Convertir courseId a INTEGER si viene como string
    const courseIdInt = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    if (isNaN(courseIdInt)) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }

    const { data, error } = await supabase
      .from('tutor_conversations')
      .insert({
        student_id: studentId,
        course_id: courseIdInt,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        studentId: data.student_id,
        courseId: data.course_id.toString(),
        startedAt: new Date(data.created_at),
        lastActivityAt: new Date(data.updated_at),
        metadata: data.metadata || {},
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const loadConversation = async (
  conversationId: string
): Promise<SupabaseResponse<Conversation>> => {
  try {
    const { data, error } = await supabase
      .from('tutor_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        studentId: data.student_id,
        courseId: data.course_id.toString(),
        startedAt: new Date(data.created_at),
        lastActivityAt: new Date(data.updated_at),
        metadata: data.metadata || {},
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading conversation:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const updateConversationActivity = async (conversationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tutor_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return !error;
  } catch (error) {
    console.error('Error updating conversation activity:', error);
    return false;
  }
};

// =====================================================
// Gestión de Mensajes
// =====================================================

export const saveMessage = async (
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  audioUrl?: string,
  metadata: Record<string, any> = {}
): Promise<SupabaseResponse<ChatMessage>> => {
  try {
    const { data, error } = await supabase
      .from('tutor_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        audio_url: audioUrl,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        role: data.role as 'user' | 'assistant' | 'system',
        text: data.content,
        audioUrl: data.audio_url,
        timestamp: new Date(data.created_at),
        metadata: data.metadata || {},
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving message:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const getConversationHistory = async (
  conversationId: string,
  limit: number = 50
): Promise<SupabaseResponse<ChatMessage[]>> => {
  try {
    const { data, error } = await supabase
      .from('tutor_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const messages: ChatMessage[] = data.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      text: msg.content,
      audioUrl: msg.audio_url,
      timestamp: new Date(msg.created_at),
      metadata: msg.metadata || {},
    }));

    return {
      data: messages,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Configuración Pedagógica
// =====================================================

export const getPedagogicalSettings = async (
  courseId: string
): Promise<SupabaseResponse<PedagogicalSettings>> => {
  try {
    const { data, error } = await supabase
      .from('course_pedagogical_settings')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle(); // Cambiado de .single() a .maybeSingle() para manejar casos sin datos

    if (error) throw error;

    // Si no hay datos, retornar null sin error
    if (!data) {
      return {
        data: null,
        error: null,
        success: true,
      };
    }

    return {
      data: {
        id: data.id,
        courseId: data.course_id,
        teacherId: data.teacher_id,
        teachingStyle: data.teaching_style,
        tonePreference: data.tone_preference,
        detailLevel: data.detail_level,
        useExamples: data.use_examples,
        encourageQuestions: data.encourage_questions,
        voiceName: data.voice_name,
        voiceSpeed: data.voice_speed,
        enableAudioResponse: data.enable_audio_response ?? true,
        systemPromptOverride: data.system_prompt_override,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading pedagogical settings:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const savePedagogicalSettings = async (
  settings: Omit<PedagogicalSettings, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SupabaseResponse<PedagogicalSettings>> => {
  try {
    const { data, error } = await supabase
      .from('course_pedagogical_settings')
      .upsert({
        course_id: settings.courseId,
        teacher_id: settings.teacherId,
        teaching_style: settings.teachingStyle,
        tone_preference: settings.tonePreference,
        detail_level: settings.detailLevel,
        use_examples: settings.useExamples,
        encourage_questions: settings.encourageQuestions,
        voice_name: settings.voiceName,
        voice_speed: settings.voiceSpeed,
        system_prompt_override: settings.systemPromptOverride,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        courseId: data.course_id,
        teacherId: data.teacher_id,
        teachingStyle: data.teaching_style,
        tonePreference: data.tone_preference,
        detailLevel: data.detail_level,
        useExamples: data.use_examples,
        encourageQuestions: data.encourage_questions,
        voiceName: data.voice_name,
        voiceSpeed: data.voice_speed,
        enableAudioResponse: data.enable_audio_response ?? true,
        systemPromptOverride: data.system_prompt_override,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving pedagogical settings:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Perfil del Estudiante
// =====================================================

export const getStudentProfile = async (
  studentId: string,
  courseId: string
): Promise<SupabaseResponse<StudentProfile>> => {
  try {
    const { data, error } = await supabase
      .from('student_learning_profiles')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (error) {
      // Si la tabla no existe o no hay datos, devolver perfil por defecto
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return {
          data: {
            id: 'default',
            studentId,
            courseId,
            preferredLearningStyle: 'visual',
            interactionCount: 0,
            avgSessionDuration: 0,
            topicsStruggled: [],
            topicsMastered: [],
            lastUpdated: new Date(),
          },
          error: null,
          success: true,
        };
      }
      throw error;
    }

    return {
      data: {
        id: data.id,
        studentId: data.student_id,
        courseId: data.course_id,
        preferredLearningStyle: data.preferred_learning_style,
        interactionCount: data.interaction_count || 0,
        avgSessionDuration: data.avg_session_duration || 0,
        topicsStruggled: data.topics_struggled || [],
        topicsMastered: data.topics_mastered || [],
        lastUpdated: new Date(data.updated_at || data.created_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading student profile:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const updateStudentProfile = async (
  studentId: string,
  courseId: string,
  updates: Partial<Omit<StudentProfile, 'id' | 'studentId' | 'courseId' | 'lastUpdated'>>
): Promise<SupabaseResponse<StudentProfile>> => {
  try {
    // Convertir courseId a INTEGER si viene como string
    const courseIdInt = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
    if (isNaN(courseIdInt)) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }

    // Preparar datos para upsert, solo incluyendo campos que existen
    const upsertData: any = {
      student_id: studentId,
      course_id: courseIdInt,
      preferred_learning_style: updates.preferredLearningStyle || 'visual',
      topics_struggled: updates.topicsStruggled || [],
      topics_mastered: updates.topicsMastered || [],
    };

    // Solo agregar campos opcionales si están definidos
    if (updates.interactionCount !== undefined) {
      upsertData.interaction_count = updates.interactionCount;
    }
    if (updates.avgSessionDuration !== undefined) {
      upsertData.avg_session_duration = updates.avgSessionDuration;
    }

    const { data, error } = await supabase
      .from('student_learning_profiles')
      .upsert(upsertData, {
        onConflict: 'student_id,course_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      // Si hay error de columna faltante, intentar con campos básicos
      if (error.code === 'PGRST204') {
        console.warn('Algunas columnas no existen, usando campos básicos');
        const basicData = {
          student_id: studentId,
          course_id: courseId,
          preferred_learning_style: updates.preferredLearningStyle || 'visual',
          topics_struggled: updates.topicsStruggled || [],
          topics_mastered: updates.topicsMastered || [],
        };

        const { data: basicResult, error: basicError } = await supabase
          .from('student_learning_profiles')
          .upsert(basicData)
          .select()
          .single();

        if (basicError) throw basicError;

        return {
          data: {
            id: basicResult.id,
            studentId: basicResult.student_id,
            courseId: basicResult.course_id,
            preferredLearningStyle: basicResult.preferred_learning_style,
            interactionCount: 0,
            avgSessionDuration: 0,
            topicsStruggled: basicResult.topics_struggled || [],
            topicsMastered: basicResult.topics_mastered || [],
            lastUpdated: new Date(basicResult.updated_at || basicResult.created_at),
          },
          error: null,
          success: true,
        };
      }
      throw error;
    }

    return {
      data: {
        id: data.id,
        studentId: data.student_id,
        courseId: data.course_id,
        preferredLearningStyle: data.preferred_learning_style,
        interactionCount: data.interaction_count || 0,
        avgSessionDuration: data.avg_session_duration || 0,
        topicsStruggled: data.topics_struggled || [],
        topicsMastered: data.topics_mastered || [],
        lastUpdated: new Date(data.last_updated || data.updated_at || data.created_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error updating student profile:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Escalas de Calificación
// =====================================================

export const getGradingScale = async (
  courseId: string
): Promise<SupabaseResponse<GradingScale>> => {
  try {
    const { data, error } = await supabase
      .from('course_grading_scales')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle(); // Cambiado de .single() a .maybeSingle() para manejar casos sin datos

    if (error) throw error;

    // Si no hay datos, retornar null sin error
    if (!data) {
      return {
        data: null,
        error: null,
        success: true,
      };
    }

    return {
      data: {
        id: data.id,
        courseId: data.course_id,
        teacherId: data.teacher_id,
        scaleType: data.scale_type,
        minScore: data.min_score,
        maxScore: data.max_score,
        passingScore: data.passing_score,
        scaleDefinition: data.scale_definition || [],
        roundingRule: data.rounding_rule,
        showPercentage: data.show_percentage,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading grading scale:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Escalas de Calificación (versión actualizada)
// =====================================================

export const saveGradingScale = async (
  gradingScale: Omit<GradingScale, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SupabaseResponse<GradingScale>> => {
  try {
    const { data, error } = await supabase
      .from('course_grading_scales')
      .upsert({
        course_id: gradingScale.courseId,
        teacher_id: gradingScale.teacherId,
        name: gradingScale.name,
        scale: gradingScale.scale,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        courseId: data.course_id,
        teacherId: data.teacher_id,
        scaleType: 'numeric',
        minScore: 0,
        maxScore: 100,
        passingScore: 60,
        scaleDefinition: [],
        roundingRule: 'nearest',
        showPercentage: true,
        name: data.name,
        scale: data.scale,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving grading scale:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Gestión de Imágenes
// =====================================================

export const uploadCourseImage = async (
  courseId: string,
  imageUrl: string,
  imageType: 'cover' | 'banner' | 'material' | 'content',
  uploadedBy: string,
  fileSizeBytes: number,
  mimeType: string,
  altText?: string,
  metadata: Record<string, any> = {}
): Promise<SupabaseResponse<CourseImage>> => {
  try {
    const { data, error } = await supabase
      .from('course_images')
      .insert({
        course_id: courseId,
        uploaded_by: uploadedBy,
        image_url: imageUrl,
        image_type: imageType,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType,
        alt_text: altText,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        courseId: data.course_id,
        uploadedBy: data.uploaded_by,
        imageUrl: data.image_url,
        imageType: data.image_type,
        fileSizeBytes: data.file_size_bytes,
        mimeType: data.mime_type,
        altText: data.alt_text,
        metadata: data.metadata || {},
        createdAt: new Date(data.created_at),
      },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error uploading course image:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const getCourseImages = async (
  courseId: string
): Promise<SupabaseResponse<CourseImage[]>> => {
  try {
    const { data, error } = await supabase
      .from('course_images')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const images: CourseImage[] = data.map((img) => ({
      id: img.id,
      courseId: img.course_id,
      uploadedBy: img.uploaded_by,
      imageUrl: img.image_url,
      imageType: img.image_type,
      fileSizeBytes: img.file_size_bytes,
      mimeType: img.mime_type,
      altText: img.alt_text,
      metadata: img.metadata || {},
      createdAt: new Date(img.created_at),
    }));

    return {
      data: images,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading course images:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Materiales del Curso
// =====================================================

export const getCourseMaterials = async (courseId: string): Promise<SupabaseResponse<any[]>> => {
  try {
    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data || [],
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading course materials:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const saveCourseMaterial = async (
  courseId: string,
  title: string,
  content: string,
  type: string = 'text',
  fileUrl?: string,
  metadata: Record<string, any> = {}
): Promise<SupabaseResponse<any>> => {
  try {
    const { data, error } = await supabase
      .from('course_materials')
      .insert({
        course_id: courseId,
        title,
        content,
        type,
        file_url: fileUrl,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving course material:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Métricas de Uso
// =====================================================

export const saveUsageMetric = async (
  conversationId: string,
  studentId: string,
  courseId: string,
  metricType: string,
  metricValue: number,
  metadata: Record<string, any> = {}
): Promise<SupabaseResponse<any>> => {
  try {
    const { data, error } = await supabase
      .from('tutor_usage_metrics')
      .insert({
        conversation_id: conversationId,
        student_id: studentId,
        course_id: courseId,
        metric_type: metricType,
        metric_value: metricValue,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving usage metric:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const getUsageMetrics = async (
  courseId: string,
  studentId?: string,
  metricType?: string,
  limit: number = 100
): Promise<SupabaseResponse<any[]>> => {
  try {
    let query = supabase
      .from('tutor_usage_metrics')
      .select('*')
      .eq('course_id', courseId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (metricType) {
      query = query.eq('metric_type', metricType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      data: data || [],
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading usage metrics:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Configuraciones de Agentes
// =====================================================

export const getAgentConfiguration = async (
  courseId: string,
  agentType: string
): Promise<SupabaseResponse<any>> => {
  try {
    const { data, error } = await supabase
      .from('agent_configurations')
      .select('*')
      .eq('course_id', courseId)
      .eq('agent_type', agentType)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading agent configuration:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const saveAgentConfiguration = async (
  courseId: string,
  agentType: string,
  configuration: Record<string, any>,
  isActive: boolean = true
): Promise<SupabaseResponse<any>> => {
  try {
    const { data, error } = await supabase
      .from('agent_configurations')
      .upsert({
        course_id: courseId,
        agent_type: agentType,
        configuration,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error saving agent configuration:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

// =====================================================
// Funciones de Utilidad
// =====================================================

export const getCourseContext = async (
  courseId: string
): Promise<SupabaseResponse<CourseContext>> => {
  try {
    // Obtener configuración pedagógica
    const pedagogicalResponse = await getPedagogicalSettings(courseId);

    // Obtener escala de calificación
    const gradingResponse = await getGradingScale(courseId);

    // Obtener materiales del curso
    const materialsResponse = await getCourseMaterials(courseId);

    // Obtener imágenes del curso
    const imagesResponse = await getCourseImages(courseId);

    const courseContext: CourseContext = {
      pedagogicalSettings: pedagogicalResponse.data,
      gradingScale: gradingResponse.data,
      materials: materialsResponse.data || [],
      images: imagesResponse.data || [],
    };

    return {
      data: courseContext,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Error loading course context:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    };
  }
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('tutor_conversations').select('count').limit(1);

    return !error;
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
};
