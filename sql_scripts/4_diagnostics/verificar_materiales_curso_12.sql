-- =====================================================
-- Verificar materiales procesados para el curso 12
-- Para identificar en qué material buscar "estadificación"
-- =====================================================

-- Ver materiales del curso 12 que tienen chunks procesados
SELECT 
  m.id as material_id,
  m.title as material_title,
  m.kind as material_type,
  COUNT(DISTINCT c.id) as total_chunks,
  MIN(CAST(c.metadata->>'pageStart' AS INTEGER)) as min_page,
  MAX(CAST(c.metadata->>'pageEnd' AS INTEGER)) as max_page
FROM course_materials m
INNER JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::TEXT
WHERE c.course_id = 12
GROUP BY m.id, m.title, m.kind
ORDER BY m.title
LIMIT 20;
