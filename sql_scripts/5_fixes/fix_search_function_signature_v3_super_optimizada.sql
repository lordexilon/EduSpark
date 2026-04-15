-- =====================================================
-- FIX: Corregir función search_course_content_chunks_text_clean (VERSIÓN SUPER OPTIMIZADA)
-- Problema: Calcular ts_rank sobre 55,473 chunks causa timeout
-- Solución: Aplicar LIMIT temprano ANTES de calcular ts_rank
-- =====================================================

-- Eliminar TODAS las versiones de la función (para evitar confusión)
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

-- Crear función SUPER OPTIMIZADA (aplica LIMIT temprano antes de calcular ts_rank)
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
  WITH matching_chunks AS (
    -- PRIMERO: Filtrar por match usando índice GIN (RÁPIDO, sin calcular ts_rank)
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
    -- OPTIMIZACIÓN CRÍTICA: Aplicar LIMIT temprano (ej: 100-200) ANTES de calcular ts_rank
    -- Esto reduce drásticamente el número de chunks sobre los que se calcula ts_rank
    LIMIT LEAST(result_limit * 5, 200)  -- Tomar hasta 5x el límite o 200, lo que sea menor
  ),
  ranked_chunks AS (
    -- SEGUNDO: Calcular ts_rank solo en los chunks ya filtrados (MUCHO MÁS RÁPIDO)
    SELECT 
      mc.id,
      mc.course_id,
      mc.content,
      mc.embedding,
      mc.metadata,
      mc.created_at,
      ts_rank(
        to_tsvector('spanish', COALESCE(mc.content, '')),
        websearch_to_tsquery('spanish', search_query)
      ) as relevance_score
    FROM matching_chunks mc
  )
  SELECT 
    ranked_chunks.id,
    ranked_chunks.course_id,
    ranked_chunks.content,
    ranked_chunks.embedding,
    ranked_chunks.metadata,
    ranked_chunks.created_at
  FROM ranked_chunks
  WHERE ranked_chunks.relevance_score >= min_relevance
  ORDER BY ranked_chunks.relevance_score DESC
  LIMIT result_limit;
END;
$$;

-- Asegurar que existe el índice GIN para búsqueda full-text (ACELERA MUCHO)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_content_ts 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- Índice adicional para course_id (acelera el filtro)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Comentario sobre la función
COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS 
'Búsqueda de texto completo SUPER OPTIMIZADA para RAG. OPTIMIZACIÓN: Aplica LIMIT temprano (200 chunks) ANTES de calcular ts_rank, reduciendo drásticamente el costo. Usa websearch_to_tsquery para mejor búsqueda de frases.';
