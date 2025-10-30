// =====================================================
// Servicio de n8n para Audio-Tutor Multi-Agente
// Cliente para webhook de n8n con contexto enriquecido
// =====================================================

import type { 
  ConversationContext, 
  N8nResponse, 
  SupabaseResponse 
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile 
} from '../types/pedagogical';

// =====================================================
// Configuración del Servicio
// =====================================================

interface N8nConfig {
  webhookUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: N8nConfig = {
  webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/rag-student-query',
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000 // 1 segundo
};

// =====================================================
// Cliente Principal de n8n
// =====================================================

export class N8nService {
  private config: N8nConfig;

  constructor(config: Partial<N8nConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Envía una consulta al webhook de n8n con contexto enriquecido
   */
  async sendQueryWithContext(
    query: string,
    context: ConversationContext
  ): Promise<SupabaseResponse<N8nResponse>> {
    const payload = {
      message: query,
      studentId: context.studentId,
      courseId: context.courseId,
      conversationId: context.conversationId,
      pedagogicalSettings: context.pedagogicalSettings,
      studentProfile: context.studentProfile,
      recentMessages: context.recentMessages.map(msg => ({
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp.toISOString()
      }))
    };

    return this.makeRequest(payload);
  }

  /**
   * Envía una consulta simple (sin contexto personalizado)
   */
  async sendSimpleQuery(
    query: string,
    courseId: string,
    studentId: string
  ): Promise<SupabaseResponse<N8nResponse>> {
    const payload = {
      message: query,
      studentId,
      courseId
    };

    return this.makeRequest(payload);
  }

  /**
   * Realiza la petición HTTP con retry logic
   */
  private async makeRequest(payload: any): Promise<SupabaseResponse<N8nResponse>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const parsedResponse = this.parseN8nResponse(data);

        return {
          data: parsedResponse,
          error: null,
          success: true
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        console.warn(`n8n request attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    return {
      data: null,
      error: lastError?.message || 'All retry attempts failed',
      success: false
    };
  }

  /**
   * Parsea la respuesta de n8n al formato esperado
   */
  private parseN8nResponse(data: any): N8nResponse {
    // Manejar diferentes formatos de respuesta de n8n
    if (data.success !== undefined) {
      return {
        success: data.success,
        message: data.message || data.answer || 'No response available',
        metadata: {
          model: data.metadata?.model || 'gemini-2.5-flash',
          source: data.metadata?.source || 'Tutor Virtual AI',
          contextUsed: data.metadata?.contextUsed || 'No context used',
          timestamp: data.metadata?.timestamp || new Date().toISOString()
        }
      };
    }

    // Fallback para respuestas en formato diferente
    return {
      success: true,
      message: data.message || data.answer || data.text || 'No response available',
      metadata: {
        model: 'gemini-2.5-flash',
        source: 'Tutor Virtual AI',
        contextUsed: 'Unknown',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Utilidad para delay entre reintentos
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica si el servicio de n8n está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.warn('n8n health check failed:', error);
      return false;
    }
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(newConfig: Partial<N8nConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// =====================================================
// Instancia Singleton
// =====================================================

export const n8nService = new N8nService();

// =====================================================
// Funciones de Utilidad
// =====================================================

/**
 * Crea un contexto de conversación para n8n
 */
export const createConversationContext = (
  studentId: string,
  courseId: string,
  conversationId: string,
  pedagogicalSettings: PedagogicalSettings,
  studentProfile: StudentProfile,
  recentMessages: any[]
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
      text: msg.text || msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      metadata: msg.metadata || {}
    }))
  };
};

/**
 * Valida si una respuesta de n8n es válida
 */
export const isValidN8nResponse = (response: any): response is N8nResponse => {
  return (
    response &&
    typeof response.success === 'boolean' &&
    typeof response.message === 'string' &&
    response.metadata &&
    typeof response.metadata.model === 'string'
  );
};

/**
 * Extrae el contexto usado de la respuesta de n8n
 */
export const extractContextUsed = (response: N8nResponse): string => {
  return response.metadata.contextUsed || 'No context information available';
};

/**
 * Obtiene información de debugging de la respuesta
 */
export const getDebugInfo = (response: N8nResponse) => {
  return {
    model: response.metadata.model,
    source: response.metadata.source,
    timestamp: response.metadata.timestamp,
    contextLength: response.metadata.contextUsed?.length || 0,
    success: response.success
  };
};
