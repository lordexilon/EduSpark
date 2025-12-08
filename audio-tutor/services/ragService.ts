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
import { aiUsageService } from '../../src/services/aiUsageService';

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
// Servicio RAG Principal
// =====================================================

export class RAGService {
  private readonly model = 'gemini-2.5-flash';  // Modelo actual disponible
  private readonly maxContextLength = 4000;
  private readonly maxSources = 3; // OPTIMIZADO: Reducido de 5 a 3 para ahorrar tokens
  private readonly maxOutputTokens = 2048; // AUMENTADO: De 1200 a 2048 para compensar thoughts tokens de Gemini 2.5 Flash
  private lastFinishReason: string | null = null;
  private lastResponseTail: string | null = null;

  // Caché mejorado
  private responseCache: Map<string, { data: any; timestamp: number }> = new Map();
  private embeddingCache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  private readonly RESPONSE_CACHE_TTL = 30 * 60 * 1000; // 30 minutos
  private readonly EMBEDDING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
  private readonly MAX_CACHE_SIZE = 500;

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

      // 0. Verificar límites de costos ANTES de procesar
      if (context.studentId) {
        const estimatedCost = tokenMonitoring.estimateCost(query, this.model);
        const { data: limitsCheck, error: limitsError } = await supabase.rpc(
          'check_user_query_limits',
          {
            p_user_id: context.studentId,
            p_estimated_cost: estimatedCost.estimatedCost
          }
        );

        if (limitsError) {
          console.warn('⚠️ Error verificando límites:', limitsError);
        } else if (limitsCheck && !limitsCheck.can_proceed) {
          return {
            success: false,
            error: limitsCheck.message || 'Límite de consultas alcanzado. Por favor, intenta mañana o contacta al administrador.',
            data: null
          };
        }
      }

