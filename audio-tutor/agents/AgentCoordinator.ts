// =====================================================
// Coordinador de Agentes para Audio-Tutor Multi-Agente
// Orquestación entre VoiceAgent, RAGAgent y ContextAgent
// =====================================================

import { VoiceAgent } from './VoiceAgent';
import { RAGAgent } from './RAGAgent';
import { ContextAgent } from './ContextAgent';
import type { 
  AgentResponse, 
  FullContext, 
  VoiceConfig,
  AgentError,
  AgentEvent,
  AgentEventListener
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile 
} from '../types/pedagogical';

// =====================================================
// Clase AgentCoordinator
// =====================================================

export class AgentCoordinator {
  private voiceAgent: VoiceAgent;
  private ragAgent: RAGAgent;
  private contextAgent: ContextAgent;
  private eventListeners: AgentEventListener[] = [];
  private isProcessing: boolean = false;
  private currentContext: FullContext | null = null;

  constructor(
    voiceAgent?: VoiceAgent,
    ragAgent?: RAGAgent,
    contextAgent?: ContextAgent
  ) {
    this.voiceAgent = voiceAgent || new VoiceAgent();
    this.ragAgent = ragAgent || new RAGAgent();
    this.contextAgent = contextAgent || new ContextAgent();
  }

