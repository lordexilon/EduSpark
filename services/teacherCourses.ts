// services/teacherCourses.ts
// Servicios para gestión de cursos del docente

import { supabase, supabaseUrl } from '../lib/supabase';

export interface Course {
  id: number;
  title: string;
  code?: string;
  description?: string;
  teacher_id: string;
  status: 'active' | 'archived' | 'draft';
  // Campos agregados en Fase 1
  subject_id?: number;
  academic_period?: string;
  start_date?: string;
  end_date?: string;
  schedule?: any; // JSONB
  max_students?: number;
  created_at: string;
  updated_at: string;
}

export interface CourseUnit {
  id: string;
  course_id: number;
  number: number;
  title: string;
  description?: string;
  // Campos de contenido rico (agregados en script 31)
  content_html?: string;
  content_markdown?: string;
  learning_objectives?: string[];
  duration_hours?: number;
  order_index?: number;
  thumbnail_url?: string;
  created_at: string;
}

export interface Session {
  id: string;
  course_id: number;
  unit_id?: string;
  title: string;
  starts_at?: string;
  ends_at?: string;
  description?: string;
  // Campos de contenido rico (agregados en script 31)
  content_html?: string;
  content_markdown?: string;
  learning_objectives?: string[];
  activities?: Array<{
    id?: string;
    title: string;
    type: 'exercise' | 'practice' | 'quiz' | 'assignment' | 'other';
    description?: string;
    instructions?: string;
  }>;
  resources?: Array<{
    id?: string;
    title: string;
    type: 'video' | 'image' | 'link' | 'document' | 'interactive';
    url: string;
    thumbnail?: string;
  }>;
  duration_minutes?: number;
  order_index?: number;
  session_type?: 'lecture' | 'practice' | 'lab' | 'exam' | 'discussion' | 'workshop' | 'other';
  // Campos de Google Meet (agregados en script 88)
  google_meet_link?: string;
  google_calendar_event_id?: string;
  google_meet_recording_url?: string;
  auto_create_meet?: boolean;
  created_at: string;
}

export interface Material {
  id: string;
  course_id: number;
  unit_id?: string;
  session_id?: string;
  title: string;
  kind: 'markdown' | 'pdf' | 'link' | 'video' | 'other';
  url?: string;
  mime_type?: string;
  size_bytes?: number;
  metadata: Record<string, any>;
  created_at: string;
  // Campos de transcripción de video (agregados en script 100)
  transcription?: string;
  transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
  video_platform?: 'youtube' | 'vimeo' | 'other';
  video_id?: string;
  video_duration?: number;
  transcription_metadata?: Record<string, any>;
}