      // 0.1. Verificar caché de respuestas PRIMERO (ahorra todo el procesamiento)
      const cacheKey = this.generateCacheKey(query, context);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log('⚡ RAGService: Respuesta desde caché (sin costo)');
        return cachedResponse;
      }

      // 1. Obtener contenido relevante del curso (OPTIMIZADO: prioriza texto completo)
      // Detectar si es consulta compleja (menciona páginas específicas)
      const pageRange = this.detectPageRange(query);
      const isComplexQuery = !!pageRange;

      const relevantContent = await this.getRelevantContent(
        query,
        context.courseId,
        context.studentProfile,
        context.moduleId
      );

      console.log('📦 RAGService - Contenido relevante encontrado:', {
        count: relevantContent.length,
        titles: relevantContent.map(c => c.title),
        isComplexQuery
      });

      // 2. Construir prompt personalizado
      const personalizedPrompt = this.buildPersonalizedPrompt(
        query,
        context,
        relevantContent,
        isComplexQuery
      );

      // 3. Generar respuesta con Gemini
      const response = await this.generateResponse(personalizedPrompt);

      // 4. Procesar y formatear respuesta
      const ragResponse = this.formatRAGResponse(response, relevantContent);

      // 5. Guardar en caché para futuras consultas similares
      this.saveToCache(cacheKey, {
        data: ragResponse,
        error: null,
        success: true
      });

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
   * Detecta si la consulta menciona rangos de páginas específicos
   * Retorna { start: número, end: número } o null si no se detecta
   */
  private detectPageRange(query: string): { start: number; end: number } | null {
    // Patrones comunes: "páginas 241-262", "página 241 a 262", "págs 241-262", etc.
    const patterns = [
      /páginas?\s+(\d+)\s*[-a]\s*(\d+)/i,
      /págs?\.?\s+(\d+)\s*[-a]\s*(\d+)/i,
      /pgs?\.?\s+(\d+)\s*[-a]\s*(\d+)/i,
      /página\s+(\d+)\s+y\s+(\d+)/i,
      /(\d+)\s*[-a]\s*(\d+)\s+páginas?/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0 && end >= start) {
          return { start, end };
        }
      }
    }

    // También detectar página única: "página 241"
    const singlePagePattern = /página\s+(\d+)/i;
    const singleMatch = query.match(singlePagePattern);
    if (singleMatch) {
      const page = parseInt(singleMatch[1], 10);
      if (!isNaN(page) && page > 0) {
        return { start: page, end: page };
      }
    }

    return null;
  }

  /**
   * Búsqueda expandida por rangos de páginas específicos
   * Busca chunks dentro de un rango de páginas determinado
   */
  private async searchChunksInPageRange(
    query: string,
    courseId: number,
    pageStart: number,
    pageEnd: number,
    limit: number = 10
  ): Promise<CourseContent[]> {
    try {
      console.log(`🔍 RAGService - Búsqueda expandida en páginas ${pageStart}-${pageEnd}`);

      // Buscar chunks en el rango de páginas específico usando RPC
      // Esto soporta documentos asignados desde otros cursos
      const { data: chunks, error } = await supabase.rpc('get_chunks_in_page_range', {
        p_course_id: courseId,
        p_page_start: pageStart,
        p_page_end: pageEnd,
        p_limit: limit * 2
      });

      if (error) {
        console.error('RAGService - Error en búsqueda expandida (RPC):', error);
        return [];
      }

      if (!chunks || chunks.length === 0) {
        console.log(`⚠️ RAGService - No se encontraron chunks en páginas ${pageStart}-${pageEnd}`);
        return [];
      }

      // Los chunks ya vienen filtrados por rango de páginas desde el RPC
      const filteredChunks = chunks.slice(0, limit);

      // Obtener títulos de materiales
      const materialIds = [...new Set(filteredChunks
        .map((chunk: any) => chunk.metadata?.material_id)
        .filter(Boolean))];

      let materialTitles: Record<string, string> = {};
      if (materialIds.length > 0) {
        try {
          const { data: materials } = await supabase
            .from('materials')
            .select('id, title')
            .in('id', materialIds);

          if (materials) {
            materialTitles = materials.reduce((acc: Record<string, string>, mat: any) => {
              acc[mat.id] = mat.title;
              return acc;
            }, {});
          }
        } catch (materialsErr) {
          console.warn('RAGService - Error obteniendo títulos de materiales:', materialsErr);
        }
      }

      // Convertir a CourseContent
      const expandedChunks: CourseContent[] = filteredChunks.map((chunk: any) => {
        const materialId = chunk.metadata?.material_id;
        const materialTitle = materialId ? materialTitles[materialId] : null;

        return {
          id: `chunk-${chunk.id}`,
          title: materialTitle || chunk.metadata?.sourceFileName || 'Documento procesado',
          content: chunk.content,
          type: 'material' as const,
          difficulty: 'intermediate' as const,
          topics: this.extractTopics(chunk.content),
          originalId: chunk.id,
          courseId: courseId.toString(),
          metadata: {
            sourceFileName: chunk.metadata?.sourceFileName,
            material_id: chunk.metadata?.material_id,
            material_title: materialTitle,
            pageStart: chunk.metadata?.pageStart || chunk.metadata?.page_start,
            pageEnd: chunk.metadata?.pageEnd || chunk.metadata?.page_end,
            pdfType: chunk.metadata?.pdfType,
            category: chunk.metadata?.category,
            ocrUsed: chunk.metadata?.ocrUsed,
          }
        };
      });

      console.log(`✅ RAGService - Encontrados ${expandedChunks.length} chunks expandidos en páginas ${pageStart}-${pageEnd}`);
      return expandedChunks;

    } catch (error) {
      console.error('RAGService - Error en búsqueda expandida:', error);
      return [];
    }
  }

  /**
   * Obtiene contenido relevante del curso basado en la consulta
   * Implementa búsqueda híbrida: inicial rápida + expansión por rangos de páginas si es necesario
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

      // BÚSQUEDA HÍBRIDA: Fase 1 (rápida) + Fase 2 (expandida si es necesario)
      // 1. Detectar si la consulta menciona rangos de páginas específicos
      const pageRange = this.detectPageRange(query);
      let isComplexQuery = false;

      if (pageRange) {
        console.log(`📄 RAGService - Detectado rango de páginas: ${pageRange.start}-${pageRange.end}`);
        isComplexQuery = true;
      }

      // OPTIMIZACIÓN: Priorizar búsqueda de texto completo (GRATIS) antes que embeddings
      // 1. PRIMERO: Intentar búsqueda de texto completo con filtrado de ruido
      let vectorChunks: CourseContent[] = [];

      try {
        console.log('🔍 RAGService - Intentando búsqueda de texto completo PRIMERO (sin costo de embedding)');

        // Intentar función mejorada con filtrado de ruido
        // AJUSTADO: min_relevance más bajo (0.01) para encontrar nombres propios como "Dedekind"
        let textChunks: any[] | null = null;
        let textError: any = null;
        let useHybridDirectly = false;

        try {
          // Timeout de 3 segundos para evitar bloqueos
          const textSearchPromise = supabase.rpc(
            'search_course_content_chunks_text_clean',
            {
              search_query: query,
              course_id_param: courseIdInt,
              result_limit: 15, // OPTIMIZADO: Aumentado a 15 para libros grandes
              min_relevance: 0.001  // OPTIMIZADO: Reducido a 0.001 para mayor cobertura
            }
          );

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
          );

          const result = await Promise.race([textSearchPromise, timeoutPromise]) as any;

          if (result.error) {
            // Detectar si la función no existe (404 o error de función no encontrada)
            const isFunctionNotFound =
              result.error.code === '42883' || // function does not exist
              result.error.code === 'PGRST116' || // Not found
              result.error.message?.includes('does not exist') ||
              result.error.message?.includes('function') && result.error.message?.includes('not found');

            if (isFunctionNotFound) {
              console.warn('⚠️ RAGService - Función RPC no encontrada, usando búsqueda híbrida directamente');
              useHybridDirectly = true;
            } else {
              console.error('RAGService - Error en búsqueda de texto completo:', result.error);
              textError = result.error;
            }
          } else {
            textChunks = result.data;
            textError = null;
          }
        } catch (rpcError: any) {
          // Detectar si la función no existe en el catch también
          const isFunctionNotFound =
            rpcError?.code === '42883' ||
            rpcError?.code === 'PGRST116' ||
            rpcError?.message?.includes('does not exist') ||
            rpcError?.message?.includes('function') && rpcError?.message?.includes('not found') ||
            rpcError?.message?.includes('404');

          if (isFunctionNotFound) {
            console.warn('⚠️ RAGService - Función RPC no encontrada (catch), usando búsqueda híbrida directamente');
            useHybridDirectly = true;
            textError = null; // Resetear error para intentar fallback
          } else {
            console.error('RAGService - Excepción en búsqueda de texto completo:', rpcError);
            textError = rpcError;
          }
        }

        // Si la función no existe o hay error, intentar fallback a función híbrida
        if (useHybridDirectly || textError) {
          try {
            console.log('RAGService - Intentando búsqueda híbrida como fallback...');
            const fallbackResult = await supabase.rpc(
              'search_course_content_chunks_hybrid_clean',
              {
                search_query: query,
                course_id_param: courseIdInt,
                result_limit: 15, // OPTIMIZADO
                min_relevance: 0.001 // OPTIMIZADO
              }
            );
            if (!fallbackResult.error && fallbackResult.data) {
              textChunks = fallbackResult.data;
              textError = null;
              console.log('✅ RAGService - Búsqueda híbrida exitosa como fallback');
            } else {
              // Si el fallback también falla, mantener el error pero continuar con búsqueda vectorial
              console.warn('⚠️ RAGService - Búsqueda híbrida también falló, continuando con búsqueda vectorial');
              textError = fallbackResult.error || textError;
            }
          } catch (fallbackError) {
            console.warn('⚠️ RAGService - Error también en búsqueda híbrida, continuando con búsqueda vectorial:', fallbackError);
            textError = fallbackError;
          }
        }

        if (!textError && textChunks && textChunks.length > 0) {
          console.log(`✅ RAGService - Encontrados ${textChunks.length} chunks con búsqueda de texto completo (SIN costo de embedding)`);

          // Procesar chunks encontrados
          const materialIds = [...new Set(textChunks
            .map((chunk: any) => chunk.metadata?.material_id)
            .filter(Boolean))];

          let materialTitles: Record<string, string> = {};
          if (materialIds.length > 0) {
            try {
              const { data: materials } = await supabase
                .from('materials')
                .select('id, title')
                .in('id', materialIds);

              if (materials) {
                materialTitles = materials.reduce((acc: Record<string, string>, mat: any) => {
                  acc[mat.id] = mat.title;
                  return acc;
                }, {});
              }
            } catch (materialsErr) {
              console.warn('RAGService - Error obteniendo títulos de materiales:', materialsErr);
            }
          }

          // Incluir más chunks para cubrir diferentes rangos de páginas
          vectorChunks = textChunks.slice(0, 5).map((chunk: any) => {
            const materialId = chunk.metadata?.material_id;
            const materialTitle = materialId ? materialTitles[materialId] : null;

            return {
              id: `chunk-${chunk.id}`,
              title: materialTitle || chunk.metadata?.sourceFileName || 'Documento procesado',
              content: chunk.content,
              type: 'material' as const,
              difficulty: 'intermediate' as const,
              topics: this.extractTopics(chunk.content),
              originalId: chunk.id,
              courseId: courseId,
              metadata: {
                sourceFileName: chunk.metadata?.sourceFileName,
                material_id: chunk.metadata?.material_id,
                material_title: materialTitle,
                pageStart: chunk.metadata?.pageStart || chunk.metadata?.page_start,
                pageEnd: chunk.metadata?.pageEnd || chunk.metadata?.page_end,
                pdfType: chunk.metadata?.pdfType,
                category: chunk.metadata?.category,
                ocrUsed: chunk.metadata?.ocrUsed,
              },
            };
          });

          // FASE 2: Búsqueda expandida si se detectó rango de páginas
          if (pageRange && vectorChunks.length > 0) {
            console.log(`🔍 RAGService - Iniciando búsqueda expandida para páginas ${pageRange.start}-${pageRange.end}`);
            try {
              const expandedChunks = await this.searchChunksInPageRange(
                query,
                courseIdInt,
                pageRange.start,
                pageRange.end,
                10 // límite de chunks expandidos
              );

              // Combinar chunks iniciales con expandidos, evitando duplicados
              const existingIds = new Set(vectorChunks.map(c => c.originalId));
              const newExpandedChunks = expandedChunks.filter(c => !existingIds.has(c.originalId));

              if (newExpandedChunks.length > 0) {
                console.log(`✅ RAGService - Agregados ${newExpandedChunks.length} chunks expandidos`);
                vectorChunks = [...vectorChunks, ...newExpandedChunks];
                isComplexQuery = true; // Marcar como consulta compleja para mensaje informativo
              }
            } catch (expandError) {
              console.warn('RAGService - Error en búsqueda expandida:', expandError);
              // Continuar con los chunks iniciales si la expansión falla
            }
          }
        }
      } catch (textSearchError) {
        console.warn('RAGService - Error en búsqueda de texto completo:', textSearchError);
      }

      // 2. SOLO si no encontramos suficientes resultados, usar embeddings (COSTO: ~$0.00001)
      // PERO PRIMERO: Si estamos en una sesión específica, buscar chunks de esa sesión directamente
      if (vectorChunks.length < 2 && moduleId) {
        try {
          console.log(`🔍 RAGService - Buscando chunks de sesión ${moduleId} DIRECTAMENTE...`);

          const { data: sessionChunks, error: sessionError } = await supabase
            .from('course_content_chunks')
            .select('*')
            .eq('metadata->>sessionId', moduleId)
            .limit(5);

          if (!sessionError && sessionChunks && sessionChunks.length > 0) {
            console.log(`✅ RAGService - Encontrados ${sessionChunks.length} chunks directos de la sesión`);

            // Convertir a formato CourseContent
            const sessionContent: CourseContent[] = sessionChunks.map((chunk: any) => ({
              id: `chunk-${chunk.id}`,
              title: chunk.metadata?.sourceFileName || 'Contenido de sesión',
              content: chunk.content,
              type: 'material' as const,
              difficulty: 'intermediate' as const,
              topics: this.extractTopics(chunk.content),
              originalId: chunk.id,
              courseId: courseId,
              metadata: {
                sourceFileName: chunk.metadata?.sourceFileName,
                sessionId: chunk.metadata?.sessionId,
              },
            }));

            vectorChunks = [...vectorChunks, ...sessionContent];
            console.log(`📦 RAGService - Total chunks después de agregar sesión: ${vectorChunks.length}`);
          } else if (sessionError) {
            console.warn('⚠️ RAGService - Error buscando chunks de sesión:', sessionError);
          } else {
            console.warn(`⚠️ RAGService - No se encontraron chunks para sessionId ${moduleId}`);
          }
        } catch (sessionQueryError) {
          console.error('❌ RAGService - Error en query directa de sesión:', sessionQueryError);
        }
      }

      // 3. Si aún no hay suficientes resultados, usar embeddings vectoriales
      if (vectorChunks.length < 2) {
        try {
          console.log('🔍 RAGService - Búsqueda de texto completo insuficiente, usando embeddings...');

          const { resolveGeminiApiKey } = await import('../utils/env');

          const { key } = resolveGeminiApiKey();
          if (key) {
            // Verificar caché de embedding primero
            const embeddingCacheKey = `embedding:${query.toLowerCase().trim()}`;
            let queryEmbedding: number[] | null = null;

            const cachedEmbedding = this.embeddingCache.get(embeddingCacheKey);
            if (cachedEmbedding && (Date.now() - cachedEmbedding.timestamp) < this.EMBEDDING_CACHE_TTL) {
              queryEmbedding = cachedEmbedding.embedding;
              console.log('⚡ RAGService - Embedding desde caché (sin costo)');
            } else {
              // Generar embedding usando fetch directo a la API de Google
              // (más confiable que la librería que puede no tener embedContent)
              try {
                const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      model: 'models/text-embedding-004',
                      content: {
                        parts: [{ text: query }]
                      },
                      taskType: 'RETRIEVAL_QUERY',
                    }),
                  }
                );

                if (response.ok) {
                  const embeddingResult = await response.json();
                  if (embeddingResult.embedding?.values) {
                    queryEmbedding = embeddingResult.embedding.values;

                    // Guardar en caché
                    this.addToEmbeddingCache(embeddingCacheKey, queryEmbedding);
                  }
                } else {
                  const errorText = await response.text();
                  console.error('RAGService - Error en API de embeddings:', response.status, errorText);
                }
              } catch (embedError) {
                console.error('RAGService - Error generando embedding:', embedError);
                // Continuar sin embedding, usar solo búsqueda de texto
              }
            }

            if (queryEmbedding) {
              const embeddingString = `[${queryEmbedding.join(',')}]`;
              const courseIdStr = courseIdInt.toString();

              let chunks: any[] | null = null;
              let chunksError: any = null;

              try {
                const result = await supabase.rpc(
                  'search_course_content_chunks',
                  {
                    query_embedding: embeddingString,
                    course_id_param: courseIdStr,
                    match_threshold: 0.1, // OPTIMIZADO: Reducido para mayor cobertura
                    match_count: 10 // OPTIMIZADO: Aumentado para más contexto
                  }
                );
                chunks = result.data;
                chunksError = result.error;
              } catch (rpcError) {
                console.warn('RAGService - Error en búsqueda vectorial:', rpcError);
                chunksError = rpcError;
              }

              if (!chunksError && chunks) {
                // Obtener material_ids únicos de los chunks
                const materialIds = [...new Set(chunks
                  .map((chunk: any) => chunk.metadata?.material_id)
                  .filter(Boolean))];

                // Buscar títulos de materiales desde la tabla materials
                let materialTitles: Record<string, string> = {};
                if (materialIds.length > 0) {
                  try {
                    const { data: materials, error: materialsError } = await supabase
                      .from('materials')
                      .select('id, title')
                      .in('id', materialIds);

                    if (!materialsError && materials) {
                      materialTitles = materials.reduce((acc: Record<string, string>, mat: any) => {
                        acc[mat.id] = mat.title;
                        return acc;
                      }, {});
                    }
                  } catch (materialsErr) {
                    console.warn('RAGService - Error obteniendo títulos de materiales (vectorial):', materialsErr);
                  }
                }

                vectorChunks = chunks.map((chunk: any) => {
                  const materialId = chunk.metadata?.material_id;
                  const materialTitle = materialId ? materialTitles[materialId] : null;

                  return {
                    id: `chunk-${chunk.id}`,
                    title: materialTitle || chunk.metadata?.sourceFileName || 'Documento procesado',
                    content: chunk.content,
                    type: 'material' as const,
                    difficulty: 'intermediate' as const,
                    topics: this.extractTopics(chunk.content),
                    originalId: chunk.id,
                    courseId: courseId,
                    // Metadata para citas
                    metadata: {
                      sourceFileName: chunk.metadata?.sourceFileName,
                      material_id: chunk.metadata?.material_id,
                      material_title: materialTitle,
                      pageStart: chunk.metadata?.pageStart || chunk.metadata?.page_start,
                      pageEnd: chunk.metadata?.pageEnd || chunk.metadata?.page_end,
                      pdfType: chunk.metadata?.pdfType,
                      category: chunk.metadata?.category,
                      ocrUsed: chunk.metadata?.ocrUsed,
                    },
                  };
                });
              }
              console.log('RAGService - Chunks vectoriales encontrados:', vectorChunks.length);
              console.log('RAGService - Títulos de chunks vectoriales:', vectorChunks.map(c => c.title));
            }
          }
        } catch (vectorError) {
          console.warn('RAGService - Error en búsqueda vectorial (continuando con búsqueda tradicional):', vectorError);
        }
      }

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
            type: (material.kind || 'material') as 'material',
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

      // Combinar contenido vectorial con contenido tradicional
      const combinedContent = [...vectorChunks, ...allContent];

      // Filtrar por relevancia simple (los chunks vectoriales ya están ordenados por relevancia)
      const filteredContent = this.filterRelevantContent(query, combinedContent);

      // Priorizar chunks vectoriales al inicio
      const vectorChunkIds = new Set(vectorChunks.map(c => c.id));
      const sortedContent = [
        ...filteredContent.filter(c => vectorChunkIds.has(c.id)),
        ...filteredContent.filter(c => !vectorChunkIds.has(c.id))
      ].slice(0, this.maxSources);

      return sortedContent;

    } catch (error) {
      console.error('Error getting relevant content:', error);
      return [];
    }
  }

  /**
   * Filtra contenido por relevancia simple
   */
  private filterRelevantContent(query: string, content: CourseContent[]): CourseContent[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Palabras clave que indican búsqueda de materiales/libros
    const materialKeywords = ['libro', 'libros', 'material', 'materiales', 'documento', 'documentos', 'recurso', 'recursos', 'texto', 'textos'];
    const isMaterialQuery = materialKeywords.some(keyword => queryLower.includes(keyword));

    return content
      .map(item => {
        let relevanceScore = this.calculateRelevanceScore(queryWords, item);

        // Si la consulta es sobre materiales/libros y el item es un chunk procesado, aumentar relevancia
        if (isMaterialQuery && item.id?.startsWith('chunk-')) {
          relevanceScore += 10; // Boost significativo para chunks cuando se pregunta por materiales
        }

        // Si el item tiene metadata de material (chunk procesado), siempre darle algo de relevancia
        if (item.metadata?.material_id || item.metadata?.sourceFileName) {
          relevanceScore = Math.max(relevanceScore, 1);
        }

        return {
          ...item,
          relevanceScore
        };
      })
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
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Extrae la parte más relevante del contenido basándose en palabras clave de la consulta
   * Esto asegura que el modelo vea información relevante incluso si está mezclada con ruido de OCR
   */
  private extractRelevantContent(content: string, query: string, maxLength: number = 500): string {
    if (!content || !query) {
      return content.substring(0, maxLength);
    }

    // Limpiar contenido básico (eliminar ruido obvio)
    let cleaned = content;

    // Eliminar secuencias repetitivas de números (más de 4 repeticiones)
    cleaned = cleaned.replace(/(\d)\1{4,}/g, '');

    // Eliminar secuencias repetitivas de caracteres no alfanuméricos (más de 3 repeticiones)
    cleaned = cleaned.replace(/([^\w\s])\1{3,}/g, '');

    // Normalizar espacios múltiples
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // Extraer palabras clave de la consulta (palabras de más de 3 caracteres)
    const queryWords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5); // Máximo 5 palabras clave

    if (queryWords.length === 0) {
      // Si no hay palabras clave, devolver inicio limpio
      return cleaned.substring(0, maxLength) + (cleaned.length > maxLength ? '...' : '');
    }

    // Buscar la primera ocurrencia de cualquier palabra clave
    const contentLower = cleaned.toLowerCase();
    let bestMatchIndex = -1;
    let bestMatchWord = '';

    for (const word of queryWords) {
      const index = contentLower.indexOf(word);
      if (index !== -1 && (bestMatchIndex === -1 || index < bestMatchIndex)) {
        bestMatchIndex = index;
        bestMatchWord = word;
      }
    }

    if (bestMatchIndex === -1) {
      // No se encontraron palabras clave, devolver inicio limpio
      return cleaned.substring(0, maxLength) + (cleaned.length > maxLength ? '...' : '');
    }

    // Extraer contexto alrededor de la palabra clave encontrada
    const contextBefore = 200;
    const contextAfter = 300;
    const start = Math.max(0, bestMatchIndex - contextBefore);
    const end = Math.min(cleaned.length, bestMatchIndex + bestMatchWord.length + contextAfter);

    let extracted = cleaned.substring(start, end);

    // Asegurar que no cortemos palabras
    if (start > 0) {
      const firstSpace = extracted.indexOf(' ');
      if (firstSpace > 0 && firstSpace < 50) {
        extracted = extracted.substring(firstSpace + 1);
      }
    }

    if (end < cleaned.length) {
      const lastSpace = extracted.lastIndexOf(' ');
      if (lastSpace > extracted.length - 50 && lastSpace > 0) {
        extracted = extracted.substring(0, lastSpace);
      }
    }

    // Agregar indicador si hay más contenido
    if (start > 0) extracted = '...' + extracted;
    if (end < cleaned.length) extracted = extracted + '...';

    return extracted;
  }

  /**
   * Construye prompt personalizado basado en contexto
   */
  private buildPersonalizedPrompt(
    query: string,
    context: ConversationContext,
    relevantContent: CourseContent[],
    isComplexQuery: boolean = false
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
    // Priorizar chunks procesados (materiales/libros) cuando están disponibles
    const chunks = relevantContent.filter(item => item.id?.startsWith('chunk-'));
    const otherContent = relevantContent.filter(item => !item.id?.startsWith('chunk-') && item.type !== 'course');

    // Si hay chunks, incluirlos primero; luego otros contenidos
    // Aumentado para incluir más chunks y cubrir diferentes rangos de páginas
    const maxItems = 7; // Aumentado de 5 a 7 para incluir más chunks
    const maxChunks = 5; // Aumentado de 3 a 5 para incluir más rangos de páginas

    // Agrupar chunks por rango de páginas para asegurar diversidad
    const chunksByPageRange = new Map<string, CourseContent[]>();
    chunks.forEach(chunk => {
      const pageStart = chunk.metadata?.pageStart || chunk.metadata?.page_start;
      const pageEnd = chunk.metadata?.pageEnd || chunk.metadata?.page_end;
      const rangeKey = pageStart && pageEnd ? `${pageStart}-${pageEnd}` : pageStart ? `${pageStart}` : 'sin-paginas';

      if (!chunksByPageRange.has(rangeKey)) {
        chunksByPageRange.set(rangeKey, []);
      }
      chunksByPageRange.get(rangeKey)!.push(chunk);
    });

    // Seleccionar chunks: al menos uno de cada rango de páginas, hasta maxChunks
    const selectedChunks: CourseContent[] = [];
    const ranges = Array.from(chunksByPageRange.keys());

    // Primero, tomar un chunk de cada rango
    for (const range of ranges) {
      if (selectedChunks.length >= maxChunks) break;
      const rangeChunks = chunksByPageRange.get(range)!;
      if (rangeChunks.length > 0) {
        selectedChunks.push(rangeChunks[0]);
      }
    }

    // Si aún hay espacio, agregar más chunks de los rangos más relevantes
    if (selectedChunks.length < maxChunks) {
      const remainingChunks = chunks.filter(c => !selectedChunks.includes(c));
      selectedChunks.push(...remainingChunks.slice(0, maxChunks - selectedChunks.length));
    }

    const contentItems = [
      ...selectedChunks,
      ...otherContent.slice(0, maxItems - selectedChunks.length) // Resto de otros contenidos
    ];

    // Agrupar chunks por material para mostrar mejor los libros disponibles
    const chunksByMaterial = new Map<string, CourseContent[]>();
    const otherItems: CourseContent[] = [];

    contentItems.forEach(item => {
      if (item.id?.startsWith('chunk-') && item.metadata?.material_id) {
        const materialId = item.metadata.material_id;
        if (!chunksByMaterial.has(materialId)) {
          chunksByMaterial.set(materialId, []);
        }
        chunksByMaterial.get(materialId)!.push(item);
      } else {
        otherItems.push(item);
      }
    });

    // Construir lista de materiales/libros disponibles con información de páginas
    const materialsList = Array.from(chunksByMaterial.entries())
      .map(([materialId, chunks]) => {
        const firstChunk = chunks[0];
        const materialTitle = firstChunk.metadata?.material_title || firstChunk.title || 'Material sin título';
        const chunkCount = chunks.length;
        const pageRanges = chunks
          .map(c => {
            const start = c.metadata?.pageStart || c.metadata?.page_start;
            const end = c.metadata?.pageEnd || c.metadata?.page_end;
            if (start && end) return `${start}-${end}`;
            if (start) return `página ${start}`;
            return null;
          })
          .filter(Boolean)
          .slice(0, 3); // Mostrar hasta 3 rangos de páginas
        const pageInfo = pageRanges.length > 0 ? ` (páginas: ${pageRanges.join(', ')})` : '';
        const sampleContent = firstChunk.content.substring(0, 150);
        return `- ${materialTitle}${pageInfo} (${chunkCount} fragmento${chunkCount > 1 ? 's' : ''}): ${sampleContent}...`;
      });

    // Construir contenido con información de páginas más visible y prominente
    const contentItemsWithPages = contentItems.map(item => {
      const pageStart = item.metadata?.pageStart || item.metadata?.page_start;
      const pageEnd = item.metadata?.pageEnd || item.metadata?.page_end;

      // Formato de páginas más prominente
      let pageInfo = '';
      if (pageStart && pageEnd && pageStart !== pageEnd) {
        pageInfo = `📄 PÁGINAS ${pageStart}-${pageEnd}`;
      } else if (pageStart) {
        pageInfo = `📄 PÁGINA ${pageStart}`;
      }

      // Construir fuente con información de material
      let sourceInfo = '';
      if (item.metadata?.material_title) {
        sourceInfo = item.metadata.material_title;
      } else if (item.metadata?.sourceFileName) {
        sourceInfo = item.metadata.sourceFileName;
      }

      // Formato mejorado: páginas primero, luego fuente
      const locationInfo = pageInfo
        ? (sourceInfo ? `${pageInfo} | Fuente: ${sourceInfo}` : pageInfo)
        : (sourceInfo ? `Fuente: ${sourceInfo}` : '');

      const header = locationInfo ? `[${locationInfo}]` : '';

      // Extraer contenido relevante basado en la consulta (busca palabras clave en lugar de solo mostrar inicio)
      // Esto es crucial cuando hay ruido de OCR al inicio del chunk
      const relevantContent = this.extractRelevantContent(item.content, query, 500);

      return `${header}\n- ${item.title}:\n  ${relevantContent}`;
    });

    const contentInfo = contentItems.length > 0
      ? `\nINFORMACIÓN DEL CURSO:\n- Título: ${courseTitle}\n- Descripción: ${courseDescription.substring(0, 200)}...\n\n${materialsList.length > 0 ? `LIBROS Y MATERIALES DISPONIBLES EN EL CURSO:\n${materialsList.join('\n')}\n\n` : ''}CONTENIDO RELEVANTE DEL CURSO (máx ${maxItems}):\n${contentItemsWithPages.join('\n\n')}`
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

    // Mensaje informativo para consultas complejas
    const complexQueryNote = isComplexQuery ? `
NOTA IMPORTANTE: Esta es una consulta compleja que requiere búsqueda en múltiples rangos de páginas. 
Al inicio de tu respuesta, menciona brevemente: "Estoy revisando el contenido de las páginas que mencionaste. 
Esto puede tomar un momento adicional para asegurarme de darte la información más completa."
` : '';

    return `
Eres un tutor virtual especializado en "${courseTitle}".

OBJETIVO: Enfócate en los temas principales del curso. Cuando encuentres información en material de apoyo, menciona las páginas exactas.

INFORMACIÓN DEL CURSO:
- Título: ${courseTitle}
- Descripción: ${courseDescription.substring(0, 150)}...
${moduleHint}

${studentInfo}
${pedagogicalInfo}
${contentInfo}
${recentContext}

Consulta: ${query}
${complexQueryNote}
INSTRUCCIONES:
1. SIEMPRE menciona las páginas cuando encuentres información (formato: [📄 PÁGINAS X-Y | Fuente: nombre])
2. Si es material de apoyo: indica material, páginas, resume brevemente y enfatiza que el objetivo del curso es lo principal
3. Si es contenido principal: responde completamente y menciona las páginas
4. Adapta al estilo de aprendizaje del estudiante
5. Responde en el mismo idioma de la consulta
6. Máximo 200 palabras
${isComplexQuery ? '7. Si la consulta es compleja, explica que estás revisando múltiples páginas para dar la mejor respuesta' : ''}

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
        const timeout = setTimeout(() => controller.abort(), attempt > 1 ? 25000 : 15000); // Más tiempo en reintentos

        // Aumentar tokens en el segundo intento si el primero falló por MAX_TOKENS
        const maxTokensForAttempt = attempt > 1 ? Math.min(this.maxOutputTokens * 2, 4096) : this.maxOutputTokens;

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
                maxOutputTokens: maxTokensForAttempt // Aumenta en reintentos para compensar thoughts tokens
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
            console.warn(`⚠️ MAX_TOKENS alcanzado sin texto (intento ${attempt}/${maxRetries}). Intentando reintento con más tokens...`);
            // Si es el primer intento, reintentar con más tokens
            if (attempt < maxRetries) {
              continue; // El siguiente intento usará más tokens (definido arriba)
            }
            // Si ya fue el último intento, devolver mensaje útil
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
            const totalCost = (inputTokens / 1000000) * 0.075 + (outputTokens / 1000000) * 0.30;

            await aiUsageService.recordUsage({
              userId: this.currentContext.studentId,
              courseId: this.currentContext.courseId ? parseInt(this.currentContext.courseId) : undefined,
              sessionId: undefined, // ConversationContext no incluye sessionId
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

            // Actualizar contadores de límites
            await supabase.rpc('update_user_query_usage', {
              p_user_id: this.currentContext.studentId,
              p_actual_cost: totalCost
            });
          }
        } catch (error) {
          // No fallar si no se puede guardar en BD
          console.warn('⚠️ No se pudo registrar uso en BD:', error);
        }

        clearTimeout(emergencyTimeout);
        try { this.lastResponseTail = text.slice(-200); } catch { }
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
    // Extraer fuentes con metadata para citas
    const sourcesWithMetadata = (sources || [])
      .filter((s: any) => s && s.title)
      .map((s: any) => ({
        id: s.originalId || s.id,
        title: s.title,
        url: s.url || s.file_url || s.source_url || null,
        type: s.type || 'material',
        unitId: s.unitId || null,
        sessionId: s.sessionId || null,
        courseId: s.courseId || null,
        metadata: s.metadata || null, // Incluir metadata para citas
      }));

    return {
      success: true,
      message: response,
      metadata: {
        model: this.model,
        source: 'A2A RAG Service',
        contextUsed: sources.map(s => s.title).join(', '),
        timestamp: new Date().toISOString(),
        confidence: 0.8, // Simulado
        sources: sourcesWithMetadata.map(s => s.title), // Títulos para compatibilidad
        sourceMetadata: sourcesWithMetadata, // Metadata completa para citas
        // Nuevos metadatos para UI
        truncated: (this as any).lastFinishReason === 'MAX_TOKENS',
        continuationHint: (this as any).lastResponseTail || ''
      } as any
    } as any;
  }

  /**
   * Genera clave de caché para una consulta
   */
  private generateCacheKey(query: string, context: ConversationContext): string {
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    // Versión del caché: incrementar cuando se actualicen funciones SQL o lógica de búsqueda
    const cacheVersion = 'v9'; // v9: Búsqueda híbrida implementada (inicial rápida + expansión por rangos de páginas)
    return `rag:${cacheVersion}:${context.courseId}:${context.studentId || 'anonymous'}:${normalizedQuery}`;
  }

  /**
   * Limpia todo el caché de respuestas (útil después de actualizar funciones SQL)
   */
  public clearCache(): void {
    this.responseCache.clear();
    this.embeddingCache.clear();
    console.log('🧹 RAGService: Caché limpiado');
  }

  /**
   * Obtiene respuesta desde caché si está disponible
   */
  private getCachedResponse(cacheKey: string): SupabaseResponse<RAGResponse> | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.RESPONSE_CACHE_TTL) {
      console.log('⚡ RAGService: Respuesta desde caché');
      return cached.data;
    }

    // Limpiar entrada expirada
    if (cached) {
      this.responseCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Guarda respuesta en caché
   */
  private saveToCache(cacheKey: string, response: SupabaseResponse<RAGResponse>): void {
    // Limpiar caché si está lleno
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      // Eliminar entradas más antiguas (FIFO)
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
  }

  /**
   * Agrega embedding al caché
   */
  private addToEmbeddingCache(key: string, embedding: number[]): void {
    // Limpiar caché si está lleno
    if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.embeddingCache.keys().next().value;
      if (oldestKey) {
        this.embeddingCache.delete(oldestKey);
      }
    }

    this.embeddingCache.set(key, {
      embedding,
      timestamp: Date.now()
    });
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

