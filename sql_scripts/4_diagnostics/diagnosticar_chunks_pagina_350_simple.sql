-- =====================================================
-- DIAGNÓSTICO SIMPLIFICADO: Verificar chunks página 350
-- Versión optimizada para evitar timeouts
-- EJECUTAR UNA CONSULTA A LA VEZ
-- =====================================================

-- CONSULTA 1: Verificar si existen chunks que incluyen la página 350
-- (EJECUTAR SOLA ESTA CONSULTA PRIMERO)
SELECT 
  id,
  course_id,
  LEFT(content, 100) as content_preview,
  metadata->>'pageStart' as page_start,
  metadata->>'pageEnd' as page_end,
  metadata->>'material_id' as material_id,
  CASE WHEN embedding IS NULL THEN 'SIN EMBEDDING' ELSE 'CON EMBEDDING' END as embedding_status
FROM course_content_chunks
WHERE 
  metadata->>'pageStart' IS NOT NULL
  AND CAST(metadata->>'pageStart' AS INTEGER) <= 350 
  AND CAST(metadata->>'pageEnd' AS INTEGER) >= 350
LIMIT 5;

-- =====================================================
-- CONSULTA 2: Contar chunks en rango 340-360
-- (EJECUTAR SOLA ESTA CONSULTA DESPUÉS)
SELECT 
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_sin_embedding
FROM course_content_chunks
WHERE 
  metadata->>'pageStart' IS NOT NULL
  AND CAST(metadata->>'pageStart' AS INTEGER) BETWEEN 340 AND 360
LIMIT 500;

-- =====================================================
-- CONSULTA 3: Buscar texto "estadificación" (MUY SIMPLIFICADA)
-- (EJECUTAR SOLA ESTA CONSULTA DESPUÉS)
SELECT 
  id,
  LEFT(content, 200) as content_preview,
  metadata->>'pageStart' as page_start,
  metadata->>'pageEnd' as page_end,
  metadata->>'material_id' as material_id
FROM course_content_chunks
WHERE 
  content ILIKE '%estadificación%mamario%'
  AND metadata->>'pageStart' IS NOT NULL
ORDER BY created_at DESC
LIMIT 3;

-- =====================================================
-- CONSULTA 4: Verificar materiales relacionados
-- (EJECUTAR SOLA ESTA CONSULTA DESPUÉS)
SELECT 
  m.id,
  m.title,
  COUNT(c.id) as total_chunks
FROM course_materials m
INNER JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::TEXT
WHERE m.title ILIKE '%schwartz%' OR m.title ILIKE '%cirugía%'
GROUP BY m.id, m.title
LIMIT 5;
