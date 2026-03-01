-- =====================================================
-- VERIFICAR: Material ID faltante o incorrecto
-- =====================================================

-- 1. Buscar si existe un material con ese nombre de archivo
SELECT 
  id,
  title,
  metadata->>'file_name' as file_name_from_metadata,
  created_at
FROM course_materials
WHERE 
  metadata->>'file_name' ILIKE '%MANUALDEATENCINNEONATAL%'
  OR metadata->>'file_name' ILIKE '%MANUAL%NEONATAL%'
  OR title ILIKE '%MANUAL%NEONATAL%'
  OR title ILIKE '%NEONATAL%'
LIMIT 10;

-- 2. Ver todos los materiales del curso 12 (versión simplificada)
SELECT 
  m.id,
  m.title,
  m.metadata->>'file_name' as file_name,
  COUNT(DISTINCT c.id) as total_chunks
FROM course_materials m
LEFT JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::TEXT AND c.course_id = 12
WHERE m.course_id = 12
GROUP BY m.id, m.title, m.metadata->>'file_name'
ORDER BY m.title
LIMIT 30;

-- 3. Chunks sin material_id válido (con LEFT JOIN que devuelve NULL)
SELECT 
  COUNT(*) as chunks_sin_material_valido,
  COUNT(DISTINCT c.metadata->>'file_name') as archivos_diferentes
FROM course_content_chunks c
LEFT JOIN course_materials m ON c.metadata->>'material_id' = m.id::TEXT
WHERE 
  c.course_id = 12
  AND m.id IS NULL;
