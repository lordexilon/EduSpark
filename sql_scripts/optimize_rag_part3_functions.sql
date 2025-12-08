-- Parte 3: Funciones y Optimizaciones Finales
-- Ejecutar este script al final.

-- 4. Crear índice en course_id para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- 5. Actualizar estadísticas de la tabla
ANALYZE course_content_chunks;

-- 6. Función optimizada de búsqueda de texto
CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 10,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS SETOF course_content_chunks AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM course_content_chunks
  WHERE course_id = course_id_param
  AND to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', search_query)
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Función de búsqueda híbrida mejorada con trigramas
CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 10,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS SETOF course_content_chunks AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM course_content_chunks
  WHERE course_id = course_id_param
  AND (
    content ILIKE '%' || search_query || '%'
    OR
    similarity(content, search_query) > min_relevance
  )
  ORDER BY similarity(content, search_query) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. Actualizar función de búsqueda vectorial
CREATE OR REPLACE FUNCTION search_course_content_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  course_id_param text
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    course_content_chunks.id,
    course_content_chunks.content,
    course_content_chunks.metadata,
    1 - (course_content_chunks.embedding <=> query_embedding) as similarity
  FROM course_content_chunks
  WHERE 1 - (course_content_chunks.embedding <=> query_embedding) > match_threshold
  AND (course_id_param IS NULL OR course_content_chunks.course_id = course_id_param::integer)
  ORDER BY course_content_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
