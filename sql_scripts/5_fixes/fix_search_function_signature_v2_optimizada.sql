-- =====================================================
-- FIX: Corregir función search_course_content_chunks_text_clean (VERSIÓN OPTIMIZADA)
-- Problema: La función calculaba ts_rank dos veces (WHERE y ORDER BY), causando timeout
-- Solución: Usar CTE para calcular ts_rank una sola vez
-- =====================================================

-- Eliminar TODAS las versiones de la función (para evitar confusión)
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

-- Crear función única OPTIMIZADA (calcula ts_rank una sola vez usando CTE)
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
  WITH ranked_chunks AS (
    SELECT 
      ccc.id,
      ccc.course_id,
      ccc.content,
      ccc.embedding,
      ccc.metadata,
      ccc.created_at,
      -- OPTIMIZACIÓN: Calcular ts_rank UNA SOLA VEZ (no en WHERE y ORDER BY)
      ts_rank(
        to_tsvector('spanish', COALESCE(ccc.content, '')),
        websearch_to_tsquery('spanish', search_query)
      ) as relevance_score
    FROM course_content_chunks ccc
    WHERE 
      ccc.course_id = course_id_param
      AND to_tsvector('spanish', COALESCE(ccc.content, '')) @@ websearch_to_tsquery('spanish', search_query)
      -- NOTA: El filtro por min_relevance se hace DESPUÉS en el SELECT final
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

-- Comentario sobre la función
COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS 
'Búsqueda de texto completo optimizada para RAG. OPTIMIZADA: Calcula ts_rank una sola vez usando CTE para evitar timeouts. Usa websearch_to_tsquery para mejor búsqueda de frases.';
