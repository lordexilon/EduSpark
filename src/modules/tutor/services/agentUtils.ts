// =====================================================
// Utilidades para el Sistema Multi-Agente
// Funciones de apoyo para los agentes y coordinación
// =====================================================

import type {
  AgentMessage,
  AgentResponse,
  ConversationContext,
  ContextWindow,
  StudentProgress
} from '../types/agents';
import type {
  PedagogicalSettings,
  StudentProfile,
  GradingScale
} from '../types/pedagogical';

// =====================================================
// Utilidades de Contexto
// =====================================================

/**
 * Crea un contexto de conversación completo
 */
export const createConversationContext = (
  studentId: string,
  courseId: string,
  conversationId: string,
  pedagogicalSettings: PedagogicalSettings,
  studentProfile: StudentProfile,
  recentMessages: AgentMessage[]
): ConversationContext => {
  return {
    studentId,
    courseId,
    conversationId,
    pedagogicalSettings,
    studentProfile,
    recentMessages: recentMessages.map(msg => ({
      id: msg.id || Date.now().toString(),
      role: msg.role,
      text: msg.text,
      timestamp: msg.timestamp || new Date(),
      metadata: msg.metadata || {}
    }))
  };
};

/**
 * Enriquece el contexto con información adicional
 */
export const enrichContext = (
  context: ConversationContext,
  additionalData: {
    courseMaterials?: any[];
    courseImages?: any[];
    usageMetrics?: any[];
    gradingScale?: GradingScale;
  }
): ConversationContext => {
  return {
    ...context,
    metadata: {
      ...context.metadata,
      courseMaterials: additionalData.courseMaterials || [],
      courseImages: additionalData.courseImages || [],
      usageMetrics: additionalData.usageMetrics || [],
      gradingScale: additionalData.gradingScale
    }
  };
};

/**
 * Extrae información relevante del contexto para un agente específico
 */
export const extractContextForAgent = (
  context: ConversationContext,
  agentType: 'voice' | 'rag' | 'context' | 'coordinator'
): Partial<ConversationContext> => {
  switch (agentType) {
    case 'voice':
      return {
        studentId: context.studentId,
        courseId: context.courseId,
        pedagogicalSettings: {
          voiceName: context.pedagogicalSettings.voiceName,
          voiceSpeed: context.pedagogicalSettings.voiceSpeed
        } as any,
        recentMessages: context.recentMessages.slice(-5) // Solo últimos 5 mensajes
      };

    case 'rag':
      return {
        studentId: context.studentId,
        courseId: context.courseId,
        pedagogicalSettings: context.pedagogicalSettings,
        studentProfile: context.studentProfile,
        recentMessages: context.recentMessages.slice(-10) // Últimos 10 mensajes
      };

    case 'context':
      return {
        studentId: context.studentId,
        courseId: context.courseId,
        pedagogicalSettings: context.pedagogicalSettings,
        studentProfile: context.studentProfile,
        recentMessages: context.recentMessages
      };

    case 'coordinator':
      return context; // El coordinador necesita todo el contexto

    default:
      return context;
  }
};

// =====================================================
// Utilidades de Personalización
// =====================================================

/**
 * Genera un prompt personalizado basado en la configuración pedagógica
 */
export const generatePersonalizedPrompt = (
  basePrompt: string,
  pedagogicalSettings: PedagogicalSettings,
  studentProfile: StudentProfile
): string => {
  const styleInstructions = getStyleInstructions(pedagogicalSettings.teachingStyle);
  const toneInstructions = getToneInstructions(pedagogicalSettings.tonePreference);
  const detailInstructions = getDetailInstructions(pedagogicalSettings.detailLevel);
  const studentInstructions = getStudentInstructions(studentProfile);

  return `${basePrompt}

CONFIGURACIÓN PEDAGÓGICA:
${styleInstructions}
${toneInstructions}
${detailInstructions}

PERFIL DEL ESTUDIANTE:
${studentInstructions}

INSTRUCCIONES ADICIONALES:
${pedagogicalSettings.useExamples ? '- Incluye ejemplos prácticos en tus respuestas' : ''}
${pedagogicalSettings.encourageQuestions ? '- Fomenta que el estudiante haga preguntas' : ''}
${pedagogicalSettings.systemPromptOverride ? `\n${pedagogicalSettings.systemPromptOverride}` : ''}`;
};

/**
 * Obtiene instrucciones de estilo de enseñanza
 */
