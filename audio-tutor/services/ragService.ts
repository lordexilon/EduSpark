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
import { aiUsageService } from '../../services/aiUsageService';

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
  type: 'course' | 'chapter' | 'lesson' | 'exercise' | 'material' | 'unit' | 'session';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  // Información adicional para enlaces
  originalId?: string; // ID original de la tabla (UUID)
  url?: string; // URL del material si existe
  unitId?: string; // ID de la unidad asociada
  sessionId?: string; // ID de la sesión asociada
  courseId?: string; // ID del curso
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
  private currentContext: ConversationContext | null = null;

  async processQueryWithContext(
    query: string,
    context: ConversationContext
  ): Promise<SupabaseResponse<RAGResponse>> {
    // Guardar contexto para uso posterior en registro de tokens
    this.currentContext = context;
    
    try {
      console.log('📚 RAGService.processQueryWithContext - Context recibido:', {
        courseId: context.courseId,
        moduleId: context.moduleId,
        studentId: context.studentId,
        queryLength: query.length
      });
      
      // 1. Obtener contenido relevante del curso
      const relevantContent = await this.getRelevantContent(
        query, 
        context.courseId,
        context.studentProfile,
        context.moduleId
      );
      
      console.log('📦 RAGService - Contenido relevante encontrado:', {
        count: relevantContent.length,
        titles: relevantContent.map(c => c.title)
      });

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

      // Cargar unidades del curso
      let unitsData: any[] = [];
      try {
        const { data: units, error: unitsError } = await supabase
          .from('course_units')
          .select('id, number, title, description')
          .eq('course_id', courseIdInt)
          .order('number', { ascending: true });
        
        if (unitsError) {
          console.warn('RAGService - Error cargando unidades:', unitsError);
        } else {
          unitsData = units || [];
          console.log('RAGService - Unidades cargadas:', unitsData.length);
        }
      } catch (unitsErr) {
        console.warn('RAGService - Error cargando unidades:', unitsErr);
      }

      // Cargar sesiones del curso
      let sessionsData: any[] = [];
      try {
        let sessionsQuery = supabase
          .from('sessions')
          .select('id, title, description, starts_at, ends_at, unit_id')
          .eq('course_id', courseIdInt);
        
        // Filtrar por unidad si se especifica moduleId (asumiendo que moduleId es unit_id)
        if (moduleId) {
          sessionsQuery = sessionsQuery.eq('unit_id', moduleId);
        }
        
        const { data: sessions, error: sessionsError } = await sessionsQuery
          .order('starts_at', { ascending: true });
        
        if (sessionsError) {
          console.warn('RAGService - Error cargando sesiones:', sessionsError);
        } else {
          sessionsData = sessions || [];
          console.log('RAGService - Sesiones cargadas:', sessionsData.length);
        }
      } catch (sessionsErr) {
        console.warn('RAGService - Error cargando sesiones:', sessionsErr);
      }

      // Buscar en materiales de la tabla materials
      let materialsFromTable: any[] = [];
      try {
        let materialsQuery = supabase
          .from('materials')
          .select('id, title, kind, url, metadata, unit_id, session_id')
          .eq('course_id', courseIdInt);
        
        // Filtrar por unidad si se especifica
        if (moduleId) {
          materialsQuery = materialsQuery.eq('unit_id', moduleId);
        }
        
        const { data: materials, error: materialsError } = await materialsQuery
          .order('created_at', { ascending: true })
          .limit(50);
        
        if (materialsError) {
          console.warn('RAGService - Error cargando materials:', materialsError);
        } else {
          materialsFromTable = materials || [];
          console.log('RAGService - Materiales de tabla materials cargados:', materialsFromTable.length);
        }
      } catch (materialsErr) {
        console.warn('RAGService - Error cargando materials:', materialsErr);
      }

      // Buscar en materiales adicionales de course_materials (si existen)
      let materialsData: any[] | null = null;
      try {
        let query = supabase
          .from('course_materials')
          .select('*')
          .eq('course_id', courseIdInt);
        
        // Filtrar por módulo si se especifica
        if (moduleId) {
          const moduleIdInt = parseInt(String(moduleId), 10);
          if (!isNaN(moduleIdInt)) {
            query = query.eq('module_id', moduleIdInt);
            console.log('RAGService - Filtrando materiales por module_id:', moduleIdInt);
          }
        }
        
        const { data, error } = await query.limit(50);
        
        if (error) {
          console.warn('RAGService - course_materials query warning:', error);
          materialsData = [];
        } else {
          materialsData = data || [];
          console.log('RAGService - Materiales de course_materials cargados:', materialsData.length);
        }
      } catch (matErr) {
        console.warn('RAGService - course_materials query failed, continuando sin materiales:', matErr);
        materialsData = [];
      }

      // Combinar todos los materiales
      let materials = materialsData || [];

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
        // Agregar unidades como contenido
        ...unitsData.map((unit: any) => ({
          id: `unit-${unit.id}`,
          title: `Unidad ${unit.number}: ${unit.title}`,
          content: unit.description || unit.title || '',
          type: 'unit' as const,
          difficulty: 'intermediate' as const,
          topics: this.extractTopics(unit.description || unit.title || ''),
          originalId: unit.id,
          courseId: courseIdInt.toString()
        })),
        // Agregar sesiones como contenido
        ...sessionsData.map((session: any) => {
          const unitTitle = unitsData.find(u => u.id === session.unit_id)?.title || '';
          const sessionContent = `Sesión: ${session.title}. ${session.description || ''}${unitTitle ? ` (Unidad: ${unitTitle})` : ''}`;
          return {
            id: `session-${session.id}`,
            title: session.title,
            content: sessionContent,
            type: 'session' as const,
            difficulty: 'intermediate' as const,
            topics: this.extractTopics(sessionContent),
            originalId: session.id,
            unitId: session.unit_id,
            courseId: courseIdInt.toString()
          };
        }),
        // Agregar materiales de la tabla materials
        ...materialsFromTable.map((material: any) => {
          const unitTitle = unitsData.find(u => u.id === material.unit_id)?.title || '';
          const sessionTitle = sessionsData.find(s => s.id === material.session_id)?.title || '';
          let contentText = material.title;
          
          if (material.metadata && typeof material.metadata === 'object') {
            const metadataStr = JSON.stringify(material.metadata);
            contentText += ` ${metadataStr}`;
          }
          
          if (material.url) {
            contentText += ` URL: ${material.url}`;
          }
          
          if (unitTitle) {
            contentText += ` (Unidad: ${unitTitle})`;
          }
          
          if (sessionTitle) {
            contentText += ` (Sesión: ${sessionTitle})`;
          }
          
          return {
            id: `material-${material.id}`,
            title: material.title,
            content: contentText,
            type: (material.kind || 'material') as const,
            difficulty: 'intermediate' as const,
            topics: this.extractTopics(contentText),
            originalId: material.id,
            url: material.url,
            unitId: material.unit_id,
            sessionId: material.session_id,
            courseId: courseIdInt.toString()
          };
        }),
        // Agregar materiales de course_materials
        ...materials.map((material: any) => {
          // Si no hay contenido de texto pero hay URL, crear un contenido descriptivo
          let contentText = material.content || '';
          
          if (!contentText && (material.file_url || material.source_url)) {
            const url = material.file_url || material.source_url;
            const urlType = this.detectUrlType(url);
            
            // Crear contenido descriptivo basado en el tipo de URL
            if (urlType === 'youtube') {
              contentText = `Video de YouTube: ${material.title}. URL: ${url}. Este video contiene información relevante sobre el tema.`;
            } else if (urlType === 'pdf') {
              contentText = `Documento PDF: ${material.title}. URL: ${url}. Este documento contiene información sobre el tema.`;
            } else if (urlType === 'document') {
              contentText = `Documento: ${material.title}. URL: ${url}. Este recurso contiene información relevante sobre el tema.`;
            } else {
              contentText = `Recurso externo: ${material.title}. URL: ${url}. Este material contiene información sobre el tema.`;
            }
          }
          
          // Incluir URL en el contenido si existe y no está ya mencionada
          if ((material.file_url || material.source_url) && contentText && !contentText.includes(material.file_url || material.source_url || '')) {
            contentText += ` URL disponible: ${material.file_url || material.source_url}`;
          }
          
          return {
            id: material.id,
            title: material.title,
            content: contentText || material.title || 'Material sin descripción',
            type: material.type || 'material',
            difficulty: material.difficulty || 'intermediate',
            topics: this.extractTopics(contentText || material.title || '')
          };
        })
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
   * Detecta el tipo de URL
   */
  private detectUrlType(url: string): 'youtube' | 'pdf' | 'document' | 'other' {
    if (!url) return 'other';
    
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube';
    }
    if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf')) {
      return 'pdf';
    }
    if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com') || lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx')) {
      return 'document';
    }
    return 'other';
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
      ? `\n- Módulo específico: Prioriza materiales y conceptos del módulo ID ${context.moduleId}`
      : '';

    // Historial reciente
    const recentContext = recentMessages.length > 0
      ? `\nConversación reciente:\n${recentMessages.slice(-3).map(msg => 
          `${msg.role}: ${msg.text}`
        ).join('\n')}`
      : '';

    return `
Eres un tutor virtual ESPECIALIZADO EXCLUSIVAMENTE en el curso "${courseTitle}". 

IMPORTANTE: Solo debes responder preguntas y dar información sobre "${courseTitle}". 
NO debes mencionar, referenciar o involucrar otros cursos, materias o temas que NO pertenezcan a "${courseTitle}".
Si el estudiante pregunta sobre algo que no está en este curso, di claramente que esa información pertenece a otro curso y enfócate solo en ${courseTitle}.

INFORMACIÓN DEL CURSO ACTUAL:
- Título del curso: ${courseTitle}
- Descripción: ${courseDescription.substring(0, 200)}...
${moduleHint}

${studentInfo}
${pedagogicalInfo}
${contentInfo}
${recentContext}

Consulta del estudiante: ${query}

INSTRUCCIONES ESPECÍFICAS DE FORMATO:
1. Responde ÚNICAMENTE sobre "${courseTitle}" - NO menciones otros cursos
2. Adapta tu respuesta al estilo de aprendizaje del estudiante
3. USA SIEMPRE el contenido específico del curso "${courseTitle}" cuando sea relevante
4. Referencia ÚNICAMENTE materiales, conceptos y temas de "${courseTitle}"
5. Si el estudiante pregunta sobre otro tema/curso, redirige suavemente hacia ${courseTitle}
6. Mantén un tono amigable y motivador
7. IDIOMA: Responde SIEMPRE en el mismo idioma en que el estudiante te pregunta. Si pregunta en inglés, responde en inglés; si pregunta en español, responde en español.

FORMATO DE RESPUESTA (USA MARKDOWN):
- Usa **negritas** para conceptos clave y términos importantes
- Usa *cursiva* para énfasis sutil
- Usa listas con viñetas (-) o numeradas (1., 2., 3.) para organizar información
- Usa > para citas o llamados importantes
- Usa ## para títulos de secciones si la respuesta es extensa
- Usa código entre backticks para fórmulas matemáticas o términos técnicos
- Separa párrafos con líneas en blanco para mejorar legibilidad
- Máximo 150 palabras, estructura clara y concisa

EJEMPLO DE BUEN FORMATO:
**Concepto Principal**

Explicación breve del concepto. Puntos clave:
- Punto importante 1
- Punto importante 2
- Punto importante 3

> Nota importante o consejo práctico

Respuesta:
`;
  }

  /**
   * Genera respuesta usando Gemini con reintentos automáticos
   */
  private async generateResponse(prompt: string): Promise<string> {
    const maxRetries = 2; // 2 reintentos para manejar mejor MAX_TOKENS
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
                maxOutputTokens: attempt === 1 ? 2048 : 1024  // Más tokens en el primer intento para evitar MAX_TOKENS
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
        
        // Extraer texto - intentar diferentes estructuras posibles
        let text = candidate?.content?.parts?.[0]?.text;
        if (!text && candidate?.content?.parts) {
          // Buscar en todos los parts
          for (const part of candidate.content.parts) {
            if (part.text) {
              text = part.text;
              break;
            }
          }
        }
        
        // Verificar finishReason (permitir MAX_TOKENS y STOP)
        const finishReason = candidate?.finishReason;
        if (finishReason) {
          console.warn('⚠️ Gemini finish reason:', finishReason);
          if (finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
            lastError = new Error(`Gemini bloqueó la respuesta: ${finishReason}`);
            continue;
          }
          this.lastFinishReason = finishReason;
          
          // Si es MAX_TOKENS y no hay texto, intentar usar un mensaje útil
          if (finishReason === 'MAX_TOKENS' && !text) {
            console.warn('⚠️ MAX_TOKENS alcanzado sin texto. Intentando reintento con configuración ajustada...');
            // Si es el primer intento, aumentar maxOutputTokens y reintentar
            if (attempt === 1) {
              // No hacer nada, continuar al siguiente intento con la misma config
              continue;
            }
            // Si ya fue el segundo intento, devolver mensaje útil
            text = 'La respuesta fue demasiado larga. Por favor, intenta hacer una pregunta más específica o divide tu consulta en partes más pequeñas.';
          }
        }
        
        if (!text) {
          console.error('❌ Gemini no devolvió texto. Full response:', JSON.stringify(data, null, 2));
          console.error('❌ Candidate structure:', JSON.stringify(candidate, null, 2));
          lastError = new Error('No se pudo generar respuesta - estructura de respuesta inesperada');
          continue;
        }

        // Registrar uso de tokens (localStorage + BD)
        const usageMetadata = data.usageMetadata;
        let inputTokens = 0;
        let outputTokens = 0;
        
        if (usageMetadata) {
          inputTokens = usageMetadata.promptTokenCount || 0;
          outputTokens = usageMetadata.candidatesTokenCount || 0;
        } else {
          // Estimación si no hay metadata
          inputTokens = Math.ceil(prompt.length / 4);
          outputTokens = Math.ceil((text?.length || 100) / 4);
        }
        
        // Registrar en localStorage (sistema existente)
        tokenMonitoring.recordTokenUsage(
          inputTokens,
          outputTokens,
          this.model,
          `rag_${Date.now()}`
        );
        
        // Registrar en BD para reportes de administración
        try {
          if (this.currentContext?.studentId) {
            await aiUsageService.recordUsage({
              userId: this.currentContext.studentId,
              courseId: this.currentContext.courseId ? parseInt(this.currentContext.courseId) : undefined,
              sessionId: this.currentContext.sessionId,
              model: this.model,
              requestType: 'chat',
              conversationId: this.currentContext.conversationId,
              inputTokens,
              outputTokens,
              requestId: `rag_${Date.now()}`,
              metadata: {
                promptLength: prompt.length,
                responseLength: text?.length || 0
              }
            });
          }
        } catch (error) {
          // No fallar si no se puede guardar en BD
          console.warn('⚠️ No se pudo registrar uso en BD:', error);
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
          .map((s: any) => ({
            id: s.originalId || s.id,
            title: s.title,
            url: s.url || s.file_url || s.source_url || null,
            type: s.type || 'material',
            unitId: s.unitId || null,
            sessionId: s.sessionId || null,
            courseId: s.courseId || null
          })),
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

