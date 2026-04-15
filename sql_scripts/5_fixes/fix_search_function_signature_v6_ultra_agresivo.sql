-- =====================================================
-- FIX: Estrategia Ultra Agresiva - LIMIT MUY TEMPRANO
-- Problema: Cualquier búsqueda sobre 55,473 chunks causa timeout
-- Solución: Aplicar LIMIT ANTES de cualquier filtro complejo
-- =====================================================

-- Eliminar TODAS las versiones de la función (para evitar confusión)
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

-- Crear función con LIMIT ULTRA TEMPRANO
CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 30,
  min_relevance DOUBLE PRECISION DEFAULT 0.001  -- Ignorado, mantenido para compatibilidad
)
RETURNS TABLE(
  id uuid,
  course_id integer,
  content text,
  embedding vector(768),
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH limited_chunks AS (
    -- ESTRATEGIA ULTRA AGRESIVA: Filtrar por course_id y aplicar LIMIT INMEDIATAMENTE
    -- Esto reduce el dataset de 55,473 a solo los chunks del curso (mucho menos)
    SELECT 
      ccc.id,
      ccc.course_id,
      ccc.content,
      ccc.embedding,
      ccc.metadata,
      ccc.created_at
    FROM course_content_chunks ccc
    WHERE ccc.course_id = course_id_param
    -- LIMIT MUY TEMPRANO: Solo procesar 200 chunks máximo
    ORDER BY ccc.created_at DESC
    LIMIT 200
  )
  SELECT 
    lc.id,
    lc.course_id,
    lc.content,
    lc.embedding,
    lc.metadata,
    lc.created_at
  FROM limited_chunks lc
  WHERE 
    -- Ahora aplicar el filtro de búsqueda solo sobre los 200 chunks (MUCHO MÁS RÁPIDO)
    to_tsvector('spanish', COALESCE(lc.content, '')) @@ websearch_to_tsquery('spanish', search_query)
  ORDER BY lc.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Índice para course_id (CRÍTICO para esta estrategia)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Índice para created_at (acelera el ORDER BY)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_created_at 
ON course_content_chunks(created_at DESC);

-- Índice compuesto para course_id + created_at (ÓPTIMO para esta query)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_created 
ON course_content_chunks(course_id, created_at DESC);

-- Comentario sobre la función
COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS 
'Búsqueda ULTRA AGRESIVA: Aplica LIMIT (200) ANTES del filtro full-text. Reduce dataset de 55,473 a 200 chunks primero, luego busca. El boost por material se hace en TypeScript.';
