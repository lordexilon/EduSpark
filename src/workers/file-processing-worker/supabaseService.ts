// workers/file-processing-worker/supabaseService.ts
// Servicio para interactuar con Supabase

import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Inicializa cliente de Supabase
 */
function initializeSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
  }

  supabaseClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Guarda un chunk con embedding en Supabase
 */
export async function saveChunk(
  courseId: string,
  content: string,
  embedding: number[],
  metadata: {
    sourceFileName: string;
    pageStart: number;
    pageEnd: number;
    chunkIndex: number;
    pdfType?: string;
    ocrUsed?: boolean;
    category?: string; // Categoría del material (book, bibliography, syllabus, other)
    materialId?: string; // ID del material en Supabase
    unitId?: string; // ID de la unidad
    sessionId?: string; // ID de la sesión
  }
): Promise<void> {
  const supabase = initializeSupabase();

  // Convertir courseId a número si es posible (para compatibilidad con INTEGER)
  const courseIdValue = isNaN(Number(courseId)) ? courseId : Number(courseId);
  
  // Formato correcto para pgvector: array de números directamente
  // Supabase con pgvector acepta arrays de números directamente

  const chunkData: any = {
    course_id: courseIdValue,
    content,
    embedding: embedding, // Array de números directamente
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
    },
    chunk_index: metadata.chunkIndex,
    created_at: new Date().toISOString(),
  };

  // Agregar unit_id y session_id si están disponibles
  if (metadata.unitId) {
    chunkData.unit_id = metadata.unitId;
  }
  if (metadata.sessionId) {
    chunkData.session_id = metadata.sessionId;
  }
  // Guardar material_id en metadata para referencia
  if (metadata.materialId) {
    chunkData.metadata.material_id = metadata.materialId;
  }

  const { error } = await supabase.from('course_content_chunks').insert(chunkData);

  if (error) {
    throw new Error(`Error guardando chunk: ${error.message}`);
  }
}

/**
 * Guarda múltiples chunks en batch
 */
export async function saveChunksBatch(
  chunks: Array<{
    courseId: string;
    content: string;
    embedding: number[];
    metadata: {
      sourceFileName: string;
      pageStart: number;
      pageEnd: number;
      chunkIndex: number;
      pdfType?: string;
      ocrUsed?: boolean;
      category?: string; // Categoría del material
      materialId?: string; // ID del material en Supabase
      unitId?: string; // ID de la unidad
      sessionId?: string; // ID de la sesión
    };
  }>
): Promise<void> {
  const supabase = initializeSupabase();

  const records = chunks.map(chunk => {
    // Convertir courseId a número si es posible (para compatibilidad con INTEGER)
    const courseIdValue = isNaN(Number(chunk.courseId)) ? chunk.courseId : Number(chunk.courseId);
    
    const record: any = {
      course_id: courseIdValue,
      content: chunk.content,
      embedding: chunk.embedding, // Array de números directamente
      metadata: {
        ...chunk.metadata,
        createdAt: new Date().toISOString(),
      },
      chunk_index: chunk.metadata.chunkIndex,
      created_at: new Date().toISOString(),
    };

    // Agregar unit_id y session_id si están disponibles
    if (chunk.metadata.unitId) {
      record.unit_id = chunk.metadata.unitId;
    }
    if (chunk.metadata.sessionId) {
      record.session_id = chunk.metadata.sessionId;
    }
    // Guardar material_id en metadata para referencia
    if (chunk.metadata.materialId) {
      record.metadata.material_id = chunk.metadata.materialId;
    }

    return record;
  });

  const { error } = await supabase.from('course_content_chunks').insert(records as any);

  if (error) {
    throw new Error(`Error guardando chunks: ${error.message}`);
  }
}