const getStyleInstructions = (style: string): string => {
  const styles = {
    'socratico': 'Utiliza el método socrático: haz preguntas guiadas para que el estudiante llegue a sus propias conclusiones. Evita dar respuestas directas.',
    'directo': 'Proporciona explicaciones claras y estructuradas. Sé directo y conciso en tus respuestas.',
    'colaborativo': 'Fomenta la participación activa del estudiante. Haz preguntas abiertas y promueve la discusión.',
    'constructivista': 'Ayuda al estudiante a construir su conocimiento conectando con experiencias previas. Guía paso a paso.'
  };

  return styles[style as keyof typeof styles] || styles.directo;
};

/**
 * Obtiene instrucciones de tono
 */
const getToneInstructions = (tone: string): string => {
  const tones = {
    'amigable': 'Mantén un tono amigable, cercano y accesible. Usa un lenguaje casual pero respetuoso.',
    'formal': 'Mantén un tono académico y profesional. Usa un lenguaje formal y estructurado.',
    'motivador': 'Sé alentador y positivo. Motiva al estudiante y celebra sus logros.',
    'neutro': 'Mantén un tono equilibrado y objetivo. Sé profesional pero accesible.'
  };

  return tones[tone as keyof typeof tones] || tones.amigable;
};

/**
 * Obtiene instrucciones de nivel de detalle
 */
const getDetailInstructions = (level: string): string => {
  const levels = {
    'basico': 'Proporciona explicaciones simples y fundamentales. Evita tecnicismos innecesarios.',
    'medio': 'Equilibra la simplicidad con el detalle necesario. Incluye información relevante sin abrumar.',
    'avanzado': 'Proporciona explicaciones detalladas y técnicas. Incluye conceptos avanzados cuando sea apropiado.'
  };

  return levels[level as keyof typeof levels] || levels.medio;
};

/**
 * Obtiene instrucciones basadas en el perfil del estudiante
 */
const getStudentInstructions = (profile: StudentProfile): string => {
  const learningStyle = getLearningStyleInstructions(profile.preferredLearningStyle);
  // const difficulty = getDifficultyInstructions(profile.difficultyLevel);

  return `- Estilo de aprendizaje preferido: ${learningStyle}
// - Nivel de dificultad: No disponible
- Interacciones previas: ${profile.interactionCount}
- Temas dominados: ${profile.topicsMastered.join(', ') || 'Ninguno'}
- Temas con dificultad: ${profile.topicsStruggled.join(', ') || 'Ninguno'}`;
};

/**
 * Obtiene instrucciones de estilo de aprendizaje
 */
const getLearningStyleInstructions = (style: string): string => {
  const styles = {
    'visual': 'Incluye descripciones visuales, diagramas conceptuales y representaciones gráficas.',
    'auditory': 'Usa explicaciones verbales detalladas y ejemplos sonoros.',
    'kinesthetic': 'Incluye ejemplos prácticos y actividades que involucren movimiento o manipulación.',
    'reading': 'Proporciona textos estructurados y recursos escritos para consulta.'
  };

  return styles[style as keyof typeof styles] || 'Adaptable a diferentes estilos';
};

/**
 * Obtiene instrucciones de nivel de dificultad
 */
const getDifficultyInstructions = (level: string): string => {
  const levels = {
    'basico': 'Mantén las explicaciones simples y fundamentales.',
    'medio': 'Proporciona un nivel intermedio de complejidad.',
    'avanzado': 'Puedes incluir conceptos avanzados y técnicos.'
  };

  return levels[level as keyof typeof levels] || 'Nivel intermedio';
};

// =====================================================
// Utilidades de Respuesta
// =====================================================

/**
 * Valida una respuesta de agente
 */
export const validateAgentResponse = (response: AgentResponse): boolean => {
  return (
    response &&
    typeof response.success === 'boolean' &&
    typeof response.message === 'string' &&
    response.message.length > 0 &&
    response.metadata &&
    typeof response.metadata.model === 'string'
  );
};

/**
 * Mejora una respuesta de agente con información adicional
 */
export const enhanceAgentResponse = (
  response: AgentResponse,
  context: ConversationContext
): AgentResponse => {
  return {
    ...response,
    metadata: {
      ...response.metadata,
      timestamp: new Date().toISOString(),
      contextUsed: {
        pedagogicalSettings: !!context.pedagogicalSettings,
        studentProfile: !!context.studentProfile,
        recentMessages: context.recentMessages.length
      },
      personalization: {
        teachingStyle: context.pedagogicalSettings.teachingStyle,
        tonePreference: context.pedagogicalSettings.tonePreference,
        detailLevel: context.pedagogicalSettings.detailLevel
      }
    }
  };
};

/**
 * Combina múltiples respuestas de agentes
 */
