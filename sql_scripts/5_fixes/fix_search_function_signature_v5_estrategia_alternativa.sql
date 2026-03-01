-- =====================================================
-- FIX: Estrategia Alternativa - Búsqueda Simple con ILIKE
-- Problema: Full-text search sobre 55,473 chunks causa timeout
-- Solución: Usar ILIKE para búsqueda simple (más rápido) + LIMIT muy temprano
-- =====================================================

-- Eliminar TODAS las versiones de la función (para evitar confusión)
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

-- Crear función con ESTRATEGIA ALTERNATIVA (ILIKE + LIMIT muy temprano)
CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 30,
  min_relevance DOUBLE PRECISION DEFAULT 0.001  -- Ignorado, mantenido para compatibilidad
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
DECLARE
  search_terms TEXT[];
  term TEXT;
BEGIN
  -- Dividir query en términos individuales
  search_terms := string_to_array(lower(trim(search_query)), ' ');
  
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.course_id,
    ccc.content,
    ccc.embedding,
    ccc.metadata,
    ccc.created_at
  FROM course_content_chunks ccc
  WHERE 
    ccc.course_id = course_id_param
    -- ESTRATEGIA: Usar ILIKE para cada término (más rápido que full-text en algunos casos)
    -- Buscar que TODOS los términos estén presentes
    AND (
      -- Opción 1: Buscar la frase completa
      lower(ccc.content) ILIKE '%' || lower(search_query) || '%'
      OR
      -- Opción 2: Buscar que todos los términos estén presentes (al menos 2 caracteres)
      (
        SELECT bool_and(
          lower(ccc.content) ILIKE '%' || term || '%'
        )
        FROM unnest(search_terms) AS term
        WHERE length(term) >= 2  -- Ignorar términos muy cortos
      )
    )
  -- LIMIT MUY TEMPRANO para evitar procesar todos los chunks
  LIMIT result_limit * 2;  -- Tomar el doble para tener margen después del boost en TypeScript
END;
$$;

-- Índice para course_id (acelera el filtro)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Índice para búsqueda ILIKE (si PostgreSQL lo soporta, puede ayudar)
-- Nota: Los índices para ILIKE son limitados, pero el índice de course_id ayuda

-- Comentario sobre la función
COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS 
'Búsqueda alternativa usando ILIKE (más rápido que full-text para queries simples). Aplica LIMIT muy temprano. El boost por material se hace en TypeScript.';
