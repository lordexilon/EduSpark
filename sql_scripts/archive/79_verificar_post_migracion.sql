-- 79_verificar_post_migracion.sql
-- Script para verificar que la migración de módulos a unidades funcionó correctamente

-- 1. Verificar que existen unidades para el curso 9
SELECT 
  cu.id,
  cu.course_id,
  cu.number,
  cu.title,
  cu.order_index,
  cu.created_at
FROM course_units cu
WHERE cu.course_id = 9
ORDER BY cu.order_index;

-- 2. Verificar que existen unidades para el curso 1
SELECT 
  cu.id,
  cu.course_id,
  cu.number,
  cu.title,
  cu.order_index,
  cu.created_at
FROM course_units cu
WHERE cu.course_id = 1
ORDER BY cu.order_index;

-- 3. Verificar que existen sesiones para el curso 1
SELECT 
  s.id,
  s.course_id,
  s.unit_id,
  s.title,
  s.starts_at,
  s.order_index,
  cu.title as unit_title
FROM sessions s
LEFT JOIN course_units cu ON s.unit_id = cu.id
WHERE s.course_id = 1
ORDER BY s.order_index;

-- 4. Verificar que existen materiales migrados
SELECT 
  m.id,
  m.course_id,
  m.unit_id,
  m.title,
  m.kind,
  cu.title as unit_title
FROM materials m
LEFT JOIN course_units cu ON m.unit_id = cu.id
WHERE m.metadata->>'migrated_from' = 'course_materials'
ORDER BY m.course_id, cu.order_index;

-- 5. Resumen de conteos por curso
SELECT 
  c.id as course_id,
  c.title as course_title,
  COUNT(DISTINCT cu.id) as unidades_totales,
  COUNT(DISTINCT s.id) as sesiones_totales,
  COUNT(DISTINCT m.id) FILTER (WHERE m.metadata->>'migrated_from' = 'course_materials') as materiales_migrados,
  COUNT(DISTINCT m2.id) as materiales_totales
FROM courses c
LEFT JOIN course_units cu ON cu.course_id = c.id
LEFT JOIN sessions s ON s.course_id = c.id
LEFT JOIN materials m ON m.course_id = c.id AND m.metadata->>'migrated_from' = 'course_materials'
LEFT JOIN materials m2 ON m2.course_id = c.id
WHERE c.id IN (1, 9)
GROUP BY c.id, c.title
ORDER BY c.id;

-- 6. Verificar que course_modules todavía tiene los datos originales
SELECT 
  cm.id,
  cm.course_id,
  cm."order",
  cm.name,
  cm.title
FROM course_modules cm
WHERE cm.course_id = 9
ORDER BY cm."order";

-- 7. Verificar que course_materials todavía tiene los datos originales
SELECT 
  cm.id,
  cm.course_id,
  cm.module_id,
  cm.title,
  cm.type
FROM course_materials cm
WHERE cm.module_id IS NOT NULL
ORDER BY cm.course_id;

