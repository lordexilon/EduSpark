-- =====================================================
-- HOTFIX 177: Una sola RPC search_course_content_chunks (sin sobrecargas)
-- Fecha: 2026-03-26
-- Problema detectado: coexistían dos firmas, p. ej.
--   (text, float8, int4, int4) y (vector, text, float8, int4)
-- PostgREST puede resolver mal la llamada desde el cliente → 0 filas o errores silenciosos.
-- Objetivo: eliminar TODAS las variantes y dejar UNA función alineada con
--   src/modules/tutor/services/ragService.ts (embedding texto, course_id int, threshold, count, p_module_id opcional).
-- =====================================================

-- Firmas reportadas por diagnóstico 176 + variantes comunes históricas
DROP FUNCTION IF EXISTS public.search_course_content_chunks(text, double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector, text, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(512), text, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), text, double precision, integer) CASCADE;

DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), float, int, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), double precision, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(768), double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(vector(512), double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_course_content_chunks(text, double precision, integer, text) CASCADE;

CREATE OR REPLACE FUNCTION public.search_course_content_chunks(
  query_embedding text,
  match_threshold double precision,
  match_count integer,
  course_id_param integer,
  p_module_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_query vector(512);
BEGIN
  v_query := query_embedding::vector(512);

  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> v_query))::double precision AS similarity
  FROM public.course_content_chunks c
  WHERE c.embedding IS NOT NULL
    AND c.course_id = course_id_param
    AND (1 - (c.embedding <=> v_query)) > match_threshold
    AND (
      p_module_id IS NULL
      OR c.unit_id = p_module_id
      OR c.session_id = p_module_id
      OR (c.unit_id IS NULL AND c.session_id IS NULL)
    )
  ORDER BY c.embedding <=> v_query ASC
  LIMIT GREATEST(1, match_count);
END;
$$;

COMMENT ON FUNCTION public.search_course_content_chunks(text, double precision, integer, integer, uuid) IS
'Hotfix 177: búsqueda vectorial única (512 dims). Sin sobrecargas. Incluye materiales globales (unit/session NULL).';

GRANT EXECUTE ON FUNCTION public.search_course_content_chunks(text, double precision, integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_course_content_chunks(text, double precision, integer, integer, uuid) TO service_role;
