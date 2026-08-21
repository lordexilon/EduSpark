// services/agentService.ts
// Servicio mejorado para comunicación con Coordinador A2A
// Inspirado en la arquitectura A2A de AOIGO, adaptado para contexto educativo

const A2A_COORDINATOR_URL = (import.meta as any).env?.VITE_A2A_COORDINATOR_URL || '';

// =====================================================
// TIPOS Y INTERFACES
// =====================================================

/**
 * Estructura de mensaje A2A (inspirada en AOIGO Framework)
 */
type AgentRequest = {
  // Identificadores
  messageId?: string;
  conversationId?: string;
  timestamp?: string;

  // Contenido principal
  message: string;
  courseId: string;

  // Contexto del estudiante
  studentId?: string;
  studentProfile?: StudentProfileData | null;
  studentProgress?: StudentProgressData | null;

  // Metadata adicional
  priority?: 'low' | 'normal' | 'high';
  messageType?: 'question' | 'clarification' | 'general';
  expectsResponse?: boolean;

  // Contexto del curso
  courseContext?: {
    title?: string;
    teacherId?: string;
    moduleId?: string;
    sessionId?: string;
  };
};

/**
 * Perfil del estudiante según el sistema eduspark
 */
interface StudentProfileData {
  preferredLearningStyle?: 'visual' | 'auditivo' | 'kinestesico' | 'lectoescritor';
  interactionCount?: number;
  avgSessionDuration?: number; // en minutos
  topicsStruggled?: string[];
  topicsMastered?: string[];
  lastUpdated?: string;
}

/**
 * Progreso del estudiante en el curso
 */
interface StudentProgressData {
  completionPercentage?: number;
  totalInteractions?: number;
  lastAccessAt?: string;
  enrolledAt?: string;
  timeSpentMinutes?: number;
}

/**
 * Respuesta del coordinador A2A
 */
interface AgentResponse {
  answer?: string;
  message?: string;
  text?: string;
  metadata?: {
    agentUsed?: string;
    confidence?: number;
    sources?: string[];
    timestamp?: string;
  };
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

/**
 * Genera un ID único para el mensaje
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtiene timestamp ISO actual
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Obtiene el perfil del estudiante desde Supabase si está disponible
 */
async function getStudentProfileFromDB(
  studentId: string,
  courseId: string
): Promise<StudentProfileData | null> {
  try {
    // Importación dinámica para evitar dependencias circulares
    const { getStudentProfile } = await import('../modules/tutor/services/supabaseService');
    const result = await getStudentProfile(studentId, courseId);

    if (result.success && result.data) {
      return {
        preferredLearningStyle: result.data.preferredLearningStyle,
        interactionCount: result.data.interactionCount,
        avgSessionDuration: result.data.avgSessionDuration,
        topicsStruggled: result.data.topicsStruggled,
        topicsMastered: result.data.topicsMastered,
        lastUpdated: result.data.lastUpdated?.toISOString(),
      };
    }
  } catch (error) {
    console.warn('⚠️ AgentService: No se pudo obtener el perfil del estudiante desde DB:', error);
  }
  return null;
}

/**
 * Obtiene el progreso del estudiante en el curso
 */
async function getStudentProgress(
  studentId: string,
  courseId: string
): Promise<StudentProgressData | null> {
  try {
    const { supabase } = await import('../lib/supabase');
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    if (isNaN(courseIdNum)) {
      return null;
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('completion_percentage, last_access_at, enrolled_at, time_spent_minutes')
      .eq('student_id', studentId)
      .eq('course_id', courseIdNum)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      completionPercentage: data.completion_percentage || 0,
      lastAccessAt: data.last_access_at,
      enrolledAt: data.enrolled_at,
      timeSpentMinutes: data.time_spent_minutes || 0,
    };
  } catch (error) {
    console.warn('⚠️ AgentService: No se pudo obtener el progreso del estudiante:', error);
    return null;
  }
}

/**
 * Obtiene información básica del curso
 */
async function getCourseContext(courseId: string): Promise<AgentRequest['courseContext'] | null> {
  try {
    const { supabase } = await import('../lib/supabase');
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    if (isNaN(courseIdNum)) {
      return null;
    }

    const { data, error } = await supabase
      .from('courses')
      .select('id, title, teacher_id')
      .eq('id', courseIdNum)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      title: data.title,
      teacherId: data.teacher_id,
    };
  } catch (error) {
    console.warn('⚠️ AgentService: No se pudo obtener el contexto del curso:', error);
    return null;
  }
}

// =====================================================
// FUNCIÓN PRINCIPAL DE REINTENTOS
// =====================================================

/**
 * Función de reintentos mejorada (inspirada en AOIGO)
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { attempts = 4, baseDelayMs = 1000, timeoutMs = 15000 } = options;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(
          `❌ AgentService: Intento ${attempt}/${attempts} HTTP ${response.status}. Cuerpo:`,
          errorBody
        );
        lastError = new Error(`HTTP ${response.status}: ${errorBody.substring(0, 100)}`);
      } else {
        console.log(`✅ AgentService: Solicitud exitosa en intento ${attempt}`);
        return response;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // Backoff exponencial
      if (attempt < attempts) {
        console.warn(
          `⚠️ AgentService: Intento ${attempt} falló (${String(err)}). Reintentando en ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Fallo tras reintentos');
}

// =====================================================
// FUNCIÓN PRINCIPAL EXPORTADA
// =====================================================

/**
 * Obtiene respuesta del asistente A2A con información mejorada del estudiante
 *
 * Inspirado en la arquitectura A2A de AOIGO, adaptado para contexto educativo
 *
 * @param message - Mensaje del usuario
 * @param courseId - ID del curso
 * @param options - Opciones adicionales:
 *   - conversationId: ID de conversación para mantener contexto continuo
 *   - studentId: ID del estudiante (si se proporciona, se obtendrá el perfil automáticamente)
 *   - studentProfile: Perfil del estudiante (opcional, se obtendrá automáticamente si se proporciona studentId)
 *   - studentProgress: Progreso del estudiante (opcional, se obtendrá automáticamente si se proporciona studentId)
 *   - priority: Prioridad del mensaje ('low' | 'normal' | 'high')
 *   - messageType: Tipo de mensaje ('question' | 'clarification' | 'general')
 *   - skipAutoFetch: Si es true, no obtendrá datos automáticamente desde la BD
 */
