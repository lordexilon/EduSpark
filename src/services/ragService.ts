// services/ragService.ts
// ⚠️ DEPRECADO: Este servicio usa n8n y está siendo reemplazado por agentService.ts (A2A)
// Por favor, usa getAgentAssistantResponse de agentService.ts en su lugar
// Este archivo se mantiene solo para compatibilidad temporal

// =====================================================
// CONFIGURACIÓN Y CONSTANTES
// =====================================================

// DEPRECADO: Usar VITE_A2A_COORDINATOR_URL en agentService.ts
const N8N_WEBHOOK_URL = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || 'https://applicandola.auto.hostybee.com/webhook/tutor-chat';

// Configuración de caché (inspirada en AOIGO)
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutos por defecto
  maxCacheSize: 100, // Máximo de entradas en caché
  similarityThreshold: 0.85, // Umbral de similitud para reutilizar caché
};

// Configuración de agendamiento
const SCHEDULING_CONFIG = {
  maxConcurrentQueries: 3, // Máximo de consultas concurrentes
  queueTimeout: 30000, // Timeout para consultas en cola
  priorityLevels: {
    high: 1,
    normal: 2,
    low: 3,
  },
};

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface RAGRequest {
  question: string;
  courseId: string;
  studentId?: string;
  conversationId?: string;
  moduleId?: string;
  studentProfile?: {
    preferredLearningStyle?: string;
    topicsStruggled?: string[];
    topicsMastered?: string[];
    interactionCount?: number;
  };
  studentProgress?: {
    completionPercentage?: number;
    lastAccessAt?: string;
  };
  courseContext?: {
    title?: string;
    teacherId?: string;
    moduleId?: string;
    sessionId?: string;
  };
  priority?: 'high' | 'normal' | 'low';
  skipCache?: boolean;
  metadata?: Record<string, unknown>;
}

interface RAGResponse {
  answer: string;
  metadata?: {
    cached?: boolean;
    cacheKey?: string;
    sources?: string[];
    confidence?: number;
    processingTime?: number;
    timestamp: string;
    model?: string;
  };
}

interface CacheEntry {
  key: string;
  response: RAGResponse;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface QueuedQuery {
  request: RAGRequest;
  resolve: (response: RAGResponse) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
}

// =====================================================
// GESTIÓN DE CACHÉ INTELIGENTE
// =====================================================

class IntelligentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // Para implementar LRU

  /**
   * Genera una clave de caché basada en la consulta y contexto
   */
  generateCacheKey(request: RAGRequest): string {
    // Normalizar pregunta (lowercase, sin espacios extra)
    const normalizedQuestion = request.question.toLowerCase().trim().replace(/\s+/g, ' ');

    // Crear clave basada en pregunta, curso y perfil del estudiante
    const keyParts = [
      normalizedQuestion,
      request.courseId,
      request.studentId || 'anonymous',
      request.moduleId || 'all',
      // Incluir temas con dificultad para personalización
      request.studentProfile?.topicsStruggled?.join(',') || '',
    ];

    return `rag_${this.hashString(keyParts.join('|'))}`;
  }

