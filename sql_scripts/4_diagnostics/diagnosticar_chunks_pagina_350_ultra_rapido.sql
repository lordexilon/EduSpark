-- =====================================================
-- DIAGNÓSTICO ULTRA-RÁPIDO: Verificar chunks página 350
-- Versión para tabla grande (55K+ chunks)
-- EJECUTAR UNA CONSULTA A LA VEZ
-- =====================================================

-- CONSULTA 1: Verificar cuántos chunks tienen metadata de páginas
-- (EJECUTAR SOLA ESTA PRIMERO)
SELECT 
  COUNT(*) as total_con_pageStart,
  COUNT(CASE WHEN metadata->>'pageEnd' IS NOT NULL THEN 1 END) as total_con_pageEnd,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as sin_embedding
FROM course_content_chunks
WHERE metadata->>'pageStart' IS NOT NULL
LIMIT 1;

-- CONSULTA 2: Ver muestra de chunks con metadata (sin conversiones)
-- (EJECUTAR SOLA ESTA DESPUÉS - Solo muestra 5 registros)
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_text,
  metadata->>'pageEnd' as pageEnd_text,
  metadata->>'material_id' as material_id,
  CASE WHEN embedding IS NULL THEN 'SIN' ELSE 'CON' END as embedding
FROM course_content_chunks
WHERE metadata->>'pageStart' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- CONSULTA 3: Verificar materiales específicos (muy rápida)
-- (EJECUTAR SOLA ESTA DESPUÉS)
SELECT id, title
FROM course_materials
WHERE title ILIKE '%schwartz%'
LIMIT 3;

-- =====================================================
-- NOTA: Para buscar específicamente la página 350, se necesitaría:
-- 1. Obtener los pageStart/pageEnd como texto de la consulta 2
-- 2. Verificar manualmente si algún rango incluye 350
-- 
-- Alternativa: Usar la función de búsqueda RPC si existe:
-- search_course_content_chunks_text_clean
-- =====================================================
