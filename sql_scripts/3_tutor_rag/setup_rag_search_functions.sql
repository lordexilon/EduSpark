-- Script para crear funciones de búsqueda optimizadas para RAG
-- Ejecutar en Supabase SQL Editor

-- 1. Función de búsqueda de texto completo limpia (sin embeddings)
-- Esta función es rápida y no tiene costo de API
CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 5,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS SETOF course_content_chunks AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM course_content_chunks
  WHERE course_id = course_id_param
  AND to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', search_query)
  ORDER BY ts_rank(to_tsvector('spanish', content), websearch_to_tsquery('spanish', search_query)) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 2. Función de búsqueda híbrida (Texto + Embeddings si se proporcionan, o fallback)
-- Por ahora, haremos una versión simple que usa texto pero con un nombre diferente para compatibilidad
CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 5,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS SETOF course_content_chunks AS $$
BEGIN
  -- Reutilizamos la lógica de texto por ahora
  RETURN QUERY
  SELECT *
  FROM course_content_chunks
  WHERE course_id = course_id_param
  AND (
    content ILIKE '%' || search_query || '%'
    OR
    to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', search_query)
  )
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Verificar índices para búsqueda de texto
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_content_ts 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- 4. Asegurar que la función original de búsqueda vectorial existe y es eficiente
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
