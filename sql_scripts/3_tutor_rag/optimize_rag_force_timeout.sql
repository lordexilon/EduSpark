-- Script optimizado con aumento de tiempo de espera (timeout)
-- Ejecutar en Supabase SQL Editor

-- 1. Aumentar el tiempo de espera de la sesión a 5 minutos (300000 ms)
-- Esto es necesario porque la tabla es grande y la creación del índice tarda
SET statement_timeout = 300000;

-- 2. Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Crear índice de Texto Completo (FTS) - CRÍTICO
-- Si este falla, la búsqueda será lenta.
DROP INDEX IF EXISTS idx_course_content_chunks_fts_spanish;
CREATE INDEX idx_course_content_chunks_fts_spanish 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- 4. Crear funciones de búsqueda optimizadas
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

-- 5. Función híbrida (simplificada para evitar timeout en creación de índice trigram)
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
    to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', search_query)
  )
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. Actualizar función vectorial
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
