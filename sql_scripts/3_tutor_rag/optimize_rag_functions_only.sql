-- Paso 1: Crear SOLO las funciones (Corregido con DROP previo)
-- Ejecutar en Supabase SQL Editor

-- Primero eliminamos las funciones existentes para evitar errores de "cannot change return type"
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(text, integer, integer, double precision);
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(text, integer, integer, double precision);
DROP FUNCTION IF EXISTS search_course_content_chunks(vector, double precision, integer, text);

-- Función de búsqueda de texto (actualizada para 'simple')
CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 15,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS SETOF course_content_chunks AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM course_content_chunks
  WHERE course_id = course_id_param
  AND to_tsvector('simple', content) @@ websearch_to_tsquery('simple', search_query)
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Función híbrida
CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 15,
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
    to_tsvector('simple', content) @@ websearch_to_tsquery('simple', search_query)
  )
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Función vectorial (asegurarnos que esté actualizada)
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
