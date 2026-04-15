-- =====================================================
-- DIAGNÓSTICO RÁPIDO: Verificar chunks página 350
-- Versión ULTRA-OPTIMIZADA - Solo metadata, sin búsquedas de texto
-- EJECUTAR UNA CONSULTA A LA VEZ
-- =====================================================

-- CONSULTA 1: Solo verificar si existen chunks con metadata de páginas
-- (EJECUTAR SOLA ESTA PRIMERO - Debe ser muy rápida)
SELECT 
  COUNT(*) as total_chunks_con_paginacion,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as sin_embedding
FROM course_content_chunks
WHERE metadata->>'pageStart' IS NOT NULL
LIMIT 1000;

-- CONSULTA 2: Verificar si existen chunks alrededor de página 350
-- (EJECUTAR SOLA ESTA DESPUÉS - Solo verifica existencia, muy rápida)
SELECT EXISTS(
  SELECT 1 
  FROM course_content_chunks
  WHERE metadata->>'pageStart' IS NOT NULL
  LIMIT 1
) as hay_chunks_con_paginacion;

-- CONSULTA 3: Muestra solo IDs y metadata (sin conversiones)
-- (EJECUTAR SOLA ESTA DESPUÉS - Solo muestra metadata sin procesar)
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_raw,
  metadata->>'pageEnd' as pageEnd_raw,
  metadata->>'material_id' as material_id
FROM course_content_chunks
WHERE metadata->>'pageStart' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- CONSULTA 4: Verificar materiales por ID solamente
-- (EJECUTAR SOLA ESTA DESPUÉS)
SELECT 
  m.id,
  m.title
FROM course_materials m
WHERE m.title ILIKE '%schwartz%'
LIMIT 3;
