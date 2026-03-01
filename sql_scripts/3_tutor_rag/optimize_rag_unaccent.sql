-- Solución Definitiva: Habilitar extensión 'unaccent' para búsqueda insensible a acentos
-- Ejecutar en Supabase SQL Editor

-- 1. Habilitar extensión unaccent
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Crear configuración de búsqueda de texto personalizada 'spanish_unaccent'
-- Esta configuración usará el diccionario español pero ignorará acentos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'spanish_unaccent') THEN
        CREATE TEXT SEARCH CONFIGURATION spanish_unaccent (COPY = spanish);
        ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
            ALTER MAPPING FOR hword, hword_part, word
            WITH unaccent, spanish_stem;
    END IF;
END
$$;

-- 3. Recrear índice usando la nueva configuración (con protección de timeout)
SET statement_timeout = 300000; -- 5 minutos

DROP INDEX IF EXISTS idx_course_content_chunks_fts_spanish;
DROP INDEX IF EXISTS idx_course_content_chunks_fts_simple;
DROP INDEX IF EXISTS idx_course_content_chunks_fts_simple_v2;

CREATE INDEX idx_course_content_chunks_fts_unaccent
ON course_content_chunks 
USING gin(to_tsvector('spanish_unaccent', content));

-- 4. Actualizar funciones de búsqueda para usar 'spanish_unaccent'
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(text, integer, integer, double precision);
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(text, integer, integer, double precision);

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
  AND to_tsvector('spanish_unaccent', content) @@ websearch_to_tsquery('spanish_unaccent', search_query)
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

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
    to_tsvector('spanish_unaccent', content) @@ websearch_to_tsquery('spanish_unaccent', search_query)
  )
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