// Servicios de Cursos
export const courseService = {
  // Obtener todos los cursos del docente
  async getMyCourses(teacherId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener todos los cursos (para admin y coordinadores)
  async getAllCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener cursos por materia (subject_id)
  async getCoursesBySubject(subjectId: number): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Crear nuevo curso
  async createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .insert([course])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar curso
  async updateCourse(id: number, updates: Partial<Course>): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar curso
  async deleteCourse(id: number): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Obtener curso por ID
  async getCourse(id: number): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
};

// Servicios de Unidades
export const unitService = {
  // Obtener una unidad por ID
  async getUnit(id: string): Promise<CourseUnit> {
    const { data, error } = await supabase
      .from('course_units')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener unidades de un curso
  async getCourseUnits(courseId: number): Promise<CourseUnit[]> {
    const { data, error } = await supabase
      .from('course_units')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true, nullsLast: true })
      .order('number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear nueva unidad
  async createUnit(unit: Omit<CourseUnit, 'id' | 'created_at'>): Promise<CourseUnit> {
    // Limpiar campos undefined
    const cleanUnit: any = {};
    Object.keys(unit).forEach(key => {
      const value = (unit as any)[key];
      if (value !== undefined && value !== null) {
        // Manejar arrays
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleanUnit[key] = value;
          } else {
            cleanUnit[key] = null;
          }
        } else if (typeof value === 'string' && value.trim() === '') {
          if (key === 'description' || key === 'content_html' || key === 'content_markdown' || key === 'thumbnail_url') {
            cleanUnit[key] = null;
          }
        } else {
          cleanUnit[key] = value;
        }
      }
    });
    
    console.log('createUnit - Enviando nueva unidad:', {
      fields: Object.keys(cleanUnit),
      content_html_length: cleanUnit.content_html?.length || 0
    });
    
    try {
      const { data, error } = await supabase
        .from('course_units')
        .insert([cleanUnit])
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase en createUnit:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('createUnit - Respuesta exitosa:', { id: data?.id, title: data?.title });
      return data;
    } catch (err: any) {
      console.error('Excepción en createUnit:', err);
      throw err;
    }
  },

  // Actualizar unidad
  async updateUnit(id: string, updates: Partial<CourseUnit>): Promise<CourseUnit> {
    // Limpiar campos undefined para evitar errores
    const cleanUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      // Para campos de texto, permitir strings vacíos como null
      if (value !== undefined && value !== null) {
        // Manejar arrays (learning_objectives)
        if (Array.isArray(value)) {
          // Solo incluir si el array no está vacío
          if (value.length > 0) {
            cleanUpdates[key] = value;
          } else {
            // Array vacío lo convertimos a null
            cleanUpdates[key] = null;
          }
        } else if (typeof value === 'string' && value.trim() === '') {
          // Strings vacíos los convertimos a null para campos opcionales
          if (key === 'description' || key === 'content_html' || key === 'content_markdown' || key === 'thumbnail_url') {
            cleanUpdates[key] = null;
          }
        } else {
          cleanUpdates[key] = value;
        }
      }
    });
    
    console.log('updateUnit - Enviando actualización:', { 
      id, 
      fields: Object.keys(cleanUpdates),
      content_html_length: cleanUpdates.content_html?.length || 0,
      learning_objectives_count: Array.isArray(cleanUpdates.learning_objectives) ? cleanUpdates.learning_objectives.length : 0,
      cleanUpdates: { 
        ...cleanUpdates, 
        content_html: cleanUpdates.content_html ? `[${cleanUpdates.content_html.length} chars]` : undefined,
        learning_objectives: Array.isArray(cleanUpdates.learning_objectives) 
          ? `[${cleanUpdates.learning_objectives.length} objetivos]` 
          : undefined
      }
    });
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
    console.log('updateUnit - Iniciando petición a Supabase...');
    console.log('updateUnit - Campos a actualizar:', Object.keys(cleanUpdates));
    console.log('updateUnit - ID de unidad:', id);
    console.log('updateUnit - Tamaño total de datos:', JSON.stringify(cleanUpdates).length, 'bytes');
    
    // Separar content_html y learning_objectives del resto para debugging
    const { content_html, learning_objectives, ...otherUpdates } = cleanUpdates;
    console.log('updateUnit - Actualizando campos básicos:', Object.keys(otherUpdates));
    if (content_html) {
      console.log('updateUnit - content_html presente, tamaño:', content_html.length, 'caracteres');
    }
    if (Array.isArray(learning_objectives)) {
      console.log('updateUnit - learning_objectives presente:', {
        count: learning_objectives.length,
        total_length: learning_objectives.reduce((sum, obj) => sum + obj.length, 0),
        preview: learning_objectives.slice(0, 5).map(obj => obj.substring(0, 100)),
        serialized_size: JSON.stringify(learning_objectives).length,
        full_array: learning_objectives // Log completo para debugging
      });
    }
    
    // Crear timeout manual - aumentado a 30 segundos para operaciones con más datos
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error('⏱️ TIMEOUT activado en updateUnit después de 30 segundos');
        console.error('updateUnit - La petición HTTP parece estar colgada. Verifica:');
        console.error('  1. La consola del navegador (pestaña Network) para ver el estado de la petición');
        console.error('  2. Ejecuta el script 36_simplify_course_units_rls.sql para optimizar las políticas RLS');
        console.error('  3. Si hay algún trigger o constraint bloqueando la actualización');
        reject(new Error('TIMEOUT: La actualización tardó más de 30 segundos. Si esto persiste, ejecuta el script 36_simplify_course_units_rls.sql para optimizar las políticas RLS.'));
      }, 30000);
    });
    
    // Petición a Supabase con logging adicional
    const startTime = Date.now();
    console.log('updateUnit - Enviando UPDATE a Supabase a las', new Date().toISOString());
    
    // OPTIMIZACIÓN: Verificación de sesión completamente asíncrona (fire-and-forget)
    // No bloquea la operación UPDATE, Supabase maneja la autenticación automáticamente
    // Solo la usamos para logging diagnóstico, pero no esperamos su resultado
    (async () => {
      try {
        const sessionTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 1000) // Solo 1 segundo para diagnóstico
        );
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          sessionTimeout
        ]) as any;
        if (session) {
          console.log('updateUnit - ✅ Sesión activa (diagnóstico):', session.user.id.substring(0, 8) + '...');
        }
      } catch {
        // Ignorar completamente - no afecta la operación
      }
    })();
    
    // Preparar la petición UPDATE - Supabase manejará la autenticación automáticamente
    console.log('updateUnit - 🔄 Preparando petición UPDATE (Supabase manejará auth automáticamente)...');
    console.log('updateUnit - URL esperada:', `${supabaseUrl}/rest/v1/course_units?id=eq.${id}`);
    
    // Logging detallado del payload exacto que se enviará
    console.log('updateUnit - 📦 Payload completo (JSON):', JSON.stringify(cleanUpdates, null, 2));
    if (Array.isArray(cleanUpdates.learning_objectives)) {
      console.log('updateUnit - 📋 learning_objectives array:', {
        type: 'Array',
        length: cleanUpdates.learning_objectives.length,
        values: cleanUpdates.learning_objectives,
        stringified: JSON.stringify(cleanUpdates.learning_objectives)
      });
    }
    
    // ESTRATEGIA: Si hay learning_objectives con múltiples elementos, intentar actualización en dos pasos
    // Esto puede ayudar a evitar problemas de serialización cuando se combina con content_html
    // Nota: learning_objectives ya fue destructurado en la línea 284, lo reutilizamos aquí
    const hasMultipleObjectives = Array.isArray(learning_objectives) && learning_objectives.length > 1;
    const learningObjectivesArray = learning_objectives;
    
    // Construir otherFields sin learning_objectives (ya está separado de la línea 284)
    // Necesitamos reconstruir otherFields incluyendo content_html pero sin learning_objectives
    const otherFields = { ...otherUpdates };
    if (content_html) {
      otherFields.content_html = content_html;
    }
    
    // Crear la petición con mejor manejo de errores
    // Primero intentamos actualización normal (un solo paso)
    let supabasePromise: Promise<any>;
    
    if (hasMultipleObjectives) {
      console.log('updateUnit - 🔄 Detectados múltiples learning_objectives, usando función RPC');
      console.log('updateUnit - 📝 Paso 1: Actualizando learning_objectives vía RPC (evita problemas de serialización)');
      console.log('updateUnit - 📋 learning_objectives a actualizar:', JSON.stringify(learningObjectivesArray));
      const step1StartTime = Date.now();
      // Paso 1: Actualizar learning_objectives usando función RPC (evita problemas de serialización del array)
      supabasePromise = supabase
        .rpc('update_unit_learning_objectives', {
          unit_id: id,
          objectives: learningObjectivesArray
        })
        .then(async (result1) => {
          const step1Elapsed = Date.now() - step1StartTime;
          console.log(`updateUnit - ⏱️ Paso 1 (RPC) completado en ${step1Elapsed}ms`);
          if (result1.error) {
            console.error('updateUnit - ❌ Error en paso 1 (learning_objectives RPC):', result1.error);
            console.error('updateUnit - Error details:', result1.error);
            return { data: null, error: result1.error };
          }
          // La función RPC devuelve un array, tomar el primer elemento
          const rpcResult = Array.isArray(result1.data) && result1.data.length > 0 ? result1.data[0] : result1.data;
          console.log('updateUnit - ✅ Paso 1 completado (learning_objectives actualizados vía RPC):', rpcResult);
          console.log('updateUnit - 📝 Paso 2: Actualizando resto de campos (incluye content_html)');
          
          // Paso 2: Actualizar todos los demás campos (incluyendo content_html)
          const result2 = await supabase
            .from('course_units')
            .update(otherFields)
            .eq('id', id)
            .select()
            .single();
          
          if (result2.error) {
            console.error('updateUnit - ❌ Error en paso 2 (campos básicos):', result2.error);
            return result2;
          }
          console.log('updateUnit - ✅ Paso 2 completado (campos básicos actualizados)');
          
          return { data: result2.data, error: null };
        });
    } else {
      // Actualización normal (un solo paso)
      supabasePromise = supabase
        .from('course_units')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
    }
    
    // Agregar manejo de errores al promise
    supabasePromise = supabasePromise
      .then(result => {
        // Capturar cualquier error de red implícito
        if (!result && !result.error && !result.data) {
          console.error('updateUnit - ⚠️ Respuesta vacía o nula de Supabase');
        }
        return result;
      })
      .catch(error => {
        // Capturar errores de red o timeout del cliente
        console.error('updateUnit - ❌ Error capturado en promesa de Supabase:', error);
        console.error('updateUnit - Tipo de error:', error?.constructor?.name);
        console.error('updateUnit - Mensaje:', error?.message);
        throw error;
      });
    
    console.log('updateUnit - Esperando respuesta de Supabase...');
    console.log('updateUnit - 📋 DIAGNÓSTICO:');
    console.log('  - Si la petición se cuelga, revisa la pestaña Network en DevTools');
    console.log('  - Busca la petición a:', supabaseUrl.replace(/^https?:\/\//, ''));
    console.log('  - Verifica el estado HTTP (200, 401, 500, pending, etc.)');
    console.log('  - Verifica los headers de la petición (Authorization, Content-Type)');
      
      // Usar Promise.race para timeout
      const result = await Promise.race([
        supabasePromise
          .then(result => {
            const elapsed = Date.now() - startTime;
            console.log(`updateUnit - Supabase respondió después de ${elapsed}ms:`, result.error ? 'con error' : 'con éxito');
            if (result.error) {
              console.error('updateUnit - Error de Supabase:', result.error);
            } else {
              console.log('updateUnit - Datos recibidos:', { id: result.data?.id, title: result.data?.title });
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            return result;
          })
          .catch(err => {
            const elapsed = Date.now() - startTime;
            console.error(`updateUnit - Error en promesa de Supabase después de ${elapsed}ms:`, err);
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            throw err;
          }),
        timeoutPromise
      ]);
      
      const { data, error } = result as any;

      if (error) {
        console.error('❌ Error de Supabase en updateUnit:', error);
        console.error('Error details:', {
          message: error?.message || 'Sin mensaje',
          code: error?.code || 'Sin código',
          details: error?.details || 'Sin detalles',
          hint: error?.hint || 'Sin hint'
        });
        
        const errorMsg = error?.message || error?.code || 'Error desconocido';
        const fullError = new Error(`Error al actualizar unidad: ${errorMsg}`);
        (fullError as any).supabaseError = error;
        throw fullError;
      }
      
      if (!data) {
        console.error('❌ updateUnit - Respuesta sin datos');
        throw new Error('No se recibieron datos después de la actualización');
      }
      
      console.log('✅ updateUnit - Respuesta exitosa:', { id: data?.id, title: data?.title });
      return data;
    } catch (err: any) {
      console.error('❌ Excepción capturada en updateUnit');
      console.error('Error completo:', err);
      console.error('Tipo:', typeof err);
      console.error('Es Error?:', err instanceof Error);
      console.error('Message:', err?.message);
      console.error('Code:', err?.code);
      console.error('Stack:', err?.stack);
      
      // Limpiar timeout si existe
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Si es timeout, dar mensaje claro
      if (err?.message?.includes('TIMEOUT') || err?.code === 'TIMEOUT' || err?.message?.includes('tardó')) {
        const timeoutError = new Error('La operación tardó demasiado tiempo. Intenta guardar contenido más pequeño o verifica tu conexión a internet.');
        console.error('⏱️ Lanzando error de timeout');
        throw timeoutError;
      }
      
      // Si ya es un Error con mensaje, re-lanzarlo
      if (err instanceof Error && err.message) {
        console.error('Re-lanzando Error:', err.message);
        throw err;
      }
      
      // Si tiene mensaje como propiedad
      if (err?.message) {
        console.error('Lanzando error con mensaje:', err.message);
        throw new Error(err.message);
      }
      
      // Si es un objeto, intentar serializarlo
      try {
        const errorStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
        console.error('Lanzando error serializado:', errorStr);
        throw new Error(`Error al actualizar: ${errorStr}`);
      } catch {
        console.error('No se pudo serializar el error');
        throw new Error('Error desconocido al actualizar la unidad');
      }
    }
  },

  // Eliminar unidad
  async deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('course_units')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Servicios de Sesiones
export const sessionService = {
  // Obtener una sesión por ID
  async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Obtener sesiones de un curso
  async getCourseSessions(courseId: number): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true, nullsLast: true })
      .order('starts_at', { ascending: true, nullsLast: true });

    if (error) throw error;
    return data || [];
  },

  // Crear nueva sesión
  async createSession(session: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    // Limpiar campos undefined
    const cleanSession: any = {};
    Object.keys(session).forEach(key => {
      const value = (session as any)[key];
      if (value !== undefined && value !== null) {
        // Manejar arrays
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleanSession[key] = value;
          } else {
            cleanSession[key] = null;
          }
        } else if (typeof value === 'string' && value.trim() === '') {
          if (key === 'description' || key === 'content_html' || key === 'content_markdown') {
            cleanSession[key] = null;
          }
        } else if (key === 'activities' || key === 'resources') {
          // JSONB fields
          if (value && typeof value === 'object') {
            cleanSession[key] = value;
          } else {
            cleanSession[key] = null;
          }
        } else {
          cleanSession[key] = value;
        }
      }
    });
    
    console.log('createSession - Enviando nueva sesión:', {
      fields: Object.keys(cleanSession),
      content_html_length: cleanSession.content_html?.length || 0
    });
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([cleanSession])
        .select()
        .single();

      if (error) {
        console.error('Error de Supabase en createSession:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('createSession - Respuesta exitosa:', { id: data?.id, title: data?.title });
      return data;
    } catch (err: any) {
      console.error('Excepción en createSession:', err);
      throw err;
    }
  },

  // Actualizar sesión
  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    // Limpiar campos undefined
    const cleanUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined && value !== null) {
        // Manejar arrays
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleanUpdates[key] = value;
          } else {
            cleanUpdates[key] = null;
          }
        } else if (typeof value === 'string' && value.trim() === '') {
          if (key === 'description' || key === 'content_html' || key === 'content_markdown') {
            cleanUpdates[key] = null;
          }
        } else if (key === 'activities' || key === 'resources') {
          // JSONB fields
          if (value && typeof value === 'object') {
            cleanUpdates[key] = value;
          } else {
            cleanUpdates[key] = null;
          }
        } else {
          cleanUpdates[key] = value;
        }
      }
    });
    
    console.log('updateSession - Enviando actualización:', { 
      id, 
      fields: Object.keys(cleanUpdates),
      content_html_length: cleanUpdates.content_html?.length || 0,
      cleanUpdates: { ...cleanUpdates, content_html: cleanUpdates.content_html ? `[${cleanUpdates.content_html.length} chars]` : undefined }
    });
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('updateSession - Iniciando petición a Supabase...');
      console.log('updateSession - Campos a actualizar:', Object.keys(cleanUpdates));
      
      // Crear timeout manual
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error('⏱️ TIMEOUT activado en updateSession después de 20 segundos');
          reject(new Error('TIMEOUT: La actualización tardó más de 20 segundos. Verifica tu conexión o intenta con menos contenido.'));
        }, 20000);
      });
      
      // Petición a Supabase
      const supabasePromise = supabase
        .from('sessions')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      
      console.log('updateSession - Esperando respuesta de Supabase...');
      
      // Usar Promise.race para timeout
      const result = await Promise.race([
        supabasePromise
          .then(result => {
            console.log('updateSession - Supabase respondió:', result.error ? 'con error' : 'con éxito');
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            return result;
          })
          .catch(err => {
            console.error('updateSession - Error en promesa de Supabase:', err);
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            throw err;
          }),
        timeoutPromise
      ]);
      
      const { data, error } = result as any;

      if (error) {
        console.error('❌ Error de Supabase en updateSession:', error);
        console.error('Error details:', {
          message: error?.message || 'Sin mensaje',
          code: error?.code || 'Sin código',
          details: error?.details || 'Sin detalles',
          hint: error?.hint || 'Sin hint'
        });
        
        const errorMsg = error?.message || error?.code || 'Error desconocido';
        const fullError = new Error(`Error al actualizar sesión: ${errorMsg}`);
        (fullError as any).supabaseError = error;
        throw fullError;
      }
      
      if (!data) {
        console.error('❌ updateSession - Respuesta sin datos');
        throw new Error('No se recibieron datos después de la actualización');
      }
      
      console.log('✅ updateSession - Respuesta exitosa:', { id: data?.id, title: data?.title });
      return data;
    } catch (err: any) {
      console.error('❌ Excepción capturada en updateSession');
      console.error('Error completo:', err);
      console.error('Tipo:', typeof err);
      console.error('Es Error?:', err instanceof Error);
      console.error('Message:', err?.message);
      console.error('Code:', err?.code);
      console.error('Stack:', err?.stack);
      
      // Limpiar timeout si existe
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Si es timeout
      if (err?.message?.includes('TIMEOUT') || err?.code === 'TIMEOUT' || err?.message?.includes('tardó')) {
        const timeoutError = new Error('La operación tardó demasiado tiempo. Intenta guardar contenido más pequeño o verifica tu conexión.');
        console.error('⏱️ Lanzando error de timeout');
        throw timeoutError;
      }
      
      // Si ya es un Error con mensaje
      if (err instanceof Error && err.message) {
        console.error('Re-lanzando Error:', err.message);
        throw err;
      }
      
      // Si tiene mensaje como propiedad
      if (err?.message) {
        console.error('Lanzando error con mensaje:', err.message);
        throw new Error(err.message);
      }
      
      // Si es un objeto, intentar serializarlo
      try {
        const errorStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
        console.error('Lanzando error serializado:', errorStr);
        throw new Error(`Error al actualizar: ${errorStr}`);
      } catch {
        console.error('No se pudo serializar el error');
        throw new Error('Error desconocido al actualizar la sesión');
      }
    }
  },

  // Eliminar sesión
  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Servicios de Materiales
export const materialService = {
  // Obtener materiales de un curso
  async getCourseMaterials(courseId: number): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener materiales de una unidad
  async getUnitMaterials(unitId: string): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Crear nuevo material
  async createMaterial(material: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .insert([material])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar material
  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar material
  async deleteMaterial(id: string): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
