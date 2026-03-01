-- Script para optimizar búsqueda RAG y solucionar timeouts
-- Ejecutar en Supabase SQL Editor

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear índice GIN para búsqueda de texto completo (FTS) en español
-- Esto es CRÍTICO para evitar el timeout en libros grandes
DROP INDEX IF EXISTS idx_course_content_chunks_fts_spanish;
CREATE INDEX idx_course_content_chunks_fts_spanish 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- 3. Crear índice para búsqueda por similitud de trigramas (para errores tipográficos)
DROP INDEX IF EXISTS idx_course_content_chunks_content_trgm;
CREATE INDEX idx_course_content_chunks_content_trgm 
ON course_content_chunks 
USING gin(content gin_trgm_ops);

-- 4. Crear índice en course_id para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- 5. Actualizar estadísticas de la tabla
ANALYZE course_content_chunks;

-- 6. Función optimizada de búsqueda de texto
-- Usa el índice GIN y evita ordenamiento costoso si hay muchos resultados
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
  -- Limitamos primero antes de ordenar por rank para evitar procesar todo el libro
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Función de búsqueda híbrida mejorada con trigramas (para "harrinson" vs "harrison")
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
    -- Coincidencia exacta (rápida con índice trigram)
    content ILIKE '%' || search_query || '%'
    OR
    -- Similitud de trigramas (maneja typos)
    similarity(content, search_query) > min_relevance
  )
  ORDER BY similarity(content, search_query) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. Actualizar función de búsqueda vectorial con umbral por defecto más bajo
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
