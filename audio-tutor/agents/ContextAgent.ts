// =====================================================
// Agente de Contexto para Audio-Tutor Multi-Agente
// Gestión de memoria y personalización
// =====================================================

import { 
  saveConversation, 
  loadConversation, 
  getPedagogicalSettings, 
  getStudentProfile, 
  updateStudentProfile,
  updateConversationActivity
} from '../services/supabaseService';
import { memoryService } from '../services/memoryService';
import type { 
  Conversation, 
  ChatMessage, 
  ContextWindow, 
  StudentProgress 
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile, 
  CourseContext 
} from '../types/pedagogical';

// =====================================================
// Clase ContextAgent
// =====================================================

export class ContextAgent {
  private currentConversation: Conversation | null = null;
  private currentCourseContext: CourseContext | null = null;

  /**
   * Inicializa una nueva conversación
   */
  async initConversation(
    studentId: string, 
    courseId: string
  ): Promise<Conversation> {
    try {
      console.log('💬 ContextAgent.initConversation - Iniciando...', { studentId, courseId });
      
      // Crear nueva conversación en Supabase con timeout
      const savePromise = saveConversation(studentId, courseId, {
        agentSystem: 'multi-agent-tutor',
        version: '1.0'
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout creando conversación')), 5000)
      );
      
      const response = await Promise.race([savePromise, timeoutPromise]) as any;

      if (!response.success || !response.data) {
        console.warn('⚠️ No se pudo crear conversación, usando conversación temporal');
        // Crear conversación temporal si falla
        const tempConversation: Conversation = {
          id: `temp-${Date.now()}`,
          studentId,
          courseId,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { agentSystem: 'multi-agent-tutor', version: '1.0', temp: true }
        };
        this.currentConversation = tempConversation;
        return tempConversation;
      }

      console.log('✅ Conversación creada:', response.data.id);
      this.currentConversation = response.data;

      // Inicializar memoria para esta conversación (no crítico)
      try {
        await Promise.race([
          memoryService.initializeConversation(response.data.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
      } catch (memoryError) {
        console.warn('⚠️ Error inicializando memoria (continuando):', memoryError);
      }

      return response.data;

    } catch (error) {
      console.error('❌ Error initializing conversation:', error);
      // Crear conversación temporal para continuar
      const tempConversation: Conversation = {
        id: `temp-${Date.now()}`,
        studentId,
        courseId,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { agentSystem: 'multi-agent-tutor', version: '1.0', temp: true, error: String(error) }
      };
      this.currentConversation = tempConversation;
      return tempConversation;
    }
  }

  /**
   * Carga una conversación existente
   */
  async loadConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await loadConversation(conversationId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load conversation');
      }

      this.currentConversation = response.data;

      // Cargar memoria para esta conversación
      await memoryService.initializeConversation(conversationId);

      return response.data;

    } catch (error) {
      console.error('Error loading conversation:', error);
      throw error;
    }
  }

  /**
   * Agrega un mensaje a la conversación
   */
  async addMessage(message: ChatMessage): Promise<void> {
    if (!this.currentConversation) {
      throw new Error('No active conversation');
    }

    try {
      // Guardar en memoria (local + Supabase)
      const success = await memoryService.saveToMemory(message, this.currentConversation.id);
      
      if (!success) {
        console.warn('Failed to save message to memory');
      }

      // Actualizar actividad de la conversación
      await this.updateConversationActivity();

    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Obtiene el contexto relevante para una consulta
   */
  async getRelevantContext(query: string): Promise<ContextWindow> {
    try {
      // Obtener contexto de la memoria
      const contextWindow = await memoryService.getRelevantContext(query);

      return contextWindow;

    } catch (error) {
      console.error('Error getting relevant context:', error);
      return {
        messages: [],
        summary: 'No hay contexto disponible',
        relevantTopics: [],
        studentProgress: {
          topicsMastered: [],
          topicsStruggled: [],
          interactionCount: 0,
          avgSessionDuration: 0
        }
      };
    }
  }

  /**
   * Obtiene el contexto pedagógico del curso
   */
  async getPedagogicalContext(courseId: string): Promise<PedagogicalSettings> {
    try {
      const response = await getPedagogicalSettings(courseId);

      if (!response.success || !response.data) {
        // Retornar configuración por defecto si no existe
        return this.getDefaultPedagogicalSettings(courseId);
      }

      return response.data;

    } catch (error) {
      console.error('Error getting pedagogical context:', error);
      return this.getDefaultPedagogicalSettings(courseId);
    }
  }

  /**
   * Obtiene el contexto del estudiante
   */
  async getStudentContext(
    studentId: string, 
    courseId: string
  ): Promise<StudentProfile> {
    try {
      const response = await getStudentProfile(studentId, courseId);

      if (!response.success || !response.data) {
        // Crear perfil por defecto si no existe
        return this.getDefaultStudentProfile(studentId, courseId);
      }

      return response.data;

    } catch (error) {
      console.error('Error getting student context:', error);
      return this.getDefaultStudentProfile(studentId, courseId);
    }
  }

  /**
   * Actualiza el perfil del estudiante
   */
  async updateStudentContext(
    studentId: string,
    courseId: string,
    updates: Partial<StudentProfile>
  ): Promise<void> {
    try {
      const response = await updateStudentProfile(studentId, courseId, updates);

      if (!response.success) {
        console.warn('Failed to update student profile:', response.error);
      }

    } catch (error) {
      console.error('Error updating student context:', error);
    }
  }

  /**
   * Obtiene el contexto completo del curso
   */
  async getCourseContext(courseId: string): Promise<CourseContext | null> {
    try {
      // Aquí se podría implementar la lógica para obtener
      // información completa del curso desde Supabase
      // Por ahora retornamos null y se implementará en el futuro
      return null;

    } catch (error) {
      console.error('Error getting course context:', error);
      return null;
    }
  }

  /**
   * Analiza el progreso del estudiante basado en la conversación
   */
  async analyzeStudentProgress(): Promise<StudentProgress> {
    if (!this.currentConversation) {
      return {
        topicsMastered: [],
        topicsStruggled: [],
        interactionCount: 0,
        avgSessionDuration: 0
      };
    }

    try {
      const contextWindow = await this.getRelevantContext('');
      return contextWindow.studentProgress;

    } catch (error) {
      console.error('Error analyzing student progress:', error);
      return {
        topicsMastered: [],
        topicsStruggled: [],
        interactionCount: 0,
        avgSessionDuration: 0
      };
    }
  }

  /**
   * Obtiene el historial de mensajes de la conversación
   */
  async getConversationHistory(limit: number = 50): Promise<ChatMessage[]> {
    if (!this.currentConversation) {
      return [];
    }

    try {
      const response = await memoryService.getLongTermMemory(this.currentConversation.id);
      return response.slice(-limit);

    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Obtiene la conversación actual
   */
  getCurrentConversation(): Conversation | null {
    return this.currentConversation;
  }

  /**
   * Obtiene el contexto del curso actual
   */
  getCurrentCourseContext(): CourseContext | null {
    return this.currentCourseContext;
  }

  /**
   * Actualiza la actividad de la conversación
   */
  private async updateConversationActivity(): Promise<void> {
    if (!this.currentConversation) return;

    try {
      console.log('Updating conversation activity for:', this.currentConversation.id);
      await updateConversationActivity(this.currentConversation.id);
    } catch (error) {
      console.error('Error updating conversation activity:', error);
    }
  }

  /**
   * Obtiene configuración pedagógica por defecto
   */
  private getDefaultPedagogicalSettings(courseId: string): PedagogicalSettings {
    return {
      id: 'default',
      courseId,
      teacherId: 'unknown',
      teachingStyle: 'constructivista',
      tonePreference: 'amigable',
      detailLevel: 'medio',
      useExamples: true,
      encourageQuestions: true,
      voiceName: 'Kore',
      voiceSpeed: 1.0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Obtiene perfil de estudiante por defecto
   */
  private getDefaultStudentProfile(studentId: string, courseId: string): StudentProfile {
    return {
      id: 'default',
      studentId,
      courseId,
      preferredLearningStyle: 'lectoescritor',
      interactionCount: 0,
      avgSessionDuration: 0,
      topicsStruggled: [],
      topicsMastered: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Limpia el contexto actual
   */
  clearContext(): void {
    this.currentConversation = null;
    this.currentCourseContext = null;
    memoryService.clearMemory();
  }

  /**
   * Exporta el contexto para análisis
   */
  exportContext(): {
    conversation: Conversation | null;
    courseContext: CourseContext | null;
    memory: any;
  } {
    return {
      conversation: this.currentConversation,
      courseContext: this.currentCourseContext,
      memory: memoryService.exportMemory()
    };
  }
}
