-- =====================================================
-- DIAGNÓSTICO: Chunks mezclados o mal asignados
-- Verificar si hay chunks con contenido incorrecto
-- =====================================================

-- 1. Verificar chunks del material específico 341-357 que muestra cardiopatías
-- Deberían ser de Williams Ginecología pero muestran contenido de Neonatología
SELECT 
  c.id,
  c.course_id,
  m.title as material_title,
  c.metadata->>'pageStart' as pageStart,
  c.metadata->>'pageEnd' as pageEnd,
  c.metadata->>'file_name' as source_file,
  LEFT(c.content, 300) as content_preview
FROM course_content_chunks c
LEFT JOIN course_materials m ON c.metadata->>'material_id' = m.id::TEXT
WHERE 
  c.course_id = 12
  AND c.metadata->>'pageStart' = '341'
  AND c.metadata->>'pageEnd' = '357'
LIMIT 5;

-- 2. Verificar materiales del curso 12 (versión simplificada)
SELECT 
  m.id,
  m.title,
  COUNT(c.id) as total_chunks
FROM course_materials m
INNER JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::TEXT
WHERE c.course_id = 12
GROUP BY m.id, m.title
ORDER BY m.title
LIMIT 20;
