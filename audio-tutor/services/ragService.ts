// =====================================================
// Servicio RAG Directo con A2A (Agent-to-Agent)
// Reemplaza n8n para consultas RAG en Audio-Tutor
// =====================================================

import type { 
  ConversationContext, 
  SupabaseResponse 
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile 
} from '../types/pedagogical';
import { supabase } from '../lib/supabase-shared';
import { resolveGeminiApiKey } from '../utils/env';
import { tokenMonitoring } from './tokenMonitoringService';

// =====================================================
// Tipos y Interfaces
// =====================================================

interface RAGResponse {
  success: boolean;
  message: string;
  metadata: {
    model: string;
    source: string;
    contextUsed: string;
    timestamp: string;
    confidence?: number;
    sources?: string[];
    // Nuevos metadatos para UI
    truncated?: boolean;
    continuationHint?: string;
  };
}

interface CourseContent {
  id: string;
  title: string;
  content: string;
  type: 'chapter' | 'lesson' | 'exercise' | 'material';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
}

// =====================================================
// Servicio RAG Principal
// =====================================================

export class RAGService {
  private readonly model = 'gemini-2.5-flash';  // Modelo actual disponible
  private readonly maxContextLength = 4000;
  private readonly maxSources = 5;
  private lastFinishReason: string | null = null;
  private lastResponseTail: string | null = null;

