-- =====================================================
-- ACTUALIZACIÓN DE FUNCIONES RAG PARA SOPORTE MULTI-CURSO
-- Permite buscar en documentos asignados desde otros cursos
-- =====================================================

-- 1. Actualizar búsqueda vectorial
CREATE OR REPLACE FUNCTION search_course_content_chunks(
  query_embedding vector(768),
  course_id_param text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  course_id text,
  content text,
  embedding vector(768),
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ccc.id,
    ccc.course_id::text,
    ccc.content,
    ccc.embedding,
    ccc.metadata,
    1 - (ccc.embedding <=> query_embedding) as similarity
  FROM course_content_chunks ccc
  WHERE 
    (
      -- Coincidencia directa de curso (contenido original o legacy)
      (ccc.course_id::text = course_id_param OR ccc.course_id::integer::text = course_id_param)
      OR
      -- Coincidencia por asignación de documento
      EXISTS (
        SELECT 1 FROM document_course_assignments dca
        WHERE dca.document_id = ccc.document_id
        AND (dca.course_id::text = course_id_param OR dca.course_id::integer::text = course_id_param)
      )
    )
    AND ccc.embedding IS NOT NULL
    AND 1 - (ccc.embedding <=> query_embedding) > match_threshold
  ORDER BY ccc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_course_content_chunks IS 
'Busca chunks similares usando vector search, incluyendo documentos asignados desde otros cursos.';

-- 2. Actualizar búsqueda de texto completo (Clean)
CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  rank DOUBLE PRECISION,
  relevance_score DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_words TEXT[];
  v_min_content_length INTEGER := 30;
BEGIN
  v_query_words := ARRAY(
    SELECT word
    FROM unnest(string_to_array(lower(search_query), ' ')) AS word
    WHERE length(word) >= 2
  );
  
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    ts_rank(
      to_tsvector('spanish', ccc.content), 
      plainto_tsquery('spanish', search_query)
    ) as rank,
    (
      COALESCE(
        ts_rank(
          to_tsvector('spanish', ccc.content), 
          plainto_tsquery('spanish', search_query)
        ), 
        0
      ) * 0.7 +
      (
        SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(array_length(v_query_words, 1), 1)
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      ) * 0.2 +
      CASE 
        WHEN length(ccc.content) >= v_min_content_length THEN 0.1
        ELSE 0
      END
    ) as relevance_score
  FROM course_content_chunks ccc
  WHERE 
    (
      ccc.course_id = course_id_param
      OR
      EXISTS (
        SELECT 1 FROM document_course_assignments dca
        WHERE dca.document_id = ccc.document_id
        AND dca.course_id = course_id_param
      )
    )
    AND length(ccc.content) >= v_min_content_length
    AND (
      SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
      FROM regexp_split_to_table(ccc.content, '') AS char
      WHERE char ~ '[^\w\s]'
    ) < 0.5
    AND NOT (
      ccc.content ~ '(\d)\1{6,}'
      OR (
        (SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
        FROM regexp_split_to_table(ccc.content, '') AS char
        WHERE char ~ '\d') > 0.8
        AND ccc.content ~ '(\d)\1{5,}'
      )
    )
    AND (
      to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
      OR
      EXISTS (
        SELECT 1 
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      )
      OR
      lower(ccc.content) LIKE '%' || lower(search_query) || '%'
    )
    AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
  ORDER BY 
    CASE 
      WHEN to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query) 
      THEN 1 
      ELSE 2 
    END,
    relevance_score DESC, 
    rank DESC NULLS LAST
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION search_course_content_chunks_text_clean IS 
'Búsqueda de texto completo incluyendo documentos asignados.';

-- 3. Actualizar búsqueda híbrida (Clean)
CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  relevance_score DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_words TEXT[];
  v_min_content_length INTEGER := 30;
BEGIN
  v_query_words := ARRAY(
    SELECT word
    FROM unnest(string_to_array(lower(search_query), ' ')) AS word
    WHERE length(word) >= 2
  );
  
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    (
      COALESCE(
        ts_rank(
          to_tsvector('spanish', ccc.content), 
          plainto_tsquery('spanish', search_query)
        ), 
        0
      ) * 0.6 +
      (
        SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(array_length(v_query_words, 1), 1)
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      ) * 0.25 +
      CASE 
        WHEN length(ccc.content) >= v_min_content_length THEN 0.1
        ELSE 0
      END +
      CASE 
        WHEN (
          SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
          FROM regexp_split_to_table(ccc.content, '') AS char
          WHERE char ~ '[^\w\s]'
        ) > 0.3 THEN -0.05
        ELSE 0
      END
    ) as relevance_score
  FROM course_content_chunks ccc
  WHERE 
    (
      ccc.course_id = course_id_param
      OR
      EXISTS (
        SELECT 1 FROM document_course_assignments dca
        WHERE dca.document_id = ccc.document_id
        AND dca.course_id = course_id_param
      )
    )
    AND length(ccc.content) >= v_min_content_length
    AND (
      SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
      FROM regexp_split_to_table(ccc.content, '') AS char
      WHERE char ~ '[^\w\s]'
    ) < 0.5
    AND NOT (
      ccc.content ~ '(\d)\1{6,}'
      OR (
        (SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
        FROM regexp_split_to_table(ccc.content, '') AS char
        WHERE char ~ '\d') > 0.8
        AND ccc.content ~ '(\d)\1{5,}'
      )
    )
    AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
    AND (
      to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
      OR
      EXISTS (
        SELECT 1 
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      )
      OR
      lower(ccc.content) LIKE '%' || lower(search_query) || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION search_course_content_chunks_hybrid_clean IS 
'Búsqueda híbrida incluyendo documentos asignados.';
