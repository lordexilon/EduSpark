-- =====================================================
-- FIX: Eliminar Full-Text Search Completamente (Versión Alternativa)
-- Problema: Cualquier uso de to_tsvector sobre 55,473 chunks causa timeout
-- Solución: Eliminar full-text search de SQL, filtrar en TypeScript
-- Esta es una versión alternativa del fix principal
-- =====================================================

-- Eliminar TODAS las versiones de la función (para evitar confusión)
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

-- Crear función SIN full-text search (solo filtra por course_id)
-- El filtro de contenido se hace en TypeScript usando ILIKE simple
CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,  -- Ignorado en SQL, se usa en TypeScript
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
  -- SIN filtro full-text (causa timeout)
  -- Solo filtrar por course_id y aplicar LIMIT
  ORDER BY ccc.created_at DESC
  LIMIT result_limit * 2;  -- Devolver el doble para tener margen después del filtro en TypeScript
END;
$$;

-- Índice para course_id (CRÍTICO para esta estrategia)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Índice para created_at (acelera el ORDER BY)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_created_at 
ON course_content_chunks(created_at DESC);

-- Índice compuesto para course_id + created_at (ÓPTIMO para esta query)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_created 
ON course_content_chunks(course_id, created_at DESC);

-- Comentario sobre la función
COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS 
'Búsqueda SIN full-text search (causa timeout). Solo filtra por course_id y devuelve chunks. El filtro de contenido se hace en TypeScript usando ILIKE simple sobre los chunks devueltos.';
