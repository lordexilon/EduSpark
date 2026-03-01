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
import { supabase } from "../lib/supabase-shared";
import { resolveGeminiApiKey } from '../utils/env';
import { tokenMonitoring } from './tokenMonitoringService';
import { aiUsageService } from '../../../services/aiUsageService';

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
  // Metadata para citas (de archivos procesados)
  metadata?: {
    sourceFileName?: string;
    material_id?: string; // ID del material en la tabla materials
    material_title?: string; // Título del material
    pageStart?: number;
    pageEnd?: number;
    page_start?: number; // Alias para compatibilidad
    page_end?: number; // Alias para compatibilidad
    pdfType?: string;
    ocrUsed?: boolean;
    category?: string;
  };
}

// =====================================================
// Configuración de Materiales Prioritarios por Curso
// =====================================================

/**
 * Materiales prioritarios por curso ID
 * Estos materiales se priorizan en las búsquedas RAG
 * para mejorar la relevancia de resultados específicos
 */
const PRIORITY_MATERIALS: Record<number, string[]> = {
  // Curso 12: Ginecología-Obstetricia
  12: [
    'Williams Gineco.pdf',
    'Williams Ginecología',
    'Williams Obstetricia',
    'Williams Obstetricia 25a Edicion.pdf'
  ],
};

// =====================================================
// Servicio RAG Principal
// =====================================================

export class RAGService {
  private readonly model = 'gemini-2.5-flash';
  private readonly maxContextLength = 200000;
  private readonly maxSources = 20;
  private readonly maxOutputTokens = 2048;
  private lastFinishReason: string | null = null;
  private lastResponseTail: string | null = null;

  // Caché mejorado
  private responseCache: Map<string, { data: any; timestamp: number }> = new Map();
  private embeddingCache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  // Mapa de Cache de Contexto de Gemini (Key = Hash del Contexto, Value = Nombre del Recurso en Google)
  private contextCache: Map<string, { name: string; expiration: string }> = new Map();

  private readonly RESPONSE_CACHE_TTL = 30 * 60 * 1000;
  private readonly EMBEDDING_CACHE_TTL = 24 * 60 * 60 * 1000;
  private readonly MAX_CACHE_SIZE = 500;

  private currentContext: ConversationContext | null = null;

