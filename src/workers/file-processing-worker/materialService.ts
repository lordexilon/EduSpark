// workers/file-processing-worker/materialService.ts
// Servicio para actualizar el estado de materiales en Supabase

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
 * Obtiene información del material incluyendo unit_id y session_id
 */
export async function getMaterialInfo(materialId: string): Promise<{
  course_id: number | string;
  unit_id: string | null;
  session_id: string | null;
} | null> {
  const supabase = initializeSupabase();

  const { data, error } = await supabase
    .from('materials')
    .select('course_id, unit_id, session_id')
    .eq('id', materialId)
    .single();

  if (error) {
    console.error(`Error obteniendo información del material ${materialId}:`, error);
    return null;
  }

  return data;
}

/**
 * Actualiza el estado RAG de un material cuando se completa el procesamiento
 */
export async function updateMaterialRagStatus(
  materialId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const supabase = initializeSupabase();

  const updateData: Record<string, any> = {
    rag_status: status,
  };

  if (errorMessage) {
    updateData.metadata = { errorMessage };
  }

  const { error } = await (supabase
    .from('materials') as any)
    .update(updateData)
    .eq('id', materialId);

  if (error) {
    console.error(`Error actualizando estado RAG del material ${materialId}:`, error);
    // No lanzar error para no interrumpir el procesamiento
  }
}

