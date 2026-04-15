-- =====================================================
-- HOTFIX 178: search_course_content_chunks_text_clean sin full scan
-- Fecha: 2026-03-26
-- Problema: ILIKE sobre toda course_content_chunks por curso → 57014 statement timeout.
-- Solución: CTE "recent" acota filas (últimas N por created_at) y solo ahí aplica ILIKE.
-- Reemplaza la definición de 174 cuando 174 ya está desplegada con ILIKE global.
-- =====================================================

DROP FUNCTION IF EXISTS public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) CASCADE;

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
DECLARE
  cap INTEGER;
BEGIN
  cap := LEAST(
    5000,
    GREATEST(500, COALESCE(result_limit, 30) * 100)
  );

  RETURN QUERY
  WITH recent AS (
    SELECT
      ccc.id,
      ccc.course_id,
      ccc.content,
      ccc.metadata,
      ccc.created_at
    FROM public.course_content_chunks ccc
    WHERE ccc.course_id = course_id_param
      AND (
        p_module_id IS NULL OR
        ccc.unit_id = p_module_id OR
        ccc.session_id = p_module_id OR
        (ccc.unit_id IS NULL AND ccc.session_id IS NULL)
      )
    ORDER BY ccc.created_at DESC
    LIMIT cap
  )
  SELECT
    r.id,
    r.course_id,
    r.content,
    r.metadata,
    r.created_at
  FROM recent r
  WHERE (
      search_query IS NULL OR
      trim(search_query) = '' OR
      r.content ILIKE '%' || trim(search_query) || '%' OR
      (r.metadata->>'title') ILIKE '%' || trim(search_query) || '%'
    )
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, COALESCE(result_limit, 30));
END;
$$;

COMMENT ON FUNCTION public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) IS
'Hotfix 178: búsqueda textual acotada a los últimos N chunks del curso (CTE) para evitar timeout por seq scan completo.';

GRANT EXECUTE ON FUNCTION public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_course_content_chunks_text_clean(text, integer, integer, double precision, uuid) TO service_role;