  /**
   * Procesa una consulta RAG con contexto personalizado
   */
  async processQueryWithContext(
    query: string,
    context: ConversationContext
  ): Promise<SupabaseResponse<RAGResponse>> {
    this.currentContext = context;

    try {
      console.log('📚 RAGService.processQueryWithContext', { courseId: context.courseId });

      let userQuestion = query;
      if (query.includes('Pregunta del estudiante:')) {
        const match = query.match(/Pregunta del estudiante:\s*(.+?)(?:\n\n|$)/s);
        if (match && match[1]) userQuestion = match[1].trim();
      }

      // 0. Límites
      if (context.studentId) {
        const estimatedCost = tokenMonitoring.estimateCost(query, this.model);
        const { data: limitsCheck } = await supabase.rpc('check_user_query_limits', {
          p_user_id: context.studentId,
          p_estimated_cost: estimatedCost.estimatedCost
        });
        if (limitsCheck && !limitsCheck.can_proceed) {
          return { success: false, error: limitsCheck.message || 'Límite alcanzado', data: null };
        }
      }

      // 1. Caché
      const cacheKey = this.generateCacheKey(query, context);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) return cachedResponse;

      // 2. Intención
      if (this.isGeneralQuery(userQuestion.toLowerCase().trim())) {
        const fastPrompt = `Eres EduSpark. Responde brevemente: "${userQuestion}"`;
        const response = await this.generateResponse(fastPrompt);
        return { data: this.formatRAGResponse(response, []), error: null, success: true };
      }

      // 3. Contenido
      const pageRange = this.detectPageRange(userQuestion);

      // Obtener estructura básica del curso (siempre útil)
      const courseIdInt = parseInt(context.courseId, 10);
      const [{ data: courseInfo }, { data: courseUnits }] = await Promise.all([
        supabase.from('courses').select('title, description').eq('id', courseIdInt).single(),
        supabase.from('course_units').select('number, title').eq('course_id', courseIdInt).order('number', { ascending: true })
      ]);

      const courseSummary = {
        title: courseInfo?.title || 'Curso',
        description: courseInfo?.description || '',
        units: (courseUnits || []).map(u => `Unidad ${u.number}: ${u.title}`)
      };

      const relevantContent = await this.getRelevantContent(
        userQuestion,
        context.courseId,
        context.studentProfile,
        context.moduleId
      );

      // 4. Prompt y Respuesta
      const personalizedPrompt = this.buildPersonalizedPrompt(query, context, relevantContent, !!pageRange, courseSummary);
      const response = await this.generateResponse(personalizedPrompt);
      const ragResponse = this.formatRAGResponse(response, relevantContent);

      this.saveToCache(cacheKey, { data: ragResponse, error: null, success: true });
      return { data: ragResponse, error: null, success: true };

    } catch (error) {
      console.error('RAG Error:', error);
      return { data: null, error: String(error), success: false };
    }
  }

  /**
   * Obtiene contenido relevante del curso
   */
  private async getRelevantContent(
    query: string,
    courseId: string,
    studentProfile: StudentProfile,
    moduleId?: string
  ): Promise<CourseContent[]> {
    try {
      const courseIdInt = parseInt(courseId, 10);
      const pageRange = this.detectPageRange(query);
      const startTime = Date.now();

      const promises = [
        this.searchChunksByText(query, courseIdInt),
        supabase.from('courses').select('id, title, description').eq('id', courseIdInt).single(),
        supabase.from('course_units').select('id, number, title, description, content_html').eq('course_id', courseIdInt),
        this.fetchSessionsWithFilter(courseIdInt, moduleId),
        this.fetchMaterialsWithFilter(courseIdInt, moduleId),
        this.fetchCourseMaterialsWithFilter(courseIdInt, moduleId)
      ];

      const [textSearchData, courseRes, unitsRes, sessionsRes, materialsRes, courseMaterialsRes] = await Promise.all(promises);
      console.log(`⏱️ Data loaded in ${Date.now() - startTime}ms`);

      let vectorChunks: CourseContent[] = [];
      const { chunks: textChunksQueryResult, error: textError } = textSearchData as { chunks: any[], error: any };
      let textChunks = textChunksQueryResult || [];

      if (!textError && textChunks.length > 0) {
        // Boost Prioritarios
        const priorityChunks = textChunks.filter(c => this.isPriorityMaterial(c, courseIdInt));
        const otherChunks = textChunks.filter(c => !this.isPriorityMaterial(c, courseIdInt));
        textChunks = [...priorityChunks, ...otherChunks].slice(0, 15);

        // Fetch material titles
        const materialIds = [...new Set(textChunks.map(c => c.metadata?.material_id).filter(Boolean))];
        let materialTitles: Record<string, string> = {};
        if (materialIds.length > 0) {
          const { data: materials } = await supabase.from('materials').select('id, title').in('id', materialIds);
          if (materials) materialTitles = materials.reduce((acc: any, m: any) => ({ ...acc, [m.id]: m.title }), {});
        }

        vectorChunks = textChunks.map(chunk => ({
          id: `chunk-${chunk.id}`,
          title: materialTitles[chunk.metadata?.material_id] || chunk.metadata?.sourceFileName || 'Documento',
          content: chunk.content,
          type: 'material',
          difficulty: 'intermediate',
          topics: this.extractTopics(chunk.content),
          originalId: chunk.id,
          courseId,
          metadata: {
            ...chunk.metadata,
            material_title: materialTitles[chunk.metadata?.material_id]
          }
        }));

        // Búsqueda expandida por páginas
        if (pageRange) {
          const expanded = await this.searchChunksInPageRange(query, courseIdInt, pageRange.start, pageRange.end);
          const existingIds = new Set(vectorChunks.map(c => c.originalId));
          vectorChunks = [...vectorChunks, ...expanded.filter(c => !existingIds.has(c.originalId))];
        }
      }

      // Fallback vectorial if needed
      if (vectorChunks.length < 2) {
        const { key } = resolveGeminiApiKey();
        if (key) {
          const embedding = await this.getQueryEmbedding(query, key);
          if (embedding) {
            const { data: vChunks } = await supabase.rpc('search_course_content_chunks', {
              query_embedding: `[${embedding.join(',')}]`,
              course_id_param: courseId,
              match_threshold: 0.1,
              match_count: 15
            });
            if (vChunks) {
              const vectorResults = vChunks.map((chunk: any) => ({
                id: `chunk-v-${chunk.id}`,
                title: chunk.metadata?.sourceFileName || 'Documento Vectorial',
                content: chunk.content,
                type: 'material' as const,
                difficulty: 'intermediate' as const,
                topics: this.extractTopics(chunk.content),
                originalId: chunk.id,
                metadata: chunk.metadata
              }));
              vectorChunks = [...vectorChunks, ...vectorResults];
            }
          }
        }
      }

      // Combine with structured data
      const sessions = (sessionsRes as any).data || [];
      const units = (unitsRes as any).data || [];
      const materials = (materialsRes as any).data || [];

      const structuredContent: CourseContent[] = [
        ...units.map((u: any) => ({ id: `u-${u.id}`, title: u.title, content: u.content_html || u.description, type: 'unit', difficulty: 'intermediate', topics: [] })),
        ...sessions.map((s: any) => ({ id: `s-${s.id}`, title: s.title, content: s.content_html || s.description, type: 'session', difficulty: 'intermediate', topics: [] })),
        ...materials.map((m: any) => ({ id: `m-${m.id}`, title: m.title, content: m.url || '', type: 'material', difficulty: 'intermediate', topics: [] }))
      ];

      const allCombined = [...vectorChunks, ...structuredContent];
      return this.filterRelevantContent(query, allCombined).slice(0, this.maxSources);

    } catch (error) {
      console.error('Error fetching content:', error);
      return [];
    }
  }

  private isPriorityMaterial(chunk: any, courseId: number): boolean {
    const priority = PRIORITY_MATERIALS[courseId] || [];
    const text = (chunk.metadata?.sourceFileName || '' + chunk.title || '').toLowerCase();
    return priority.some(p => text.includes(p.toLowerCase()));
  }

  private detectPageRange(query: string) {
    const match = query.match(/páginas?\s+(\d+)\s*[-a]\s*(\d+)/i) || query.match(/página\s+(\d+)/i);
    if (!match) return null;
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    return { start, end };
  }

  private async searchChunksInPageRange(query: string, courseId: number, start: number, end: number): Promise<CourseContent[]> {
    const { data } = await supabase.rpc('get_chunks_in_page_range', { p_course_id: courseId, p_page_start: start, p_page_end: end, p_limit: 10 });
    return (data || []).map((c: any) => ({
      id: `chunk-p-${c.id}`,
      title: c.metadata?.sourceFileName || 'Documento',
      content: c.content,
      type: 'material',
      difficulty: 'intermediate',
      topics: [],
      originalId: c.id,
      metadata: c.metadata
    }));
  }

  private async getQueryEmbedding(query: string, key: string): Promise<number[] | null> {
    const cacheKey = `emb:${query.toLowerCase().trim()}`;
    if (this.embeddingCache.has(cacheKey)) return this.embeddingCache.get(cacheKey)!.embedding;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: query }] }, taskType: 'RETRIEVAL_QUERY' })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const embedding = data.embedding.values;
      this.embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });
      return embedding;
    } catch { return null; }
  }

  private filterRelevantContent(query: string, content: CourseContent[]): CourseContent[] {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return content.map(item => {
      let score = 0;
      const text = `${item.title} ${item.content}`.toLowerCase();
      words.forEach(w => { if (text.includes(w)) score += 1; if (item.title.toLowerCase().includes(w)) score += 2; });
      if (item.id.startsWith('chunk-')) score += 0.5;
      return { ...item, score };
    }).filter(i => i.score > 0).sort((a, b) => b.score - a.score).map(({ score, ...item }: any) => item);
  }

  private extractTopics(content: string): string[] {
    return content.toLowerCase().match(/\b\w{5,}\b/g)?.slice(0, 5) || [];
  }

  private buildPersonalizedPrompt(query: string, context: ConversationContext, content: CourseContent[], isComplex: boolean, courseSummary?: any): string {
    const contentText = content.map(c => `[${c.title}${c.metadata?.pageStart ? ` | p.${c.metadata.pageStart}` : ''}]\n${c.content.substring(0, 5000)}`).join('\n\n');
    let summaryText = '';

    if (courseSummary) {
      summaryText = `Información del Curso: "${courseSummary.title}"\n`;
      if (courseSummary.units && courseSummary.units.length > 0) {
        summaryText += `Estructura (Unidades):\n${courseSummary.units.join('\n')}\n\n`;
      }
    }

    return `Eres EduSpark. Tu tarea es responder la pregunta del estudiante analizando CUIDADOSAMENTE TODO el contexto proporcionado abajo.

IMPORTANTE: El contexto puede ser largo y contener múltiples temas médicos. Busca información en CUALQUIER parte del texto, incluso si aparece al final.

${summaryText}
CONTEXTO DEL MATERIAL (Busca aquí con detalle):
${contentText}

Pregunta: ${query}

Instrucciones de respuesta:
1. Responde de forma amable y profesional.
2. Si la información está en el contexto, proporciónala con precisión médica.
3. Si la información NO está en el contexto después de revisar con atención, di EXACTAMENTE: "No encuentro esa información en el material del curso."
4. Usa SIEMPRE "Unidades" y "Sesiones", NUNCA digas "Módulos".`;
  }

  private async generateResponse(prompt: string): Promise<string> {
    const { key } = resolveGeminiApiKey();
    if (!key) return 'Error: API Key missing';

    try {
      // 1. Intentar usar Cache de Contexto si el prompt es muy largo (> 30k caracteres)
      // Nota: El límite oficial de Gemini es ~32k tokens, pero usamos caracteres como proxy conservador
      let cachedContentName: string | null = null;
      let finalPrompt = prompt;

      if (prompt.length > 100000) {
        const cacheKey = this.hashString(prompt.substring(0, 50000)); // Hash simple de la primera parte

        // Verificar si existe en memoria local
        if (this.contextCache.has(cacheKey)) {
          const cached = this.contextCache.get(cacheKey);
          // Verificar expiración (simple check de fecha string)
          if (cached && new Date(cached.expiration) > new Date()) {
            cachedContentName = cached.name;
            // Si usamos caché, solo enviamos la parte "nueva" del prompt (la pregunta)
            // Asumimos que el prompt tiene estructura: Contexto + Pregunta
            // Por simplicidad en esta iteración, enviamos el prompt completo pero referenciando el caché 
            // (Gemini optimizará internamente si coincide, o creará uno nuevo si lo estructuramos así)
            console.log('✨ Usando Contexto en Caché:', cachedContentName);
          } else {
            this.contextCache.delete(cacheKey);
          }
        }

        // Si no existe, intentar crear
        if (!cachedContentName) {
          try {
            const createCacheRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: `models/${this.model}`,
                contents: [{ parts: [{ text: prompt }] }],
                ttl: '3600s' // 1 hora de vida
              })
            });

            if (createCacheRes.ok) {
              const cacheData = await createCacheRes.json();
              cachedContentName = cacheData.name;
              this.contextCache.set(cacheKey, {
                name: cacheData.name,
                expiration: cacheData.expireTime
              });
              console.log('💾 Contexto cacheado creado:', cachedContentName);
            }
          } catch (e) {
            console.warn('⚠️ No se pudo crear cache de contexto:', e);
          }
        }
      }

      // 2. Generar Contenido
      const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;

      const requestBody: any = {
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: this.maxOutputTokens
        }
      };

      if (cachedContentName) {
        requestBody.cachedContent = cachedContentName;
        // Si usamos caché, el contenido ya está "dentro". Solo enviamos un prompt vacío o la continuación.
        // En este caso, como cacheamos TODO el prompt, enviamos un mensaje de "Proceder"
        requestBody.contents = [{ parts: [{ text: "Por favor responde a la pregunta basada en el contexto proporcionado anteriormente." }] }];
      } else {
        requestBody.contents = [{ parts: [{ text: prompt }] }];
      }

      const res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar respuesta.';

      // Token logging
      if (this.currentContext?.studentId) {
        const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        tokenMonitoring.recordTokenUsage(usage.promptTokenCount, usage.candidatesTokenCount, this.model, `rag_${Date.now()}`);
        await aiUsageService.recordUsage({
          userId: this.currentContext.studentId,
          courseId: this.currentContext.courseId ? parseInt(this.currentContext.courseId) : undefined,
          model: this.model,
          requestType: 'chat',
          conversationId: this.currentContext.conversationId,
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
          requestId: `rag_${Date.now()}`
        });
      }
      return text;
    } catch { return 'Error de conexión con IA.'; }
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private formatRAGResponse(response: string, sources: CourseContent[]): RAGResponse {
    return {
      success: true,
      message: response,
      metadata: {
        model: this.model,
        source: 'A2A RAG',
        contextUsed: sources.map(s => s.title).join(', '),
        timestamp: new Date().toISOString(),
        sources: sources.map(s => s.title)
      }
    };
  }

  private generateCacheKey(query: string, context: ConversationContext): string {
    return `rag:v10:${context.courseId}:${query.trim().toLowerCase()}`;
  }

  private getCachedResponse(key: string) {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.RESPONSE_CACHE_TTL) return cached.data;
    return null;
  }

  private saveToCache(key: string, data: any) {
    if (this.responseCache.size > this.MAX_CACHE_SIZE) this.responseCache.delete(this.responseCache.keys().next().value);
    this.responseCache.set(key, { data, timestamp: Date.now() });
  }

  private async searchChunksByText(query: string, courseId: number) {
    const { data, error } = await supabase.rpc('search_course_content_chunks_text_clean', { search_query: query, course_id_param: courseId, result_limit: 30, min_relevance: 0.001 });
    return { chunks: data || [], error };
  }

  private async fetchSessionsWithFilter(courseId: number, moduleId?: string) {
    let q = supabase.from('sessions').select('id, title, description, content_html, unit_id').eq('course_id', courseId);
    if (moduleId) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId)) q = q.eq('id', moduleId);
      else q = q.eq('unit_id', moduleId);
    }
    return q;
  }

  private async fetchMaterialsWithFilter(courseId: number, moduleId?: string) {
    let q = supabase.from('materials').select('id, title, kind, url, unit_id, session_id').eq('course_id', courseId);
    if (moduleId) q = q.eq('unit_id', moduleId);
    return q.limit(50);
  }

  private async fetchCourseMaterialsWithFilter(courseId: number, moduleId?: string) {
    let q = supabase.from('course_materials').select('*').eq('course_id', courseId);
    if (moduleId && !isNaN(parseInt(moduleId))) q = q.eq('module_id', parseInt(moduleId));
    return q.limit(50);
  }

  private isGeneralQuery(q: string) {
    return /^(hola|gracias|ok|entendido|hi|hello|thanks)/i.test(q) || q.length < 3;
  }

  async healthCheck() {
    try { return !!resolveGeminiApiKey().key; } catch { return false; }
  }
}

export const ragService = new RAGService();

export const createRAGContext = (
  studentId: string,
  courseId: string,
  conversationId: string,
  pedagogicalSettings: PedagogicalSettings,
  studentProfile: StudentProfile,
  recentMessages: any[]
): ConversationContext => ({
  studentId,
  courseId,
  conversationId,
  pedagogicalSettings,
  studentProfile,
  recentMessages: recentMessages.map(m => ({ id: m.id || String(Date.now()), role: m.role, text: m.text || m.content, timestamp: new Date(), metadata: {} }))
});

export const isValidRAGResponse = (res: any): res is RAGResponse => !!(res && res.success && res.message);
