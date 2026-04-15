-- =====================================================
-- FIX: Corregir función search_course_content_chunks_text_clean (VERSIÓN ULTRA SIMPLE)
-- Problema: Incluso con LIMIT temprano, calcular ts_rank causa timeout
-- Solución: Eliminar ts_rank temporalmente, solo filtrar y aplicar LIMIT
-- =====================================================

-- Eliminar TODAS las versiones de la función (para evitar confusión)
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

-- Crear función ULTRA SIMPLE (sin ts_rank, solo filtro y LIMIT)
CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 30,
  min_relevance DOUBLE PRECISION DEFAULT 0.001
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
  SELECT 
    ccc.id,
    ccc.course_id,
    ccc.content,
    ccc.embedding,
    ccc.metadata,
    ccc.created_at
  FROM course_content_chunks ccc
  WHERE 
    ccc.course_id = course_id_param
    AND to_tsvector('spanish', COALESCE(ccc.content, '')) @@ websearch_to_tsquery('spanish', search_query)
  ORDER BY ccc.created_at DESC  -- Ordenar por fecha (simple y rápido)
  LIMIT result_limit;
END;
$$;

-- Asegurar que existe el índice GIN para búsqueda full-text (CRÍTICO para velocidad)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_content_ts 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- Índice adicional para course_id (acelera el filtro)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Comentario sobre la función
COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS 
'Búsqueda de texto completo ULTRA SIMPLE para RAG. VERSIÓN TEMPORAL: Sin ts_rank (causa timeout). Solo filtra por match y ordena por fecha. Usa websearch_to_tsquery para búsqueda. El boost por material se hace en TypeScript.';