  /**
   * Inicializa el sistema de agentes
   */
  async initialize(
    studentId: string,
    courseId: string,
    user: any,
    options?: { moduleId?: string }
  ): Promise<void> {
    try {
      // Inicializar contexto de conversación
      const conversation = await this.contextAgent.initConversation(studentId, courseId);
      
      // Obtener contexto pedagógico y del estudiante
      const pedagogicalSettings = await this.contextAgent.getPedagogicalContext(courseId);
      const studentProfile = await this.contextAgent.getStudentContext(studentId, courseId);
      
      // Crear contexto completo
      this.currentContext = {
        user: {
          id: user.id,
          role: user.role?.name || 'student',
          name: `${user.first_name} ${user.last_name}`.trim()
        },
        course: {
          id: courseId,
          name: 'Curso', // Se obtendría de la base de datos
          teacherId: pedagogicalSettings.teacherId,
          moduleId: options?.moduleId
        },
        pedagogical: pedagogicalSettings,
        student: studentProfile,
        conversation,
        recentMessages: []
      };

      // Configurar voz según preferencias pedagógicas
      this.voiceAgent.updateVoiceConfig({
        voiceName: pedagogicalSettings.voiceName,
        speed: pedagogicalSettings.voiceSpeed
      });

      this.emitEvent({
        type: 'message_sent',
        agent: 'coordinator',
        data: { action: 'initialized', conversationId: conversation.id },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error initializing agent system:', error);
      throw error;
    }
  }

  /**
   * Maneja la entrada del usuario (texto o audio)
   */
  async handleUserInput(input: string | AudioBlob): Promise<AgentResponse> {
    if (this.isProcessing) {
      return {
        success: false,
        message: 'El sistema está procesando otra solicitud. Por favor, espera un momento.',
        metadata: { error: 'System busy' },
        agentUsed: 'coordinator'
      };
    }

    this.isProcessing = true;

    try {
      let userMessage: string;

      // Procesar entrada de audio si es necesario
      if (input instanceof Blob && input.type.startsWith('audio/')) {
        try {
          userMessage = await this.voiceAgent.startListening();
        } catch (error) {
          console.error('Error en reconocimiento de voz:', error);
          this.isProcessing = false;
          return {
            success: false,
            message: 'Error en el reconocimiento de voz. Por favor, inténtalo de nuevo.',
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
            agentUsed: 'voice'
          };
        }
      } else {
        userMessage = input;
      }

      // Asegurar que userMessage sea una cadena
      if (typeof userMessage !== 'string') {
        userMessage = String(userMessage || '');
      }

      if (!userMessage.trim()) {
        this.isProcessing = false;
        return {
          success: false,
          message: 'No se pudo procesar tu mensaje. Por favor, inténtalo de nuevo.',
          metadata: { error: 'Empty input' },
          agentUsed: 'voice'
        };
      }

      // Crear mensaje del usuario
      const userChatMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        text: userMessage,
        timestamp: new Date(),
        metadata: {}
      };

      // Agregar a la conversación
      await this.contextAgent.addMessage(userChatMessage);

      // Obtener contexto relevante
      const contextWindow = await this.contextAgent.getRelevantContext(userMessage);

      // Crear contexto de conversación para RAG
      const conversationContext = {
        studentId: this.currentContext!.user.id,
        courseId: this.currentContext!.course.id,
        moduleId: this.currentContext!.course.moduleId,
        conversationId: this.currentContext!.conversation.id,
        pedagogicalSettings: this.currentContext!.pedagogical,
        studentProfile: this.currentContext!.student,
        recentMessages: contextWindow.messages
      };

      // Obtener respuesta del RAG
      const ragResponse = await this.ragAgent.query(userMessage, conversationContext);

      // Aplicar personalización del estudiante
      const personalizedResponse = this.ragAgent.applyStudentProfile(
        ragResponse.answer,
        this.currentContext!.student
      );

      // Crear mensaje de respuesta
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        text: personalizedResponse,
        timestamp: new Date(),
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources,
          contextUsed: ragResponse.context
        }
      };

      // Agregar respuesta a la conversación
      await this.contextAgent.addMessage(assistantMessage);

      // Generar audio si está habilitado
      let audioUrl: string | undefined;
      if (this.voiceAgent.isReady()) {
        try {
          await this.voiceAgent.speak(personalizedResponse);
          // En un sistema real, aquí se guardaría la URL del audio generado
          audioUrl = 'generated-audio-url';
        } catch (audioError) {
          console.warn('Error generating audio:', audioError);
        }
      }

      // Actualizar progreso del estudiante
      await this.updateStudentProgress(userMessage, personalizedResponse);

      this.emitEvent({
        type: 'message_received',
        agent: 'rag',
        data: { 
          userMessage, 
          response: personalizedResponse,
          confidence: ragResponse.confidence 
        },
        timestamp: new Date()
      });

      this.isProcessing = false;

      return {
        success: true,
        message: personalizedResponse,
        audioUrl,
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources,
          contextUsed: ragResponse.context,
          agentUsed: 'rag'
        },
        agentUsed: 'rag'
      };

    } catch (error) {
      this.isProcessing = false;
      console.error('Error handling user input:', error);

      const errorResponse = await this.handleError(error as Error);

      this.emitEvent({
        type: 'error_occurred',
        agent: 'coordinator',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      });

      return errorResponse;
    }
  }

  /**
   * Maneja errores del sistema
   */
  private async handleError(error: Error): Promise<AgentResponse> {
    const agentError: AgentError = {
      code: 'SYSTEM_ERROR',
      message: error.message,
      agent: 'coordinator',
      timestamp: new Date(),
      recoverable: true
    };

    // Intentar recuperación si es posible
    if (this.canRecover(agentError)) {
      try {
        // Lógica de recuperación específica
        return await this.attemptRecovery(agentError);
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    }

    return {
      success: false,
      message: 'Lo siento, ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.',
      metadata: { 
        error: error.message,
        code: agentError.code,
        recoverable: agentError.recoverable
      },
      agentUsed: 'coordinator'
    };
  }

  /**
   * Verifica si un error es recuperable
   */
  private canRecover(error: AgentError): boolean {
    const recoverableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR'
    ];

    return recoverableErrors.includes(error.code) && error.recoverable;
  }

  /**
   * Intenta recuperar de un error
   */
  private async attemptRecovery(error: AgentError): Promise<AgentResponse> {
    // Implementar lógica de recuperación específica
    // Por ejemplo, reintentar con backoff exponencial
    
    return {
      success: false,
      message: 'Error temporal. Por favor, inténtalo de nuevo.',
      metadata: { 
        error: error.message,
        recoveryAttempted: true
      },
      agentUsed: 'coordinator'
    };
  }

  /**
   * Actualiza el progreso del estudiante
   */
  private async updateStudentProgress(
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    if (!this.currentContext) return;

    try {
      // Analizar el progreso actual
      const progress = await this.contextAgent.analyzeStudentProgress();

      // Actualizar contador de interacciones
      const updatedProfile: Partial<StudentProfile> = {
        interactionCount: progress.interactionCount + 1,
        lastUpdated: new Date()
      };

      // Detectar temas de dificultad o maestría basado en la conversación
      const topics = this.extractTopicsFromConversation(userMessage, assistantResponse);
      
      if (this.detectStrugglingTopics(userMessage, assistantResponse)) {
        updatedProfile.topicsStruggled = [
          ...this.currentContext.student.topicsStruggled,
          ...topics
        ].filter((topic, index, arr) => arr.indexOf(topic) === index);
      }

      if (this.detectMasteredTopics(userMessage, assistantResponse)) {
        updatedProfile.topicsMastered = [
          ...this.currentContext.student.topicsMastered,
          ...topics
        ].filter((topic, index, arr) => arr.indexOf(topic) === index);
      }

      // Actualizar perfil del estudiante
      await this.contextAgent.updateStudentContext(
        this.currentContext.user.id,
        this.currentContext.course.id,
        updatedProfile
      );

    } catch (error) {
      console.error('Error updating student progress:', error);
    }
  }

  /**
   * Extrae temas de la conversación
   */
  private extractTopicsFromConversation(userMessage: string, assistantResponse: string): string[] {
    const allText = `${userMessage} ${assistantResponse}`.toLowerCase();
    const educationKeywords = [
      'matemáticas', 'algebra', 'geometría', 'física', 'química',
      'biología', 'historia', 'literatura', 'programación'
    ];

    return educationKeywords.filter(keyword => allText.includes(keyword));
  }

  /**
   * Detecta si el estudiante está teniendo dificultades
   */
  private detectStrugglingTopics(userMessage: string, assistantResponse: string): boolean {
    const strugglingIndicators = [
      'no entiendo', 'no comprendo', 'confuso', 'difícil',
      'complicado', 'ayuda', 'explica mejor'
    ];

    return strugglingIndicators.some(indicator => 
      userMessage.toLowerCase().includes(indicator)
    );
  }

  /**
   * Detecta si el estudiante ha dominado un tema
   */
  private detectMasteredTopics(userMessage: string, assistantResponse: string): boolean {
    const masteryIndicators = [
      'entendido', 'claro', 'perfecto', 'ahora sí',
      'comprendo', 'fácil', 'obvio'
    ];

    return masteryIndicators.some(indicator => 
      userMessage.toLowerCase().includes(indicator)
    );
  }

  /**
   * Obtiene el estado del sistema
   */
  getSystemStatus(): {
    isProcessing: boolean;
    voiceAgent: any;
    contextAgent: any;
    currentContext: FullContext | null;
  } {
    return {
      isProcessing: this.isProcessing,
      voiceAgent: this.voiceAgent.getStatus(),
      contextAgent: this.contextAgent.getCurrentConversation(),
      currentContext: this.currentContext
    };
  }

  /**
   * Agrega un listener de eventos
   */
  addEventListener(listener: AgentEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remueve un listener de eventos
   */
  removeEventListener(listener: AgentEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emite un evento a todos los listeners
   */
  private emitEvent(event: AgentEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Limpia recursos del coordinador
   */
  cleanup(): void {
    this.voiceAgent.cleanup();
    this.contextAgent.clearContext();
    this.eventListeners = [];
    this.isProcessing = false;
    this.currentContext = null;
  }
}
