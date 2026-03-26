-- =====================================================
-- Diagnóstico 176: Embeddings por curso (RAG vectorial)
-- Fecha: 2026-03-26
-- Uso: En Supabase SQL Editor, cambiar el course_id en el CTE y ejecutar.
-- Objetivo: Si en el cliente ves textCount > 0 y vectorCount = 0, verificar
--   si los chunks tienen embedding poblado y la RPC vectorial desplegada.
-- =====================================================

WITH params AS (
  SELECT 12::integer AS course_id  -- <-- ajustar aquí
)
SELECT
  c.course_id,
  count(*) AS total_chunks,
  count(c.embedding) AS chunks_con_embedding,
  count(*) FILTER (WHERE c.embedding IS NULL) AS chunks_sin_embedding
FROM public.course_content_chunks c
CROSS JOIN params p
WHERE c.course_id = p.course_id
GROUP BY c.course_id;

SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'course_content_chunks'
  AND column_name = 'embedding';

-- Si esta consulta devuelve más de una fila, hay sobrecargas: aplicar
-- sql_scripts/5_fixes/177_hotfix_search_course_content_chunks_unificar_rpc.sql
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_course_content_chunks';
