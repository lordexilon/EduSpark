// =====================================================
// Servicio RAG Directo con A2A (Agent-to-Agent)
// Reemplaza n8n para consultas RAG en Audio-Tutor
// =====================================================

import type { ConversationContext, SupabaseResponse } from '../types/agents';
import type { PedagogicalSettings, StudentProfile } from '../types/pedagogical';
import { supabase } from '../lib/supabase-shared';
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
    sourceMetadata?: Array<Record<string, any>>;
    retrievalAudit?: {
      textCount: number;
      vectorCount: number;
      combinedCount: number;
      courseId: number;
    };
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
  // Curso 12: Ginecología-Obstetricia + Medicina Interna
  12: [
    'Williams Gineco.pdf',
    'Williams Ginecología',
    'Williams Obstetricia',
    'Williams Obstetricia 25a Edicion.pdf',
    'Harrison Principios de Medicina Interna',
    'Harrison Principios de Medicina',
    'Nelson',
  ],
};

// =====================================================
// Servicio RAG Principal
// =====================================================

export class RAGService {
  private readonly model = 'gemini-2.5-flash';
  private readonly maxContextLength = 200000;
  private readonly maxSources = 20;
  /** Margen amplio para respuestas pedagógicas completas (evita corte por MAX_TOKENS en explicaciones largas). */
  private readonly maxOutputTokens = 4096;
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
  private lastRetrievalAudit: {
    textCount: number;
    vectorCount: number;
    combinedCount: number;
    courseId: number;
  } = { textCount: 0, vectorCount: 0, combinedCount: 0, courseId: 0 };

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
          p_estimated_cost: estimatedCost.estimatedCost,
        });
        if (limitsCheck && !limitsCheck.can_proceed) {
          return { success: false, error: limitsCheck.message || 'Límite alcanzado', data: null };
        }
      }

      // DEBUG: Forzar búsqueda real (saltar caché)
      const cacheKey = this.generateCacheKey(query, context);
      /*
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) return cachedResponse;
      */

      // 2. Intención
      if (this.isGeneralQuery(userQuestion.toLowerCase().trim())) {
        const fastPrompt = `Eres EduSpark. Responde brevemente: "${userQuestion}"`;
        const response = await this.generateResponse(fastPrompt);
        return { data: this.formatRAGResponse(response, []), error: null, success: true };
      }

      // 2.5 Meta-query: preguntas sobre estructura del curso, materiales disponibles, etc.
      const courseIdInt = parseInt(context.courseId, 10);
      // DEBUG: Saltar meta-query para forzar búsqueda de contenido médico
      /*
      if (this.isCourseMetaQuery(userQuestion.toLowerCase().trim())) {
        console.log('📋 Detected meta-query about course structure/materials');
        const metaResponse = await this.handleCourseMetaQuery(userQuestion, courseIdInt, query);
        if (metaResponse) {
          this.saveToCache(cacheKey, metaResponse);
          return metaResponse;
        }
      }
      */

      // 3. Contenido
      const pageRange = this.detectPageRange(userQuestion);

      // Obtener estructura básica del curso (siempre útil)
      const [{ data: courseInfo }, { data: courseUnits }] = await Promise.all([
        supabase.from('courses').select('title, description').eq('id', courseIdInt).single(),
        supabase
          .from('course_units')
          .select('number, title')
          .eq('course_id', courseIdInt)
          .order('number', { ascending: true }),
      ]);

      const courseSummary = {
        title: courseInfo?.title || 'Curso',
        description: courseInfo?.description || '',
        units: (courseUnits || []).map((u) => `Unidad ${u.number}: ${u.title}`),
      };

      const relevantContent = await this.getRelevantContent(
        userQuestion,
        context.courseId,
        context.studentProfile,
        context.moduleId
      );

      // 4. Prompt y Respuesta
      const personalizedPrompt = this.buildPersonalizedPrompt(
        query,
        context,
        relevantContent,
        !!pageRange,
        courseSummary
      );
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
        this.searchChunksByText(query, courseIdInt, moduleId),
        this.searchChunksByVector(query, courseIdInt, moduleId), // Nueva búsqueda semántica
        supabase.from('courses').select('id, title, description').eq('id', courseIdInt).single(),
        supabase
          .from('course_units')
          .select('id, number, title, description, content_html')
          .eq('course_id', courseIdInt),
        this.fetchSessionsWithFilter(courseIdInt, moduleId),
        this.fetchMaterialsWithFilter(courseIdInt, moduleId),
        this.fetchCourseMaterialsWithFilter(courseIdInt, moduleId),
      ];

      const [
        textSearchData,
        vectorSearchData,
        courseRes,
        unitsRes,
        sessionsRes,
        materialsRes,
        courseMaterialsRes,
      ] = await Promise.all(promises);

      const { chunks: textChunks = [], error: textError } = textSearchData as any;
      const { chunks: vectorChunks = [], error: vectorError } = vectorSearchData as any;

      console.log('📊 [RAG_AUDIT] Resultados de Supabase:', {
        query,
        courseId: courseIdInt,
        textCount: textChunks.length,
        vectorCount: vectorChunks.length,
        errors: { text: textError, vector: vectorError },
      });

      if (!vectorError && vectorChunks.length === 0 && textChunks.length > 0) {
        console.warn(
          '📭 [RAG_VECTOR_HINT] La RPC vectorial devolvió 0 filas pero la búsqueda textual sí tiene resultados. ' +
            'Causas frecuentes: columna `embedding` NULL en `course_content_chunks`, dimensión distinta a 512 en BD, o firma antigua de `search_course_content_chunks`. ' +
            'Diagnóstico SQL: `sql_scripts/4_diagnostics/176_diagnostic_embedding_por_curso.sql`.'
        );
      }

      // Combinar resultados (Deduplicar por ID)
      let combinedChunks = [...textChunks];
      vectorChunks.forEach((vc: any) => {
        if (!combinedChunks.find((tc) => tc.id === vc.id)) {
          combinedChunks.push(vc);
        }
      });
      this.lastRetrievalAudit = {
        textCount: textChunks.length,
        vectorCount: vectorChunks.length,
        combinedCount: combinedChunks.length,
        courseId: courseIdInt,
      };

      if (combinedChunks.length > 0) {
        // Boost Prioritarios
        const priorityChunks = combinedChunks.filter((c) =>
          this.isPriorityMaterial(c, courseIdInt)
        );
        const otherChunks = combinedChunks.filter((c) => !this.isPriorityMaterial(c, courseIdInt));
        combinedChunks = [...priorityChunks, ...otherChunks].slice(0, 20); // Aumentamos a 20 chunks para mayor contexto

        // Fetch material titles
        const materialIds = [
          ...new Set(combinedChunks.map((c) => c.metadata?.material_id).filter(Boolean)),
        ];
        let materialTitles: Record<string, string> = {};
        if (materialIds.length > 0) {
          const { data: materials } = await supabase
            .from('materials')
            .select('id, title')
            .in('id', materialIds);
          if (materials)
            materialTitles = materials.reduce(
              (acc: any, m: any) => ({ ...acc, [m.id]: m.title }),
              {}
            );
        }

        const finalChunks: CourseContent[] = combinedChunks.map((chunk) => ({
          id: `chunk-${chunk.id}`,
          title:
            materialTitles[chunk.metadata?.material_id] ||
            chunk.metadata?.sourceFileName ||
            'Documento',
          content: chunk.content,
          type: 'material',
          difficulty: 'intermediate',
          topics: this.extractTopics(chunk.content),
          originalId: chunk.id,
          courseId,
          metadata: {
            ...chunk.metadata,
            material_title: materialTitles[chunk.metadata?.material_id],
          },
        }));

        // Búsqueda expandida por páginas (si aplica)
        if (pageRange) {
          const expanded = await this.searchChunksInPageRange(
            query,
            courseIdInt,
            pageRange.start,
            pageRange.end
          );
          const existingIds = new Set(finalChunks.map((c) => c.originalId));
          finalChunks.push(...expanded.filter((c) => !existingIds.has(c.originalId)));
        }

        return finalChunks;
      }

      return [];
    } catch (error) {
      console.error('getRelevantContent error:', error);
      return [];
    }
  }

  private isPriorityMaterial(chunk: any, courseId: number): boolean {
    const priority = PRIORITY_MATERIALS[courseId] || [];
    const text = (chunk.metadata?.sourceFileName || '' + chunk.title || '').toLowerCase();
    return priority.some((p) => text.includes(p.toLowerCase()));
  }

  private detectPageRange(query: string) {
    const match = query.match(/páginas?\s+(\d+)\s*[-a]\s*(\d+)/i) || query.match(/página\s+(\d+)/i);
    if (!match) return null;
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    return { start, end };
  }

  private async searchChunksInPageRange(
    query: string,
    courseId: number,
    start: number,
    end: number
  ): Promise<CourseContent[]> {
    const { data } = await supabase.rpc('get_chunks_in_page_range', {
      p_course_id: courseId,
      p_page_start: start,
      p_page_end: end,
      p_limit: 10,
    });
    return (data || []).map((c: any) => ({
      id: `chunk-p-${c.id}`,
      title: c.metadata?.sourceFileName || 'Documento',
      content: c.content,
      type: 'material',
      difficulty: 'intermediate',
      topics: [],
      originalId: c.id,
      metadata: c.metadata,
    }));
  }

  private async getQueryEmbedding(query: string, key: string): Promise<number[] | null> {
    const cacheKey = `emb:${query.toLowerCase().trim()}`;
    if (this.embeddingCache.has(cacheKey)) return this.embeddingCache.get(cacheKey)!.embedding;

    try {
      console.log('🧪 Iniciando embedding de Google...', query.substring(0, 30));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-2-preview',
            content: { parts: [{ text: query }] },
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: 512,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        console.error('❌ [EMBEDDING_ERROR]', {
          status: res.status,
          statusText: res.statusText,
          error: err,
        });
        return null;
      }

      const data = await res.json();
      const embedding = data.embedding.values;
      console.log('✅ Embedding generado exitosamente (dim: 512)');
      this.embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });
      return embedding;
    } catch (e) {
      console.error('❌ [EMBEDDING_FATAL_ERROR]', e);
      return null;
    }
  }

  private filterRelevantContent(query: string, content: CourseContent[]): CourseContent[] {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return content
      .map((item) => {
        let score = 0;
        const text = `${item.title} ${item.content}`.toLowerCase();
        words.forEach((w) => {
          if (text.includes(w)) score += 1;
          if (item.title.toLowerCase().includes(w)) score += 2;
        });
        if (item.id.startsWith('chunk-')) score += 0.5;
        return { ...item, score };
      })
      .filter((i) => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...item }: any) => item);
  }

  private extractTopics(content: string): string[] {
    return (
      content
        .toLowerCase()
        .match(/\b\w{5,}\b/g)
        ?.slice(0, 5) || []
    );
  }

  private buildPersonalizedPrompt(
    query: string,
    context: ConversationContext,
    content: CourseContent[],
    isComplex: boolean,
    courseSummary?: any
  ): string {
    // 1. Enriquecer los chunks con metadata pedagógica
    const contentText = content
      .map((c) => {
        let header = `[Material: ${c.title}`;
        if (c.metadata?.pageStart) header += ` | pág. ${c.metadata.pageStart}`;
        if (c.type === 'unit') header = `[Estructura del Curso: Unidad - ${c.title}`;
        if (c.type === 'session') header = `[Estructura del Curso: Sesión - ${c.title}`;
        header += `]`;
        return `${header}\n${c.content.substring(0, 5000)}`;
      })
      .join('\n\n');

    let summaryText = '';
    if (courseSummary) {
      summaryText = `Información del Curso Activo: "${courseSummary.title}"\n`;
      if (courseSummary.units && courseSummary.units.length > 0) {
        summaryText += `Estructura Global (Unidades del curso):\n${courseSummary.units.join('\n')}\n\n`;
      }
    }

    return `Eres EduSpark, el tutor de inteligencia artificial experto y empático de este curso CONAREM. Tu tarea es responder la duda del estudiante analizando CUIDADOSAMENTE el contexto proporcionado.

${summaryText}

CONTEXTO DEL MATERIAL (Fuentes para tu respuesta):
===========================================
${contentText || 'No hay materiales específicos disponibles en este momento.'}
===========================================

Pregunta del Estudiante: ${query}

Instrucciones de respuesta:
1. Responde de forma cálida, profesional y pedagógica.
2. Prioriza la información de las Sesiones y Unidades. Si no está allí, usa los libros de referencia global etiquetados como "Material:" (como Harrison o Nelson).
3. Si la información NO está en NINGUNO de los materiales proporcionados, di: "No encuentro esa información específica en los materiales disponibles en este momento."
4. Usa SIEMPRE los términos "Unidades" y "Sesiones", NUNCA la palabra "Módulos".
5. Cita explícita en el cuerpo de la respuesta: al desarrollar el tema, indica de qué material proviene la idea usando el nombre que aparece en el contexto (líneas que empiezan con [Material: ...] o [Estructura del Curso: ...]) y, si en esa línea figura "| pág. N" o rango de páginas, menciónalo (ej. "Según el Harrison (pág. 245)…"). Si no hay número de página en el fragmento, cita solo el nombre del material o unidad/sesión.
6. Incluye al final una sección titulada exactamente **Fuentes** con 2-5 entradas, cada una en una línea, formato: nombre del archivo o material tal como en el contexto, seguido de " — pág. X" o " — págs. X–Y" si aplica; si no hay página en el fragmento usado, solo el nombre del material.
7. Desarrolla cada idea en frases y párrafos completos: no cortes a mitad de explicación (evita terminar en "la red…", "se debe a…" sin concluir). Cierra el concepto antes de pasar a otro tema o a Fuentes.
`;
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
            const createCacheRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${key}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: `models/${this.model}`,
                  contents: [{ parts: [{ text: prompt }] }],
                  ttl: '3600s', // 1 hora de vida
                }),
              }
            );

            if (createCacheRes.ok) {
              const cacheData = await createCacheRes.json();
              cachedContentName = cacheData.name;
              this.contextCache.set(cacheKey, {
                name: cacheData.name,
                expiration: cacheData.expireTime,
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
          maxOutputTokens: this.maxOutputTokens,
        },
      };

      if (cachedContentName) {
        requestBody.cachedContent = cachedContentName;
        // Si usamos caché, el contenido ya está "dentro". Solo enviamos un prompt vacío o la continuación.
        // En este caso, como cacheamos TODO el prompt, enviamos un mensaje de "Proceder"
        requestBody.contents = [
          {
            parts: [
              {
                text: 'Por favor responde a la pregunta basada en el contexto proporcionado anteriormente.',
              },
            ],
          },
        ];
      } else {
        requestBody.contents = [{ parts: [{ text: prompt }] }];
      }

      const res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      // Gemini puede devolver varias partes de texto; usar solo la primera descarta el resto y deja respuestas "entrecortadas".
      const textFromParts = parts
        .map((p: { text?: string }) => (typeof p?.text === 'string' ? p.text : ''))
        .filter((t: string) => t.length > 0)
        .join('');
      let text = textFromParts.trim() || 'No pude generar respuesta.';

      const finishReason = candidate?.finishReason as string | undefined;
      if (finishReason && finishReason !== 'STOP' && import.meta.env.DEV) {
        console.warn('⚠️ [RAG_GEMINI] finishReason:', finishReason, {
          parts: parts.length,
          textLength: text.length,
        });
      }
      if (!candidate && import.meta.env.DEV && data.promptFeedback) {
        console.warn('⚠️ [RAG_GEMINI] Sin candidato:', data.promptFeedback);
      }

      // Token logging
      if (this.currentContext?.studentId) {
        const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        tokenMonitoring.recordTokenUsage(
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          this.model,
          `rag_${Date.now()}`
        );
        await aiUsageService.recordUsage({
          userId: this.currentContext.studentId,
          courseId: this.currentContext.courseId
            ? parseInt(this.currentContext.courseId)
            : undefined,
          model: this.model,
          requestType: 'chat',
          conversationId: this.currentContext.conversationId,
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
          requestId: `rag_${Date.now()}`,
        });
      }
      return text;
    } catch {
      return 'Error de conexión con IA.';
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private formatRAGResponse(response: string, sources: CourseContent[]): RAGResponse {
    const sourceMetadata = sources.map((s) => {
      const pageStart = s.metadata?.pageStart ?? s.metadata?.page_start;
      const pageEnd = s.metadata?.pageEnd ?? s.metadata?.page_end;
      return {
        title: s.title,
        sourceFileName: s.metadata?.sourceFileName || s.title,
        materialId: s.metadata?.material_id || s.originalId || null,
        pageStart: pageStart ?? null,
        pageEnd: pageEnd ?? null,
      };
    });

    const sourceLabels = sourceMetadata.map((s) => {
      if (s.pageStart && s.pageEnd && s.pageEnd !== s.pageStart) {
        return `${s.sourceFileName} - págs. ${s.pageStart}-${s.pageEnd}`;
      }
      if (s.pageStart) {
        return `${s.sourceFileName} - pág. ${s.pageStart}`;
      }
      return s.sourceFileName;
    });

    return {
      success: true,
      message: response,
      metadata: {
        model: this.model,
        source: 'A2A RAG',
        contextUsed: sourceLabels.slice(0, 5).join(', '),
        timestamp: new Date().toISOString(),
        sources: sourceLabels,
        sourceMetadata,
        retrievalAudit: this.lastRetrievalAudit,
      },
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
    if (this.responseCache.size > this.MAX_CACHE_SIZE)
      this.responseCache.delete(this.responseCache.keys().next().value);
    this.responseCache.set(key, { data, timestamp: Date.now() });
  }

  private async searchChunksByText(query: string, courseId: number, moduleId?: string) {
    const isUuid =
      moduleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
    const cleanSearchQuery = this.buildSearchQuery(query);
    const rpcParams: any = {
      search_query: cleanSearchQuery,
      course_id_param: courseId,
      result_limit: 30,
      min_relevance: 0.001,
    };
    if (isUuid) rpcParams.p_module_id = moduleId;

    // 1) Ruta principal (RPC limpia)
    const primary = await supabase.rpc('search_course_content_chunks_text_clean', rpcParams);
    if (!primary.error) {
      return { chunks: primary.data || [], error: null };
    }

    console.warn(
      '⚠️ [RAG_TEXT_RPC_ERROR] search_course_content_chunks_text_clean falló:',
      primary.error
    );

    const isStatementTimeout =
      primary.error && String((primary.error as any).code || '') === '57014';

    // 2) Fallback por firmas antiguas — omitir si ya hubo timeout (misma consulta pesada en BD)
    if (isStatementTimeout) {
      console.warn(
        '⚠️ [RAG_TEXT_SKIP_LEGACY_RPC] Timeout 57014: se omite segunda llamada a text_clean.'
      );
    }
    const fallbackParams = {
      search_query: cleanSearchQuery,
      course_id_param: courseId,
      result_limit: 30,
    };
    const secondary = !isStatementTimeout
      ? await supabase.rpc('search_course_content_chunks_text_clean', fallbackParams as any)
      : { data: null, error: { message: 'skipped after timeout' } as any };
    if (!secondary.error) {
      return { chunks: secondary.data || [], error: null };
    }

    // 3) Fallback de emergencia: query directa SIN ilike en SQL (evita timeout)
    const keywords = this.extractFallbackKeywords(cleanSearchQuery);
    let directQuery = supabase
      .from('course_content_chunks')
      .select('id, course_id, content, metadata, created_at, unit_id, session_id')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(400);

    if (isUuid) {
      directQuery = directQuery.or(
        `unit_id.eq.${moduleId},session_id.eq.${moduleId},and(unit_id.is.null,session_id.is.null)`
      );
    }

    const direct = await directQuery;

    if (!direct.error) {
      const directRows = (direct.data || []) as any[];
      let locallyFiltered = this.filterChunksByKeywords(directRows, keywords);
      if (locallyFiltered.length === 0 && keywords.length > 0) {
        let secondPage = supabase
          .from('course_content_chunks')
          .select('id, course_id, content, metadata, created_at, unit_id, session_id')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .range(400, 999);
        if (isUuid) {
          secondPage = secondPage.or(
            `unit_id.eq.${moduleId},session_id.eq.${moduleId},and(unit_id.is.null,session_id.is.null)`
          );
        }
        const more = await secondPage;
        if (!more.error && more.data?.length) {
          const extra = this.filterChunksByKeywords(more.data as any[], keywords);
          locallyFiltered = extra;
        }
      }
      console.warn('⚠️ [RAG_TEXT_FALLBACK] Usando query directa + filtro local por fallo RPC.', {
        pulled: directRows.length,
        filtered: locallyFiltered.length,
        keywords,
      });
      return { chunks: locallyFiltered.slice(0, 30), error: null };
    }

    return { chunks: [], error: primary.error || secondary.error || direct.error };
  }

  /** Alinea acentos entre consulta y contenido (ej. afasia vs afasía) para el fallback local. */
  private normalizeTextForMatch(s: string): string {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private extractFallbackKeywords(cleanSearchQuery: string): string[] {
    return cleanSearchQuery
      .split(/\s+/)
      .map((w) => this.normalizeTextForMatch(w))
      .filter((w) => w.length > 2);
  }

  private filterChunksByKeywords(rows: any[], keywords: string[]): any[] {
    if (keywords.length === 0) return rows;
    const normalizedKeys = keywords.map((k) => this.normalizeTextForMatch(k));
    return rows.filter((row) => {
      const text = this.normalizeTextForMatch(`${row.content || ''} ${row.metadata?.title || ''}`);
      return normalizedKeys.some((k) => text.includes(k));
    });
  }

  private buildSearchQuery(query: string): string {
    const normalized = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const stopwords = new Set([
      'el',
      'la',
      'los',
      'las',
      'un',
      'una',
      'unos',
      'unas',
      'de',
      'del',
      'al',
      'y',
      'o',
      'u',
      'que',
      'segun',
      'sobre',
      'para',
      'con',
      'sin',
      'por',
      'explicame',
      'explica',
      'curso',
      'material',
      'materiales',
    ]);

    const tokens = normalized.split(' ').filter((t) => t.length >= 4 && !stopwords.has(t));

    if (tokens.length === 0) return normalized || query.trim();
    return tokens.slice(0, 3).join(' ');
  }

  private async searchChunksByVector(query: string, courseId: number, moduleId?: string) {
    const { key } = resolveGeminiApiKey();
    if (!key) return { chunks: [], error: 'API Key missing' };

    const embedding = await this.getQueryEmbedding(query, key);
    if (!embedding) return { chunks: [], error: 'Failed to generate embedding' };

    const isUuid =
      moduleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
    const rpcParams: any = {
      query_embedding: `[${embedding.join(',')}]`,
      course_id_param: courseId,
      match_threshold: -1.0,
      match_count: 30,
    };
    if (isUuid) rpcParams.p_module_id = moduleId;

    const { data, error } = await supabase.rpc('search_course_content_chunks', rpcParams);
    return { chunks: data || [], error };
  }

  private async fetchSessionsWithFilter(courseId: number, moduleId?: string) {
    let q = supabase
      .from('sessions')
      .select('id, title, description, content_html, unit_id')
      .eq('course_id', courseId);
    if (moduleId) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId))
        q = q.eq('id', moduleId);
      else q = q.eq('unit_id', moduleId);
    }
    return q;
  }

  private async fetchMaterialsWithFilter(courseId: number, moduleId?: string) {
    let q = supabase
      .from('materials')
      .select('id, title, kind, url, unit_id, session_id')
      .eq('course_id', courseId);
    if (moduleId) {
      // Incluir materiales de la unidad específica Y materiales globales (sin unit_id)
      // Los materiales globales son libros de referencia como Harrison que aplican a todo el curso
      q = q.or(`unit_id.eq.${moduleId},unit_id.is.null`);
    }
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

  /**
   * Detecta si la pregunta es sobre la estructura del curso o materiales disponibles
   * (no sobre el contenido en sí, sino sobre qué hay disponible)
   */
  private isCourseMetaQuery(q: string): boolean {
    const metaPatterns = [
      /qu[eé]\s+(materiales?|pdf|archivos?|documentos?|recursos?)\s+(tenemos|hay|est[aá]n|existen|tiene)/i,
      /qu[eé]\s+(tenemos|hay)\s+(disponible|para\s+estudiar|para\s+revisar|de\s+material)/i,
      /cu[aá]les\s+son\s+los\s+(materiales?|pdf|archivos?|documentos?|recursos?)/i,
      /lista(r|me)?\s+(los\s+)?(materiales?|pdf|archivos?|documentos?|recursos?)/i,
      /materiales?\s+(disponibles?|del\s+curso|que\s+tenemos)/i,
      /pdfs?\s+(disponibles?|del\s+curso|que\s+tenemos)/i,
      /qu[eé]\s+(unidades|sesiones|temas)\s+(tiene|hay|tenemos)/i,
      /cu[aá]l\s+es\s+(la\s+estructura|el\s+contenido|el\s+temario)/i,
      /mostrar(me)?\s+(los\s+)?(materiales?|pdf|recursos?|contenido)/i,
      /de\s+qu[eé]\s+trata\s+(el\s+curso|este\s+curso)/i,
      /qu[eé]\s+vamos\s+a\s+(estudiar|ver|revisar|aprender)/i,
    ];
    return metaPatterns.some((pattern) => pattern.test(q));
  }

  /**
   * Maneja preguntas meta sobre el curso consultando directamente las tablas de estructura
   */
  private async handleCourseMetaQuery(
    userQuestion: string,
    courseId: number,
    fullQuery: string
  ): Promise<SupabaseResponse<RAGResponse> | null> {
    try {
      // Consultar datos reales de la estructura del curso
      const [courseRes, unitsRes, sessionsRes, materialsRes] = await Promise.all([
        supabase.from('courses').select('title, description').eq('id', courseId).single(),
        supabase
          .from('course_units')
          .select('id, number, title, description')
          .eq('course_id', courseId)
          .order('number', { ascending: true }),
        supabase
          .from('sessions')
          .select('id, title, description, unit_id')
          .eq('course_id', courseId),
        supabase
          .from('materials')
          .select('id, title, kind, url, unit_id, session_id')
          .eq('course_id', courseId),
      ]);

      const course = courseRes.data;
      const units = unitsRes.data || [];
      const sessions = sessionsRes.data || [];
      const materials = materialsRes.data || [];

      // Construir un resumen estructurado REAL
      let structureText = `INFORMACIÓN REAL DEL CURSO (datos de la base de datos):\n`;
      structureText += `Curso: "${course?.title || 'Sin título'}"\n`;
      structureText += `Descripción: ${course?.description || 'Sin descripción'}\n\n`;

      if (units.length > 0) {
        structureText += `UNIDADES DEL CURSO (${units.length} unidades):\n`;
        units.forEach((u) => {
          structureText += `  - Unidad ${u.number}: ${u.title}\n`;
          const unitSessions = sessions.filter((s) => s.unit_id === u.id);
          if (unitSessions.length > 0) {
            unitSessions.forEach((s) => {
              structureText += `    • Sesión: ${s.title}\n`;
            });
          }
          const unitMaterials = materials.filter((m) => m.unit_id === u.id);
          if (unitMaterials.length > 0) {
            unitMaterials.forEach((m) => {
              structureText += `    📄 Material: ${m.title} (${m.kind || 'documento'})\n`;
            });
          }
        });
      }

      // Materiales sin unidad asignada
      const unassignedMaterials = materials.filter((m) => !m.unit_id);
      if (unassignedMaterials.length > 0) {
        structureText += `\nMATERIALES GENERALES DEL CURSO:\n`;
        unassignedMaterials.forEach((m) => {
          structureText += `  📄 ${m.title} (${m.kind || 'documento'})\n`;
        });
      }

      if (materials.length === 0) {
        structureText += `\nNOTA: No hay materiales (PDFs, documentos) cargados en este curso todavía.\n`;
      } else {
        structureText += `\nTOTAL DE MATERIALES: ${materials.length}\n`;
        const pdfMaterials = materials.filter((m) => m.kind === 'pdf' || m.url?.endsWith('.pdf'));
        if (pdfMaterials.length > 0) {
          structureText += `PDFs disponibles: ${pdfMaterials.length}\n`;
        }
      }

      // Prompt especializado para meta-queries
      const metaPrompt = `Eres EduSpark. El estudiante pregunta sobre la estructura o los materiales del curso.

IMPORTANTE: Responde ÚNICAMENTE con la información proporcionada abajo. NO inventes ni asumas materiales que no están listados.
Si no hay materiales cargados, dilo honestamente: "Aún no se han cargado materiales en este curso."

${structureText}

Pregunta del estudiante: ${userQuestion}

Instrucciones:
1. Lista SOLO los materiales que aparecen arriba. NO inventes nombres de libros, capítulos o PDFs.
2. Si la lista está vacía, indica que aún no hay materiales cargados.
3. Organiza la respuesta por Unidades si aplica.
4. Usa SIEMPRE "Unidades" y "Sesiones", NUNCA digas "Módulos".
5. Sé amable y profesional.`;

      const response = await this.generateResponse(metaPrompt);
      const ragResponse = this.formatRAGResponse(response, []);
      return { data: ragResponse, error: null, success: true };
    } catch (error) {
      console.error('Error handling meta-query:', error);
      return null; // Fallback al flujo normal
    }
  }

  async healthCheck() {
    try {
      return !!resolveGeminiApiKey().key;
    } catch {
      return false;
    }
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
  recentMessages: recentMessages.map((m) => ({
    id: m.id || String(Date.now()),
    role: m.role,
    text: m.text || m.content,
    timestamp: new Date(),
    metadata: {},
  })),
});

export const isValidRAGResponse = (res: any): res is RAGResponse =>
  !!(res && res.success && res.message);
