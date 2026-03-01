// =====================================================
// Servicio de Memoria para Audio-Tutor Multi-Agente
// Gestión unificada de memoria híbrida (local + Supabase)
// =====================================================

import type { ChatMessage, ContextWindow, StudentProgress } from '../types/agents';
import { 
  getConversationHistory, 
  saveMessage, 
  updateStudentProfile,
  saveUsageMetric,
  getUsageMetrics
} from './supabaseService';

// =====================================================
// Configuración de Memoria
// =====================================================

interface MemoryConfig {
  maxLocalMessages: number;
  contextWindowSize: number;
  enableLongTermMemory: boolean;
  autoSummarizeThreshold: number;
}

const DEFAULT_CONFIG: MemoryConfig = {
  maxLocalMessages: 50,
  contextWindowSize: 10,
  enableLongTermMemory: true,
  autoSummarizeThreshold: 20
};

// =====================================================
// Clase Principal de Gestión de Memoria
// =====================================================

export class MemoryService {
  private config: MemoryConfig;
  private localMessages: ChatMessage[] = [];
  private conversationId: string | null = null;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadLocalMessages();
  }

  /**
   * Inicializa la memoria para una conversación específica
   */
  async initializeConversation(conversationId: string): Promise<void> {
    this.conversationId = conversationId;
    
    if (this.config.enableLongTermMemory) {
      await this.loadLongTermMemory(conversationId);
    }
  }

  /**
   * Obtiene la memoria a corto plazo (localStorage)
   */
  getShortTermMemory(): ChatMessage[] {
    return [...this.localMessages];
  }

  /**
   * Obtiene la memoria a largo plazo (Supabase)
   */
  async getLongTermMemory(conversationId: string): Promise<ChatMessage[]> {
    if (!this.config.enableLongTermMemory) {
      return [];
    }

    const response = await getConversationHistory(conversationId, this.config.maxLocalMessages);
    return response.data || [];
  }

  /**
   * Carga la memoria a largo plazo en memoria local
   */
  private async loadLongTermMemory(conversationId: string): Promise<void> {
    const longTermMessages = await this.getLongTermMemory(conversationId);
    
    // Combinar mensajes locales y de largo plazo, evitando duplicados
    const existingIds = new Set(this.localMessages.map(msg => msg.id));
    const newMessages = longTermMessages.filter(msg => !existingIds.has(msg.id));
    
    this.localMessages = [...this.localMessages, ...newMessages]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-this.config.maxLocalMessages);
  }

  /**
   * Guarda un mensaje en la memoria
   */
  async saveToMemory(
    message: ChatMessage, 
    conversationId?: string
  ): Promise<boolean> {
    const targetConversationId = conversationId || this.conversationId;
    
    if (!targetConversationId) {
      console.warn('No conversation ID available for saving message');
      return false;
    }

    try {
      // Guardar en memoria local
      this.localMessages.push(message);
      this.trimLocalMessages();
      this.saveLocalMessages();

      // Guardar en Supabase si está habilitado
      if (this.config.enableLongTermMemory) {
        const response = await saveMessage(
          targetConversationId,
          message.role,
          message.text,
          message.audioUrl,
          message.metadata
        );

        if (!response.success) {
          console.error('Failed to save message to Supabase:', response.error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving message to memory:', error);
      return false;
    }
  }

  /**
   * Obtiene el contexto relevante para una consulta
   */
  async getRelevantContext(query: string): Promise<ContextWindow> {
    const recentMessages = this.getRecentMessages();
    const summary = await this.summarizeContext(recentMessages);
    const relevantTopics = this.extractTopics(query, recentMessages);
    const studentProgress = this.analyzeStudentProgress(recentMessages);

    return {
      messages: recentMessages,
      summary,
      relevantTopics,
      studentProgress
    };
  }

  /**
   * Obtiene los mensajes más recientes
   */
  private getRecentMessages(): ChatMessage[] {
    return this.localMessages
      .slice(-this.config.contextWindowSize)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Resumen del contexto de la conversación
   */
  async summarizeContext(messages: ChatMessage[]): Promise<string> {
    if (messages.length === 0) {
      return 'No hay contexto previo en esta conversación.';
    }

    // Si hay pocos mensajes, usar todos
    if (messages.length <= 5) {
      return messages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    }

    // Para conversaciones largas, crear un resumen
    const userMessages = messages.filter(msg => msg.role === 'user');
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');

    const topics = this.extractTopics('', messages);
    const lastUserMessage = userMessages[userMessages.length - 1]?.text || '';
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.text || '';

    return `Contexto de la conversación:
- Temas discutidos: ${topics.join(', ')}
- Última pregunta del estudiante: ${lastUserMessage}
- Última respuesta del tutor: ${lastAssistantMessage}
- Total de mensajes: ${messages.length}`;
  }

  /**
   * Extrae temas relevantes de los mensajes
   */
  private extractTopics(query: string, messages: ChatMessage[]): string[] {
    const allText = [query, ...messages.map(msg => msg.text)].join(' ').toLowerCase();
    
    // Palabras clave comunes en educación
    const educationKeywords = [
      'matemáticas', 'matematica', 'algebra', 'geometría', 'geometria',
      'física', 'fisica', 'química', 'quimica', 'biología', 'biologia',
      'historia', 'geografía', 'geografia', 'literatura', 'filosofía', 'filosofia',
      'programación', 'programacion', 'informática', 'informatica',
      'teorema', 'ecuación', 'ecuacion', 'función', 'funcion',
      'concepto', 'definición', 'definicion', 'ejemplo', 'ejercicio'
    ];

    const foundTopics = educationKeywords.filter(keyword => 
      allText.includes(keyword)
    );

    // Agregar temas únicos de los metadatos
    const metadataTopics = messages
      .flatMap(msg => msg.metadata?.topics || [])
      .filter((topic, index, arr) => arr.indexOf(topic) === index);

    return [...foundTopics, ...metadataTopics].slice(0, 10); // Máximo 10 temas
  }

  /**
   * Analiza el progreso del estudiante
   */
  private analyzeStudentProgress(messages: ChatMessage[]): StudentProgress {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');

    // Contar interacciones
    const interactionCount = userMessages.length;

    // Calcular duración promedio de sesión (simulado)
    const avgSessionDuration = messages.length > 0 ? 
      (Date.now() - messages[0].timestamp.getTime()) / (1000 * 60) : 0; // en minutos

    // Extraer temas de dificultad y maestría de los metadatos
    const topicsStruggled = messages
      .flatMap(msg => msg.metadata?.topicsStruggled || [])
      .filter((topic, index, arr) => arr.indexOf(topic) === index);

    const topicsMastered = messages
      .flatMap(msg => msg.metadata?.topicsMastered || [])
      .filter((topic, index, arr) => arr.indexOf(topic) === index);

    return {
      topicsMastered,
      topicsStruggled,
      interactionCount,
      avgSessionDuration
    };
  }

  /**
   * Limpia la memoria local para mantener el límite
   */
  private trimLocalMessages(): void {
    if (this.localMessages.length > this.config.maxLocalMessages) {
      this.localMessages = this.localMessages.slice(-this.config.maxLocalMessages);
    }
  }

  /**
   * Carga mensajes desde localStorage
   */
  private loadLocalMessages(): void {
    try {
      const stored = localStorage.getItem('eduspark-tutor-memory');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.localMessages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Error loading local messages:', error);
      this.localMessages = [];
    }
  }

  /**
   * Guarda mensajes en localStorage
   */
  private saveLocalMessages(): void {
    try {
      localStorage.setItem('eduspark-tutor-memory', JSON.stringify(this.localMessages));
    } catch (error) {
      console.warn('Error saving local messages:', error);
    }
  }

  /**
   * Limpia toda la memoria
   */
  clearMemory(): void {
    this.localMessages = [];
    this.conversationId = null;
    localStorage.removeItem('eduspark-tutor-memory');
  }

  /**
   * Exporta la memoria para análisis
   */
  exportMemory(): {
    localMessages: ChatMessage[];
    conversationId: string | null;
    config: MemoryConfig;
  } {
    return {
      localMessages: [...this.localMessages],
      conversationId: this.conversationId,
      config: { ...this.config }
    };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Guarda métricas de uso del tutor
   */
  async saveUsageMetrics(
    conversationId: string,
    studentId: string,
    courseId: string,
    metrics: Record<string, number>
  ): Promise<boolean> {
    try {
      const promises = Object.entries(metrics).map(([type, value]) =>
        saveUsageMetric(conversationId, studentId, courseId, type, value)
      );

      const results = await Promise.all(promises);
      return results.every(result => result.success);
    } catch (error) {
      console.error('Error saving usage metrics:', error);
      return false;
    }
  }

  /**
   * Obtiene métricas de uso del tutor
   */
  async getUsageMetrics(
    courseId: string,
    studentId?: string,
    metricType?: string
  ) {
    try {
      const response = await getUsageMetrics(courseId, studentId, metricType);
      return response.data || [];
    } catch (error) {
      console.error('Error loading usage metrics:', error);
      return [];
    }
  }

  /**
   * Actualiza el perfil del estudiante basado en la conversación
   */
  async updateStudentProfileFromConversation(
    studentId: string,
    courseId: string,
    messages: ChatMessage[]
  ): Promise<boolean> {
    try {
      const progress = this.analyzeStudentProgress(messages);
      const topics = this.extractTopics('', messages);
      
      const updates = {
        interactionCount: progress.interactionCount,
        avgSessionDuration: progress.avgSessionDuration,
        topicsStruggled: progress.topicsStruggled,
        topicsMastered: progress.topicsMastered
      };

      const response = await updateStudentProfile(studentId, courseId, updates);
      return response.success;
    } catch (error) {
      console.error('Error updating student profile:', error);
      return false;
    }
  }

  /**
   * Obtiene un resumen inteligente de la conversación
   */
  async getConversationSummary(conversationId: string): Promise<string> {
    try {
      const messages = await this.getLongTermMemory(conversationId);
      return await this.summarizeContext(messages);
    } catch (error) {
      console.error('Error getting conversation summary:', error);
      return 'No se pudo generar el resumen de la conversación.';
    }
  }

  /**
   * Busca mensajes por contenido
   */
  searchMessages(query: string, limit: number = 10): ChatMessage[] {
    const searchTerm = query.toLowerCase();
    
    return this.localMessages
      .filter(msg => 
        msg.text.toLowerCase().includes(searchTerm) ||
        msg.metadata?.topics?.some((topic: string) => 
          topic.toLowerCase().includes(searchTerm)
        )
      )
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtiene estadísticas de la conversación
   */
  getConversationStats(): {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    avgMessageLength: number;
    topics: string[];
    duration: number;
  } {
    const userMessages = this.localMessages.filter(msg => msg.role === 'user');
    const assistantMessages = this.localMessages.filter(msg => msg.role === 'assistant');
    
    const totalLength = this.localMessages.reduce((sum, msg) => sum + msg.text.length, 0);
    const avgMessageLength = this.localMessages.length > 0 ? totalLength / this.localMessages.length : 0;
    
    const topics = this.extractTopics('', this.localMessages);
    
    const duration = this.localMessages.length > 0 ? 
      (Date.now() - this.localMessages[0].timestamp.getTime()) / (1000 * 60) : 0; // en minutos

    return {
      totalMessages: this.localMessages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      avgMessageLength: Math.round(avgMessageLength),
      topics,
      duration: Math.round(duration)
    };
  }

  /**
   * Exporta la memoria para análisis externo
   */
  exportMemoryForAnalysis(): {
    conversationId: string | null;
    stats: any;
    messages: ChatMessage[];
    config: MemoryConfig;
  } {
    return {
      conversationId: this.conversationId,
      stats: this.getConversationStats(),
      messages: [...this.localMessages],
      config: { ...this.config }
    };
  }

  /**
   * Importa memoria desde datos externos
   */
  importMemory(data: {
    messages: ChatMessage[];
    conversationId?: string;
  }): void {
    this.localMessages = data.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    
    if (data.conversationId) {
      this.conversationId = data.conversationId;
    }
    
    this.saveLocalMessages();
  }

  /**
   * Limpia mensajes antiguos manteniendo los más relevantes
   */
  async cleanupOldMessages(keepRecent: number = 20): Promise<void> {
    if (this.localMessages.length <= keepRecent) {
      return;
    }

    // Mantener los mensajes más recientes y algunos importantes
    const recentMessages = this.localMessages.slice(-keepRecent);
    const importantMessages = this.localMessages
      .slice(0, -keepRecent)
      .filter(msg => 
        msg.metadata?.important === true ||
        msg.role === 'system' ||
        msg.text.length > 200 // Mensajes largos probablemente importantes
      );

    this.localMessages = [...importantMessages, ...recentMessages]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    this.saveLocalMessages();
  }

  /**
   * Marca un mensaje como importante
   */
  markMessageAsImportant(messageId: string): void {
    const message = this.localMessages.find(msg => msg.id === messageId);
    if (message) {
      message.metadata = {
        ...message.metadata,
        important: true
      };
      this.saveLocalMessages();
    }
  }

  /**
   * Obtiene mensajes importantes
   */
  getImportantMessages(): ChatMessage[] {
    return this.localMessages.filter(msg => msg.metadata?.important === true);
  }
}

// =====================================================
// Instancia Singleton
// =====================================================

export const memoryService = new MemoryService();