export const combineAgentResponses = (
  responses: AgentResponse[],
  context: ConversationContext
): AgentResponse => {
  const successfulResponses = responses.filter(r => r.success);

  if (successfulResponses.length === 0) {
    return {
      success: false,
      message: 'No se pudo generar una respuesta adecuada.',
      metadata: {
        model: 'multi-agent',
        source: 'Agent Coordinator',
        contextUsed: 'No context used',
        timestamp: new Date().toISOString()
      },
      agentUsed: 'coordinator'
    };
  }

  // Si hay una sola respuesta exitosa, usarla
  if (successfulResponses.length === 1) {
    return enhanceAgentResponse(successfulResponses[0], context);
  }

  // Combinar múltiples respuestas
  const combinedMessage = successfulResponses
    .map(r => r.message)
    .join('\n\n---\n\n');

  return {
    success: true,
    message: combinedMessage,
    metadata: {
      model: 'multi-agent-combined',
      source: 'Agent Coordinator',
      contextUsed: 'Multiple agent responses combined',
      timestamp: new Date().toISOString(),
      agentCount: successfulResponses.length,
      personalization: {
        teachingStyle: context.pedagogicalSettings.teachingStyle,
        tonePreference: context.pedagogicalSettings.tonePreference,
        detailLevel: context.pedagogicalSettings.detailLevel
      }
    },
    agentUsed: 'coordinator'
  };
};

// =====================================================
// Utilidades de Análisis
// =====================================================

/**
 * Analiza la calidad de una respuesta
 */
export const analyzeResponseQuality = (response: AgentResponse): {
  score: number;
  factors: {
    length: number;
    completeness: number;
    personalization: number;
    clarity: number;
  };
} => {
  const message = response.message;
  const length = message.length;
  const completeness = message.includes('?') ? 0.8 : 1.0; // Preguntas incompletas
  const personalization = response.metadata.personalization ? 1.0 : 0.5;
  const clarity = message.split('.').length > 1 ? 1.0 : 0.7; // Múltiples oraciones

  const score = (length * 0.2 + completeness * 0.3 + personalization * 0.3 + clarity * 0.2) / 100;

  return {
    score: Math.min(score, 1.0),
    factors: {
      length: length / 1000, // Normalizado
      completeness,
      personalization,
      clarity
    }
  };
};

/**
 * Extrae métricas de una conversación
 */
export const extractConversationMetrics = (
  messages: AgentMessage[],
  context: ConversationContext
): Record<string, number> => {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const avgResponseTime = assistantMessages.length > 0 ?
    assistantMessages.reduce((sum, msg) => sum + (msg.metadata?.responseTime || 0), 0) / assistantMessages.length : 0;

  const avgMessageLength = messages.length > 0 ?
    messages.reduce((sum, msg) => sum + msg.text.length, 0) / messages.length : 0;

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    avgResponseTime,
    avgMessageLength,
    interactionCount: context.studentProfile.interactionCount,
    personalizationLevel: context.pedagogicalSettings ? 1.0 : 0.0
  };
};

// =====================================================
// Utilidades de Debugging
// =====================================================

/**
 * Genera información de debugging para un agente
 */
export const generateDebugInfo = (
  agentType: string,
  response: AgentResponse,
  context: ConversationContext,
  processingTime: number
) => {
  return {
    agent: agentType,
    timestamp: new Date().toISOString(),
    processingTime,
    response: {
      success: response.success,
      messageLength: response.message.length,
      metadata: response.metadata
    },
    context: {
      studentId: context.studentId,
      courseId: context.courseId,
      recentMessages: context.recentMessages.length,
      pedagogicalSettings: !!context.pedagogicalSettings,
      studentProfile: !!context.studentProfile
    },
    quality: analyzeResponseQuality(response)
  };
};

/**
 * Valida la configuración del sistema
 */
export const validateSystemConfiguration = (config: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar configuración de Supabase
  if (!config.supabase?.url) {
    errors.push('Supabase URL no configurada');
  }
  if (!config.supabase?.anonKey) {
    errors.push('Supabase Anon Key no configurada');
  }


  // Validar configuración de Gemini
  if (!config.gemini?.apiKey) {
    errors.push('Gemini API Key no configurada');
  }

  // Warnings
  if (config.memory?.maxLocalMessages > 100) {
    warnings.push('Número alto de mensajes locales puede afectar el rendimiento');
  }

  if (config.n8n?.timeout > 60000) {
    warnings.push('Timeout de n8n muy alto puede causar problemas de UX');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// =====================================================
// Exportaciones
// =====================================================

export const agentUtils = {
  createConversationContext,
  enrichContext,
  extractContextForAgent,
  generatePersonalizedPrompt,
  validateAgentResponse,
  enhanceAgentResponse,
  combineAgentResponses,
  analyzeResponseQuality,
  extractConversationMetrics,
  generateDebugInfo,
  validateSystemConfiguration
};