  /**
   * Procesa una consulta RAG con contexto personalizado
   */
  async processQueryWithContext(
    query: string,
    context: ConversationContext
  ): Promise<SupabaseResponse<RAGResponse>> {
    try {
      // 1. Obtener contenido relevante del curso
      const relevantContent = await this.getRelevantContent(
        query, 
        context.courseId,
        context.studentProfile,
        context.moduleId
      );

      // 2. Construir prompt personalizado
      const personalizedPrompt = this.buildPersonalizedPrompt(
        query,
        context,
        relevantContent
      );

      // 3. Generar respuesta con Gemini
      const response = await this.generateResponse(personalizedPrompt);

      // 4. Procesar y formatear respuesta
      const ragResponse = this.formatRAGResponse(response, relevantContent);

      return {
        data: ragResponse,
        error: null,
        success: true
      };

    } catch (error) {
      console.error('Error in RAG processing:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Obtiene contenido relevante del curso basado en la consulta
   */
  private async getRelevantContent(
    query: string, 
    courseId: string, 
    studentProfile: StudentProfile,
    moduleId?: string
  ): Promise<CourseContent[]> {
    try {
      console.log('RAGService - getRelevantContent:', { query, courseId, studentProfile });
      
      // Convertir courseId a INTEGER
      const courseIdInt = parseInt(courseId, 10);
      if (isNaN(courseIdInt)) {
        console.warn('Invalid course ID:', courseId);
        return [];
      }
      
      console.log('RAGService - courseIdInt:', courseIdInt);

      // Buscar en contenido del curso
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, code')
        .eq('id', courseIdInt)
        .single();

      if (courseError) {
        console.warn('Error fetching course data:', courseError);
        return [];
      }

      console.log('RAGService - Course data loaded:', courseData);

      // Buscar en materiales adicionales (si existen)
      let materialsData: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('course_materials')
          .select('*')
          .eq('course_id', courseIdInt)
          .limit(50);
        if (error) {
          console.warn('RAGService - course_materials query warning:', error);
          materialsData = [];
        } else {
          materialsData = data || [];
        }
      } catch (matErr) {
        console.warn('RAGService - course_materials query failed, continuando sin materiales:', matErr);
        materialsData = [];
      }

      let materials = materialsData || [];
      // Filtro por módulo (si columna existe en datos)
      if (moduleId) {
        materials = materials.filter((m: any) => 'module_id' in m ? String(m.module_id) === String(moduleId) : true);
      }

      // Simular búsqueda semántica simple (en producción usar embeddings)
      const allContent: CourseContent[] = [
        {
          id: courseData.id.toString(),
          title: courseData.title,
          content: courseData.description || '',
          type: 'chapter',
          difficulty: 'intermediate',
          topics: this.extractTopics(courseData.description || '')
        },
        ...materials.map((material: any) => ({
          id: material.id,
          title: material.title,
          content: material.content || '',
          type: material.type || 'material',
          difficulty: material.difficulty || 'intermediate',
          topics: this.extractTopics(material.content || '')
        }))
      ];

      // Filtrar por relevancia simple (en producción usar embeddings)
      return this.filterRelevantContent(query, allContent);

    } catch (error) {
      console.error('Error getting relevant content:', error);
      return [];
    }
  }

  /**
   * Filtra contenido por relevancia simple
   */
  private filterRelevantContent(query: string, content: CourseContent[]): CourseContent[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    return content
      .map(item => ({
        ...item,
        relevanceScore: this.calculateRelevanceScore(queryWords, item)
      }))
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.maxSources)
      .map(({ relevanceScore, ...item }) => item);
  }

  /**
   * Calcula puntuación de relevancia simple
   */
  private calculateRelevanceScore(queryWords: string[], content: CourseContent): number {
    const text = `${content.title} ${content.content}`.toLowerCase();
    let score = 0;
    
    queryWords.forEach(word => {
      if (text.includes(word)) {
        score += 1;
      }
      // Bonus por coincidencia en título
      if (content.title.toLowerCase().includes(word)) {
        score += 2;
      }
    });
    
    return score;
  }

  /**
   * Extrae temas del contenido
   */
  private extractTopics(content: string): string[] {
    // Extracción simple de temas (en producción usar NLP)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Contar frecuencia y devolver los más comunes
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Construye prompt personalizado basado en contexto
   */
  private buildPersonalizedPrompt(
    query: string,
    context: ConversationContext,
    relevantContent: CourseContent[]
  ): string {
    const { pedagogicalSettings, studentProfile, recentMessages } = context;
    
    // Información del estudiante
    const studentInfo = `
Estudiante: ${studentProfile.preferredLearningStyle} learner
Dificultad preferida: ${studentProfile.difficultyPreference || 'intermediate'}
Temas dominados: ${studentProfile.topicsMastered?.join(', ') || 'ninguno'}
Temas con dificultad: ${studentProfile.topicsStruggled?.join(', ') || 'ninguno'}
`;

    // Configuración pedagógica
    const pedagogicalInfo = `
Configuración pedagógica:
- Estilo de enseñanza: ${pedagogicalSettings.teachingStyle}
- Nivel de dificultad: ${pedagogicalSettings.difficultyLevel}
- Tipo de feedback: ${pedagogicalSettings.feedbackType}
- Enfoque: ${pedagogicalSettings.focusArea}
`;

    // Información del curso
    const courseInfo = relevantContent.find(item => item.type === 'course');
    const courseTitle = courseInfo?.title || 'este curso';
    const courseDescription = courseInfo?.content || '';

    // Contenido relevante (reducido para evitar MAX_TOKENS)
    const maxItems = 3;
    const contentInfo = relevantContent.length > 0 
      ? `\nINFORMACIÓN DEL CURSO:\n- Título: ${courseTitle}\n- Descripción: ${courseDescription.substring(0, 200)}...\n\nCONTENIDO RELEVANTE DEL CURSO (máx ${maxItems}):\n${relevantContent
          .filter(item => item.type !== 'course')
          .slice(0, maxItems)
          .map(item => `- ${item.title}: ${item.content.substring(0, 120)}...`)
          .join('\n')}`
      : '\nNo se encontró contenido específico del curso.';

    const moduleHint = context.moduleId 
      ? `\nContexto del módulo: Prioriza materiales y conceptos del módulo ID ${context.moduleId}. Si hay conflicto, responde solo con lo contenido en dicho módulo y luego, opcionalmente, agrega referencias del curso completo.`
      : '';

    // Historial reciente
    const recentContext = recentMessages.length > 0
      ? `\nConversación reciente:\n${recentMessages.slice(-3).map(msg => 
          `${msg.role}: ${msg.text}`
        ).join('\n')}`
      : '';

    return `
Eres un tutor virtual especializado en ${courseTitle}. Responde la consulta del estudiante de manera clara, educativa y específica para este curso.

${studentInfo}
${pedagogicalInfo}
${contentInfo}
${recentContext}
${moduleHint}

Consulta del estudiante: ${query}

INSTRUCCIONES ESPECÍFICAS:
1. Responde de manera clara y educativa específica para ${courseTitle}
2. Adapta tu respuesta al estilo de aprendizaje del estudiante
3. USA SIEMPRE el contenido específico del curso cuando sea relevante
4. Referencia materiales, conceptos y temas de ${courseTitle}
5. Mantén un tono amigable y motivador
6. Si no tienes información específica del curso, sé honesto pero útil
7. Máximo 120 palabras

Respuesta:
`;
  }

  /**
   * Genera respuesta usando Gemini con reintentos automáticos
   */
  private async generateResponse(prompt: string): Promise<string> {
    const maxRetries = 1; // Solo 1 reintento para máxima velocidad
    let lastError: Error | null = null;

    // Fallback inmediato si no hay API key
    const { key, missing } = resolveGeminiApiKey();
    if (missing || !key) {
      return 'Lo siento, no tengo acceso a Gemini ahora mismo. Intentaré responder mejor cuando el servicio esté disponible.';
    }

    // Timeout de emergencia para toda la función
    const emergencyTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout de emergencia en generateResponse');
    }, 20000); // 20 segundos máximo total

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // Reducido a 15s para respuestas más rápidas

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                temperature: 0.7, 
                topK: 40, 
                topP: 0.95, 
                maxOutputTokens: 1024  // Reducido para respuestas más rápidas
              }
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No se pudo leer el error');
          console.error(`❌ Gemini API Error ${response.status}:`, errorText);
          if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 500 * attempt)); // Delay más corto
            continue;
          }
          if (response.status === 400) {
            lastError = new Error(`API Key inválida o request malformado: ${errorText}`);
            break;
          }
          lastError = new Error(`Gemini API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log('🔍 Gemini response data:', JSON.stringify(data, null, 2));
        
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        
        // Verificar finishReason (permitir MAX_TOKENS y STOP)
        if (candidate?.finishReason) {
          console.warn('⚠️ Gemini finish reason:', candidate.finishReason);
          if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
            lastError = new Error(`Gemini bloqueó la respuesta: ${candidate.finishReason}`);
            continue;
          }
          this.lastFinishReason = candidate.finishReason;
        }
        
        if (!text) {
          console.error('❌ Gemini no devolvió texto. Full response:', data);
          lastError = new Error('No se pudo generar respuesta');
          continue;
        }

        // Registrar uso de tokens
        const usageMetadata = data.usageMetadata;
        if (usageMetadata) {
          tokenMonitoring.recordTokenUsage(
            usageMetadata.promptTokenCount || 0,
            usageMetadata.candidatesTokenCount || 0,
            this.model,
            `rag_${Date.now()}`
          );
        } else {
          // Estimación si no hay metadata
          const estimatedInputTokens = Math.ceil(prompt.length / 4);
          const estimatedOutputTokens = Math.ceil((text?.length || 100) / 4);
          tokenMonitoring.recordTokenUsage(
            estimatedInputTokens,
            estimatedOutputTokens,
            this.model,
            `rag_${Date.now()}`
          );
        }

        clearTimeout(emergencyTimeout);
        try { this.lastResponseTail = text.slice(-200); } catch {}
        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 300 * attempt)); // Delay más corto
        }
      }
    }

    clearTimeout(emergencyTimeout);
    console.error('Error generating response after retries:', lastError);
    return 'Lo siento, estoy teniendo problemas para generar una respuesta ahora mismo. Inténtalo nuevamente en unos minutos.';
  }

  /**
   * Formatea la respuesta RAG
   */
  private formatRAGResponse(
    response: string, 
    sources: CourseContent[]
  ): RAGResponse {
    return {
      success: true,
      message: response,
      metadata: {
        model: this.model,
        source: 'A2A RAG Service',
        contextUsed: sources.map(s => s.title).join(', '),
        timestamp: new Date().toISOString(),
        confidence: 0.8, // Simulado
        sources: (sources || [])
          .filter((s: any) => s && s.title)
          .map((s: any) => ({ id: s.id, title: s.title, url: s.file_url || s.source_url || null })),
        // Nuevos metadatos para UI
        truncated: (this as any).lastFinishReason === 'MAX_TOKENS',
        continuationHint: (this as any).lastResponseTail || ''
      } as any
    } as any;
  }

  /**
   * Verifica si el servicio está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { missing } = resolveGeminiApiKey();
      return !missing;
    } catch (error) {
      return false;
    }
  }
}

// =====================================================
// Instancia Singleton
// =====================================================

export const ragService = new RAGService();

// =====================================================
// Funciones de Utilidad
// =====================================================

/**
 * Crea contexto de conversación para RAG
 */
export const createRAGContext = (
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
 * Valida respuesta RAG
 */
export const isValidRAGResponse = (response: any): response is RAGResponse => {
  return (
    response &&
    typeof response.success === 'boolean' &&
    typeof response.message === 'string' &&
    response.metadata &&
    typeof response.metadata.model === 'string'
  );
};
