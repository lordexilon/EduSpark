-- 1. Actualizar función de Búsqueda Semántica (Vectorial)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_course_content_chunks(
  query_embedding text,
  match_threshold double precision,
  match_count integer,
  course_id_param integer,
  p_module_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_query vector(512);
BEGIN
  v_query := query_embedding::vector(512);
  
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> v_query) as similarity
  FROM course_content_chunks c
  WHERE 1 - (c.embedding <=> v_query) > match_threshold
  AND c.course_id = course_id_param
  AND (
    p_module_id IS NULL OR 
    c.unit_id = p_module_id OR 
    c.session_id = p_module_id OR
    (c.unit_id IS NULL AND c.session_id IS NULL) -- IMPORTANTE: Incluye Harrison/Nelson
  )
  ORDER BY c.embedding <=> v_query ASC
  LIMIT match_count;
END;
$$;

-- 2. Actualizar función de Búsqueda de Texto (Keywords)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 30,
  min_relevance DOUBLE PRECISION DEFAULT 0.001,
  p_module_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  course_id integer,
  content text,
  embedding vector(512),
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
  WHERE ccc.course_id = course_id_param
  AND (
    search_query IS NULL OR 
    search_query = '' OR 
    ccc.content ILIKE '%' || search_query || '%' OR 
    (ccc.metadata->>'title') ILIKE '%' || search_query || '%'
  )
  AND (
    p_module_id IS NULL OR 
    ccc.unit_id = p_module_id OR 
    ccc.session_id = p_module_id OR
    (ccc.unit_id IS NULL AND ccc.session_id IS NULL) -- IMPORTANTE: Incluye Harrison/Nelson
  )
  ORDER BY 
    CASE 
      WHEN (ccc.metadata->>'title') ILIKE '%' || search_query || '%' THEN 1
      WHEN ccc.content ILIKE '%' || search_query || '%' THEN 2
      ELSE 3 
    END ASC,
    ccc.created_at DESC
  LIMIT result_limit * 2; 
END;
$$;