export async function getAgentAssistantResponse(
  message: string,
  courseId: string,
  options: {
    conversationId?: string;
    studentId?: string;
    sessionId?: string;
    studentProfile?: StudentProfileData | null;
    studentProgress?: StudentProgressData | null;
    priority?: 'low' | 'normal' | 'high';
    messageType?: 'question' | 'clarification' | 'general';
    skipAutoFetch?: boolean;
  } = {}
): Promise<string> {
  // ⚠️ DEPRECADO: Este servicio está diseñado para una futura integración externa
  // Actualmente el sistema usa A2A LOCAL (audio-tutor/hooks/useAgentSystem)
  // Este servicio se mantiene solo para compatibilidad futura
  if (!A2A_COORDINATOR_URL) {
    console.warn(
      '⚠️ AgentService: VITE_A2A_COORDINATOR_URL no está configurada. Este servicio está deprecado. Usa el sistema A2A local (useAgentSystem) en su lugar.'
    );
    throw new Error(
      'Este servicio está deprecado. Por favor, usa el sistema A2A local (useAgentSystem hook) que funciona completamente en el frontend.'
    );
  }

  // Validación de parámetros
  if (!message || !message.trim()) {
    throw new Error('El mensaje no puede estar vacío');
  }

  if (!courseId) {
    throw new Error('El courseId es requerido');
  }

  const messageId = generateMessageId();
  const timestamp = getCurrentTimestamp();

  // Obtener perfil y progreso automáticamente si se proporciona studentId
  let finalStudentProfile: StudentProfileData | null = options.studentProfile ?? null;
  let finalStudentProgress: StudentProgressData | null = options.studentProgress ?? null;
  let courseContext: AgentRequest['courseContext'] | null = null;

  if (!options.skipAutoFetch && options.studentId && courseId) {
    try {
      // Obtener datos en paralelo para mejor performance
      const [profile, progress, context] = await Promise.all([
        options.studentProfile
          ? Promise.resolve(null)
          : getStudentProfileFromDB(options.studentId, courseId),
        options.studentProgress
          ? Promise.resolve(null)
          : getStudentProgress(options.studentId, courseId),
        getCourseContext(courseId),
      ]);

      // Usar datos obtenidos automáticamente si no se proporcionaron manualmente
      if (!finalStudentProfile && profile) {
        finalStudentProfile = profile;
      }

      if (!finalStudentProgress && progress) {
        finalStudentProgress = progress;
      }

      courseContext = context;
    } catch (error) {
      console.warn(
        '⚠️ AgentService: Error obteniendo datos del estudiante automáticamente:',
        error
      );
      // Continuar con los datos proporcionados manualmente o null
    }
  } else if (!options.skipAutoFetch && courseId) {
    // Intentar obtener contexto del curso aunque no haya studentId
    try {
      courseContext = await getCourseContext(courseId);
    } catch (error) {
      console.warn('⚠️ AgentService: Error obteniendo contexto del curso:', error);
    }
  }

  // Construir payload estructurado (inspirado en AOIGO)
  const payload: AgentRequest = {
    messageId,
    conversationId:
      options.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    message: message.trim(),
    courseId,
    studentId: options.studentId,
    studentProfile: finalStudentProfile,
    studentProgress: finalStudentProgress,
    priority: options.priority || 'normal',
    messageType: options.messageType || 'question',
    expectsResponse: true,
    courseContext: courseContext
      ? {
          ...courseContext,
          sessionId: options.sessionId,
        }
      : options.sessionId
        ? {
            sessionId: options.sessionId,
          }
        : undefined,
  };

  // Logging estructurado (inspirado en AOIGO)
  console.log('📤 AgentService: Enviando solicitud A2A:', {
    messageId,
    conversationId: payload.conversationId,
    courseId,
    hasProfile: !!finalStudentProfile,
    hasProgress: !!finalStudentProgress,
    hasContext: !!courseContext,
    priority: payload.priority,
    messageType: payload.messageType,
  });

  try {
    const response = await fetchWithRetry(
      A2A_COORDINATOR_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Message-Id': messageId,
          'X-Conversation-Id': payload.conversationId || '',
        },
        body: JSON.stringify(payload),
      },
      { attempts: 2, baseDelayMs: 300, timeoutMs: 15000 } // Optimizado para velocidad
    );

    const data: AgentResponse = await response.json().catch(() => ({}) as AgentResponse);

    // Extraer respuesta (soporta múltiples formatos)
    const text: string | undefined = data?.answer || data?.message || data?.text;
    if (!text) {
      console.error(
        '❌ AgentService: Respuesta del coordinador A2A sin "answer/message/text":',
        data
      );
      throw new Error('Respuesta inesperada del coordinador A2A.');
    }

    console.log('✅ AgentService: Respuesta recibida exitosamente:', {
      messageId,
      conversationId: payload.conversationId,
      responseLength: text.length,
      metadata: data.metadata,
    });

    return text;
  } catch (error) {
    console.error('❌ AgentService: Error en comunicación con coordinador A2A:', {
      messageId,
      conversationId: payload.conversationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
