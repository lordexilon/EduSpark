-- Script optimizado para MULTI-IDIOMA (Español, Inglés, Portugués) y TIMEOUTS
-- Ejecutar en Supabase SQL Editor

-- 1. Aumentar tiempo de espera a 5 minutos para evitar timeouts en tablas grandes
SET statement_timeout = 300000;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Índice de Texto Completo "SIMPLE" (Multi-idioma)
-- Usamos 'simple' en lugar de 'spanish' para que funcione bien con Inglés y Portugués
-- Esto indexa las palabras tal cual, sin intentar aplicar reglas gramaticales de un solo idioma
DROP INDEX IF EXISTS idx_course_content_chunks_fts_spanish; -- Borrar el índice específico de español
DROP INDEX IF EXISTS idx_course_content_chunks_fts_simple;

CREATE INDEX idx_course_content_chunks_fts_simple
ON course_content_chunks 
USING gin(to_tsvector('simple', content));

-- 3. Función de búsqueda de texto optimizada para cualquier idioma
CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 15, -- Aumentado para encontrar más resultados
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

-- 4. Función híbrida multi-idioma
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

-- 5. Actualizar función vectorial (se mantiene igual, ya es multi-idioma por naturaleza)
-- La búsqueda vectorial es la que mejor maneja consultas en un idioma sobre contenido en otro
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
