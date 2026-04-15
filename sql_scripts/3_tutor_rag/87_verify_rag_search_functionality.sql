-- =====================================================
-- Script: Verificar funcionalidad de búsqueda RAG
-- Descripción: Verifica si la función RPC y la búsqueda están funcionando correctamente
-- Fecha: 2025-12-01
-- =====================================================

-- 1. Verificar si los chunks tienen sessionId en metadata
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  ccc.metadata->>'sessionId' as session_id_metadata,
  ccc.metadata->>'session_id' as session_id_snake,
  ccc.metadata->>'unit_id' as unit_id_metadata,
  m.session_id as material_session_id,
  m.unit_id as material_unit_id,
  m.title as material_title
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12
  AND ccc.metadata->>'material_id' = '82db3bb8-307c-4193-b723-cc69e337568e'
LIMIT 5;

-- 2. Verificar la función RPC search_course_content_chunks_text_clean
-- Probar si existe y qué parámetros acepta
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'search_course_content_chunks_text_clean';

-- 3. Probar la función RPC directamente con una búsqueda de "neonatal"
-- Nota: Esta consulta puede fallar si la función no existe o tiene problemas
SELECT * FROM public.search_course_content_chunks_text_clean(
  search_query => 'neonatal',
  course_id_param => 12,
  result_limit => 5,
  min_relevance => 0.01
);

-- 4. Verificar si hay chunks sin course_id correcto
SELECT 
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  m.course_id as material_course_id,
  COUNT(*) as chunk_count
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.metadata->>'material_id' = '82db3bb8-307c-4193-b723-cc69e337568e'
GROUP BY ccc.course_id, ccc.metadata->>'material_id', m.course_id;

-- 5. Verificar materiales asociados a sesiones del curso 12
SELECT 
  m.id,
  m.title,
  m.course_id,
  m.unit_id,
  m.session_id,
  s.title as session_title,
  u.title as unit_title,
  COUNT(ccc.id) as chunk_count
FROM public.materials m
LEFT JOIN public.sessions s ON s.id = m.session_id
LEFT JOIN public.course_units u ON u.id = m.unit_id
LEFT JOIN public.course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text AND ccc.course_id = m.course_id
WHERE m.course_id = 12
  AND m.id = '82db3bb8-307c-4193-b723-cc69e337568e'
GROUP BY m.id, m.title, m.course_id, m.unit_id, m.session_id, s.title, u.title;

-- 6. Simular búsqueda manual (lo que debería hacer la función RPC)
-- Buscar chunks que contengan "neonatal" en el curso 12
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  m.title as material_title,
  m.session_id as material_session_id,
  ccc.metadata->>'page_start' as page_start,
  ccc.metadata->>'page_end' as page_end,
  LEFT(ccc.content, 200) as content_preview,
  -- Calcular relevancia simple (similar a lo que hace la función RPC)
  (
    CASE WHEN ccc.content ILIKE '%neonatal%' THEN 1 ELSE 0 END * 10 +
    CASE WHEN ccc.content ILIKE '%manual%' THEN 1 ELSE 0 END * 5 +
    CASE WHEN ccc.content ILIKE '%atención%' THEN 1 ELSE 0 END * 3
  ) as relevance_score
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12
  AND (
    ccc.content ILIKE '%neonatal%' 
    OR ccc.content ILIKE '%manual%'
    OR ccc.content ILIKE '%atención%'
  )
ORDER BY relevance_score DESC, ccc.created_at DESC
LIMIT 10;

-- 7. Verificar si los chunks tienen el embedding necesario para búsqueda vectorial
SELECT 
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN ccc.embedding IS NOT NULL THEN 1 END) as chunks_with_embedding,
  COUNT(CASE WHEN ccc.embedding IS NULL THEN 1 END) as chunks_without_embedding
FROM public.course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'material_id' = '82db3bb8-307c-4193-b723-cc69e337568e';

