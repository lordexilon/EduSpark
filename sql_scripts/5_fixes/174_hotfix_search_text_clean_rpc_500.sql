-- =====================================================
-- HOTFIX 174: Reparar RPC search_course_content_chunks_text_clean (Error 500)
-- Fecha: 2026-03-26
-- Objetivo:
--   1) Eliminar sobrecargas conflictivas
--   2) Normalizar firma usada por frontend
--   3) Evitar dependencia de dimensión vectorial en retorno
-- =====================================================

-- Limpiar variantes históricas
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 30,
  min_relevance DOUBLE PRECISION DEFAULT 0.001,
  p_module_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  course_id INTEGER,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ccc.id,
    ccc.course_id,
    ccc.content,
    ccc.metadata,
    ccc.created_at
  FROM public.course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
    AND (
      search_query IS NULL OR
      search_query = '' OR
      ccc.content ILIKE '%' || search_query || '%' OR
      (ccc.metadata->>'title') ILIKE '%' || search_query || '%'
    )
    AND (
      p_module_id IS NULL OR
      ccc.unit_id = p_module_id OR
      ccc.session_id = p_module_id OR
      (ccc.unit_id IS NULL AND ccc.session_id IS NULL)
    )
  ORDER BY ccc.created_at DESC
  LIMIT GREATEST(1, result_limit);
END;
$$;

COMMENT ON FUNCTION public.search_course_content_chunks_text_clean IS
'Hotfix 174: RPC de búsqueda textual estable para RAG. Incluye materiales globales (unit/session NULL), firma compatible con frontend y sin dependencia de tipo vector en la salida.';

GRANT EXECUTE ON FUNCTION public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) TO service_role;