  /**
   * Hash simple para generar claves únicas
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit entero
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calcula similitud entre dos preguntas (simple, basado en palabras clave)
   */
  calculateSimilarity(question1: string, question2: string): number {
    const words1 = new Set(question1.toLowerCase().split(/\s+/));
    const words2 = new Set(question2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Busca en caché con similitud semántica
   */
  findSimilar(query: string, courseId: string): CacheEntry | null {
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.cache.values()) {
      // Solo buscar en el mismo curso
      const entryCourseId = entry.key.split('|')[1];
      if (entryCourseId !== courseId) continue;

      // Verificar si no está expirado
      if (Date.now() - entry.timestamp > entry.ttl) continue;

      // Calcular similitud (simplificado - en producción usar embeddings)
      const similarity = this.calculateSimilarity(query, entry.response.answer);

      if (similarity > bestSimilarity && similarity >= CACHE_CONFIG.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }

  /**
   * Obtiene entrada del caché
   */
  get(key: string): RAGResponse | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Verificar expiración
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return null;
    }

    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Mover al final (LRU)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    return entry.response;
  }

  /**
   * Guarda entrada en caché
   */
  set(key: string, response: RAGResponse, ttl: number = CACHE_CONFIG.defaultTTL): void {
    // Si el caché está lleno, eliminar el menos usado (LRU)
    if (this.cache.size >= CACHE_CONFIG.maxCacheSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry = {
      key,
      response,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  /**
   * Limpia el caché expirado
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.maxCacheSize,
      entries: Array.from(this.cache.values()).map(e => ({
        key: e.key,
        accessCount: e.accessCount,
        age: Date.now() - e.timestamp,
      })),
    };
  }
}

// =====================================================
// GESTIÓN DE COLAS Y AGENDAMIENTO
// =====================================================

class QueryScheduler {
  private queue: QueuedQuery[] = [];
  private activeQueries: number = 0;
  private processing: boolean = false;

  /**
   * Agrega una consulta a la cola con prioridad
   */
  async enqueue(request: RAGRequest): Promise<RAGResponse> {
    return new Promise((resolve, reject) => {
      const priority = SCHEDULING_CONFIG.priorityLevels[request.priority || 'normal'];

      const queuedQuery: QueuedQuery = {
        request,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Insertar en orden de prioridad
      const insertIndex = this.queue.findIndex(q => q.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(queuedQuery);
      } else {
        this.queue.splice(insertIndex, 0, queuedQuery);
      }

      // Verificar timeout
      setTimeout(() => {
        const index = this.queue.findIndex(q => q === queuedQuery);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error('Query timeout en cola'));
        }
      }, SCHEDULING_CONFIG.queueTimeout);

      // Iniciar procesamiento si no está activo
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Procesa la cola de consultas
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeQueries < SCHEDULING_CONFIG.maxConcurrentQueries) {
      const queuedQuery = this.queue.shift();
      if (!queuedQuery) break;

      this.activeQueries++;

      // Procesar en paralelo
      this.executeQuery(queuedQuery).finally(() => {
        this.activeQueries--;
        // Continuar procesando cola
        if (this.queue.length > 0) {
          this.processQueue();
        } else {
          this.processing = false;
        }
      });
    }

    if (this.queue.length === 0) {
      this.processing = false;
    }
  }

  /**
   * Ejecuta una consulta individual
   */
  private async executeQuery(queuedQuery: QueuedQuery): Promise<void> {
    try {
      const response = await executeRAGQuery(queuedQuery.request);
      queuedQuery.resolve(response);
    } catch (error) {
      queuedQuery.reject(error instanceof Error ? error : new Error('Error desconocido'));
    }
  }

  /**
   * Obtiene estadísticas de la cola
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      activeQueries: this.activeQueries,
      maxConcurrent: SCHEDULING_CONFIG.maxConcurrentQueries,
    };
  }
}

// =====================================================
// INSTANCIAS GLOBALES
// =====================================================

const cache = new IntelligentCache();
const scheduler = new QueryScheduler();

// Limpiar caché expirado cada 5 minutos
setInterval(() => {
  cache.cleanExpired();
}, 5 * 60 * 1000);

// =====================================================
// FUNCIONES DE REINTENTOS (inspiradas en AOIGO)
// =====================================================

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { attempts = 4, baseDelayMs = 1000, timeoutMs = 15000 } = options;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(`❌ RAGService: Intento ${attempt}/${attempts} HTTP ${response.status}. Cuerpo:`, errorBody);
        lastError = new Error(`HTTP ${response.status}: ${errorBody.substring(0, 100)}`);

        // No reintentar errores 4xx (errores del cliente)
        if (response.status >= 400 && response.status < 500) {
          throw lastError;
        }
      } else {
        console.log(`✅ RAGService: Solicitud exitosa en intento ${attempt}`);
        return response;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // Backoff exponencial
      const delay = baseDelayMs * Math.pow(2, attempt - 1);

      if (attempt < attempts) {
        console.warn(`⚠️ RAGService: Intento ${attempt} falló (${String(err)}). Reintentando en ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Fallo tras reintentos');
}

// =====================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN
// =====================================================

/**
 * Ejecuta una consulta RAG directamente (sin caché ni cola)
 */
async function executeRAGQuery(request: RAGRequest): Promise<RAGResponse> {
  const startTime = Date.now();

  // DEPRECADO: Este servicio está siendo reemplazado por agentService.ts
  if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes('YOUR_N8N_INSTANCE_URL')) {
    throw new Error('⚠️ DEPRECADO: Este servicio usa n8n. Por favor, usa agentService.ts con VITE_A2A_COORDINATOR_URL configurado.');
  }

  // Construir payload optimizado con datos del sistema
  const payload = {
    question: request.question,
    courseId: request.courseId,
    // Datos del estudiante para personalización
    studentId: request.studentId,
    studentProfile: request.studentProfile,
    studentProgress: request.studentProgress,
    // Contexto del curso
    courseContext: request.courseContext,
    // Metadata adicional
    conversationId: request.conversationId,
    metadata: {
      ...request.metadata,
      sessionId: request.courseContext?.sessionId,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('📤 RAGService: Enviando consulta optimizada:', {
    courseId: request.courseId,
    hasProfile: !!request.studentProfile,
    hasProgress: !!request.studentProgress,
    hasContext: !!request.courseContext,
  });

  const response = await fetchWithRetry(
    N8N_WEBHOOK_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Source': 'eduspark-rag-service',
        'X-Course-Id': request.courseId,
      },
      body: JSON.stringify(payload),
    },
    { attempts: 3, baseDelayMs: 500, timeoutMs: 20000 }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ RAGService (DEPRECADO - usar agentService): Error en respuesta de n8n:', response.status, errorBody);
    throw new Error(`El servidor respondió con un error: ${response.status}`);
  }

  const data = await response.json();
  const processingTime = Date.now() - startTime;

  if (!data.answer && !data.message) {
    console.error('❌ RAGService: Respuesta sin "answer" o "message":', data);
    throw new Error('Respuesta inesperada del asistente.');
  }

  const ragResponse: RAGResponse = {
    answer: data.answer || data.message || '',
    metadata: {
      processingTime,
      timestamp: new Date().toISOString(),
      sources: data.sources || data.metadata?.sources,
      confidence: data.confidence || data.metadata?.confidence,
      model: data.model || data.metadata?.model,
    },
  };

  console.log('✅ RAGService: Respuesta recibida:', {
    answerLength: ragResponse.answer.length,
    processingTime: `${processingTime}ms`,
    hasSources: !!ragResponse.metadata?.sources,
  });

  return ragResponse;
}

// =====================================================
// FUNCIÓN PRINCIPAL EXPORTADA
// =====================================================

/**
 * Obtiene respuesta del asistente RAG con optimizaciones inteligentes
 * 
 * Características:
 * - Caché inteligente con similitud semántica
 * - Agendamiento de consultas con prioridades
 * - Uso eficiente de datos del sistema
 * - Reintentos automáticos con backoff exponencial
 * 
 * @param question - Pregunta del usuario
 * @param courseId - ID del curso
 * @param options - Opciones adicionales:
 *   - studentId: ID del estudiante (para obtener perfil automáticamente)
 *   - conversationId: ID de conversación para contexto continuo
 *   - studentProfile: Perfil del estudiante (se obtiene automáticamente si se proporciona studentId)
 *   - studentProgress: Progreso del estudiante (se obtiene automáticamente si se proporciona studentId)
 *   - courseContext: Contexto del curso (se obtiene automáticamente)
 *   - priority: Prioridad de la consulta ('high' | 'normal' | 'low')
 *   - skipCache: Si es true, omite el caché
 *   - skipAutoFetch: Si es true, no obtiene datos automáticamente
 */
export async function getAiAssistantResponse(
  question: string,
  courseId: string,
  options: {
    studentId?: string;
    conversationId?: string;
    moduleId?: string;
    sessionId?: string;
    studentProfile?: RAGRequest['studentProfile'];
    studentProgress?: RAGRequest['studentProgress'];
    courseContext?: RAGRequest['courseContext'];
    priority?: 'high' | 'normal' | 'low';
    skipCache?: boolean;
    skipAutoFetch?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<string> {
  // Validación
  if (!question || !question.trim()) {
    throw new Error('La pregunta no puede estar vacía');
  }

  if (!courseId) {
    throw new Error('El courseId es requerido');
  }

  const startTime = Date.now();

  // Obtener datos del sistema automáticamente si no se proporcionaron
  let finalStudentProfile = options.studentProfile;
  let finalStudentProgress = options.studentProgress;
  let finalCourseContext = options.courseContext;

  if (!options.skipAutoFetch && options.studentId && courseId) {
    try {
      const [profile, progress, context] = await Promise.all([
        options.studentProfile ? Promise.resolve(null) : getStudentProfile(options.studentId, courseId),
        options.studentProgress ? Promise.resolve(null) : getStudentProgress(options.studentId, courseId),
        options.courseContext ? Promise.resolve(null) : getCourseContext(courseId),
      ]);

      if (!finalStudentProfile && profile) finalStudentProfile = profile;
      if (!finalStudentProgress && progress) finalStudentProgress = progress;
      if (!finalCourseContext && context) finalCourseContext = context;
    } catch (error) {
      console.warn('⚠️ RAGService: Error obteniendo datos del sistema:', error);
    }
  } else if (!options.skipAutoFetch && courseId) {
    try {
      finalCourseContext = await getCourseContext(courseId);
    } catch (error) {
      console.warn('⚠️ RAGService: Error obteniendo contexto del curso:', error);
    }
  }

  // Construir request completo
  const request: RAGRequest = {
    question: question.trim(),
    courseId,
    studentId: options.studentId,
    conversationId: options.conversationId,
    moduleId: options.moduleId,
    studentProfile: finalStudentProfile,
    studentProgress: finalStudentProgress,
    courseContext: finalCourseContext ? {
      ...finalCourseContext,
      sessionId: options.sessionId,
    } : options.sessionId ? {
      sessionId: options.sessionId,
    } : undefined,
    priority: options.priority || 'normal',
    skipCache: options.skipCache,
    metadata: {
      ...options.metadata,
      sessionId: options.sessionId,
    },
  };

  // Verificar caché si no se omite
  if (!options.skipCache) {
    const cacheKey = cache.generateCacheKey(request);
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      console.log('⚡ RAGService: Respuesta desde caché:', { cacheKey });
      return cachedResponse.answer;
    }

    // Buscar respuesta similar
    const similarEntry = cache.findSimilar(question, courseId);
    if (similarEntry) {
      console.log('🔍 RAGService: Respuesta similar encontrada en caché');
      return similarEntry.response.answer;
    }
  }

  // Ejecutar consulta (con agendamiento si es necesario)
  let response: RAGResponse;

  if (options.priority === 'high' || scheduler.getStats().queueLength === 0) {
    // Ejecutar inmediatamente si es alta prioridad o no hay cola
    response = await executeRAGQuery(request);
  } else {
    // Agendar consulta
    console.log('📋 RAGService: Consulta agendada en cola:', {
      priority: options.priority,
      queueLength: scheduler.getStats().queueLength,
    });
    response = await scheduler.enqueue(request);
  }

  // Guardar en caché
  if (!options.skipCache) {
    const cacheKey = cache.generateCacheKey(request);
    // TTL más largo para respuestas de alta calidad
    const ttl = response.metadata?.confidence && response.metadata.confidence > 0.8
      ? CACHE_CONFIG.defaultTTL * 2
      : CACHE_CONFIG.defaultTTL;

    cache.set(cacheKey, response, ttl);
  }

  const totalTime = Date.now() - startTime;
  console.log('✅ RAGService: Consulta completada:', {
    totalTime: `${totalTime}ms`,
    cached: false,
    queued: options.priority !== 'high',
  });

  return response.answer;
}

// =====================================================
// FUNCIONES AUXILIARES PARA DATOS DEL SISTEMA
// =====================================================

/**
 * Obtiene el perfil del estudiante desde Supabase
 */
async function getStudentProfile(
  studentId: string,
  courseId: string
): Promise<RAGRequest['studentProfile'] | null> {
  try {
    const { getStudentProfile } = await import('../../audio-tutor/services/supabaseService');
    const result = await getStudentProfile(studentId, courseId);

    if (result.success && result.data) {
      return {
        preferredLearningStyle: result.data.preferredLearningStyle,
        topicsStruggled: result.data.topicsStruggled,
        topicsMastered: result.data.topicsMastered,
        interactionCount: result.data.interactionCount,
      };
    }
  } catch (error) {
    console.warn('⚠️ RAGService: Error obteniendo perfil del estudiante:', error);
  }
  return null;
}

/**
 * Obtiene el progreso del estudiante
 */
async function getStudentProgress(
  studentId: string,
  courseId: string
): Promise<RAGRequest['studentProgress'] | null> {
  try {
    const { supabase } = await import('../lib/supabase');
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    if (isNaN(courseIdNum)) return null;

    const { data } = await supabase
      .from('course_enrollments')
      .select('completion_percentage, last_access_at')
      .eq('student_id', studentId)
      .eq('course_id', courseIdNum)
      .maybeSingle();

    if (data) {
      return {
        completionPercentage: data.completion_percentage || 0,
        lastAccessAt: data.last_access_at,
      };
    }
  } catch (error) {
    console.warn('⚠️ RAGService: Error obteniendo progreso:', error);
  }
  return null;
}

/**
 * Obtiene el contexto del curso
 */
async function getCourseContext(courseId: string): Promise<RAGRequest['courseContext'] | null> {
  try {
    const { supabase } = await import('../lib/supabase');
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;

    if (isNaN(courseIdNum)) return null;

    const { data } = await supabase
      .from('courses')
      .select('id, title, teacher_id')
      .eq('id', courseIdNum)
      .maybeSingle();

    if (data) {
      return {
        title: data.title,
        teacherId: data.teacher_id,
      };
    }
  } catch (error) {
    console.warn('⚠️ RAGService: Error obteniendo contexto del curso:', error);
  }
  return null;
}

// =====================================================
// FUNCIONES DE UTILIDAD EXPORTADAS
// =====================================================

/**
 * Limpia el caché del servicio RAG
 */
export function clearRAGCache(): void {
  cache.clear();
  console.log('🧹 RAGService: Caché limpiado');
}

/**
 * Obtiene estadísticas del servicio RAG
 */
export function getRAGStats() {
  return {
    cache: cache.getStats(),
    scheduler: scheduler.getStats(),
  };
}
