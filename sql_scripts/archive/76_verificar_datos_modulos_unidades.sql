-- 76_verificar_datos_modulos_unidades.sql
-- Script para verificar qué datos existen en course_modules vs course_units
-- Ayuda a decidir si migrar, unificar o mantener ambos sistemas

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

-- 1. Comparar cantidad de registros
SELECT 
  'course_modules' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT course_id) as cursos_con_modulos,
  COUNT(DISTINCT id) as modulos_unicos
FROM course_modules
UNION ALL
SELECT 
  'course_units' as tabla,
  COUNT(*) as total_registros,
  COUNT(DISTINCT course_id) as cursos_con_unidades,
  COUNT(DISTINCT id) as unidades_unicas
FROM course_units;

-- 2. Ver módulos existentes (primeros 10)
SELECT 
  cm.id,
  cm.course_id,
  cm.name,
  cm.title,
  cm."order",
  cm.is_active,
  cm.created_at,
  c.title as curso_titulo
FROM course_modules cm
LEFT JOIN courses c ON c.id = cm.course_id
ORDER BY cm.created_at DESC
LIMIT 10;

-- 3. Ver unidades existentes (primeros 10)
SELECT 
  cu.id,
  cu.course_id,
  cu.number,
  cu.title,
  cu.order_index,
  cu.created_at,
  c.title as curso_titulo
FROM course_units cu
LEFT JOIN courses c ON c.id = cu.course_id
ORDER BY cu.created_at DESC
LIMIT 10;

-- 4. Cursos que tienen módulos pero NO unidades
SELECT DISTINCT
  cm.course_id,
  c.title as curso_titulo,
  COUNT(DISTINCT cm.id) as cantidad_modulos,
  COUNT(DISTINCT cu.id) as cantidad_unidades
FROM course_modules cm
INNER JOIN courses c ON c.id = cm.course_id
LEFT JOIN course_units cu ON cu.course_id = cm.course_id
GROUP BY cm.course_id, c.title
HAVING COUNT(DISTINCT cu.id) = 0
ORDER BY cantidad_modulos DESC;

-- 5. Cursos que tienen unidades pero NO módulos
SELECT DISTINCT
  cu.course_id,
  c.title as curso_titulo,
  COUNT(DISTINCT cm.id) as cantidad_modulos,
  COUNT(DISTINCT cu.id) as cantidad_unidades
FROM course_units cu
INNER JOIN courses c ON c.id = cu.course_id
LEFT JOIN course_modules cm ON cm.course_id = cu.course_id
GROUP BY cu.course_id, c.title
HAVING COUNT(DISTINCT cm.id) = 0
ORDER BY cantidad_unidades DESC;

-- 6. Cursos que tienen AMBOS (módulos y unidades)
SELECT 
  course_id,
  curso_titulo,
  cantidad_modulos,
  cantidad_unidades,
  cantidad_modulos + cantidad_unidades as total
FROM (
  SELECT DISTINCT
    COALESCE(cm.course_id, cu.course_id) as course_id,
    c.title as curso_titulo,
    COUNT(DISTINCT cm.id) as cantidad_modulos,
    COUNT(DISTINCT cu.id) as cantidad_unidades
  FROM courses c
  LEFT JOIN course_modules cm ON cm.course_id = c.id
  LEFT JOIN course_units cu ON cu.course_id = c.id
  GROUP BY COALESCE(cm.course_id, cu.course_id), c.title
  HAVING COUNT(DISTINCT cm.id) > 0 AND COUNT(DISTINCT cu.id) > 0
) subquery
ORDER BY total DESC;

-- 7. Materiales vinculados a módulos
SELECT 
  'course_materials con module_id' as tipo,
  COUNT(*) as total
FROM course_materials
WHERE module_id IS NOT NULL
UNION ALL
SELECT 
  'materials con unit_id' as tipo,
  COUNT(*) as total
FROM materials
WHERE unit_id IS NOT NULL;

-- 8. Verificación de sesiones (deben estar vinculadas a unidades, no módulos)
SELECT 
  'sessions con unit_id' as tipo,
  COUNT(*) as total_sesiones,
  COUNT(DISTINCT unit_id) as unidades_con_sesiones
FROM sessions
WHERE unit_id IS NOT NULL;

-- =====================================================
-- RESUMEN EJECUTIVO
-- =====================================================
-- Ejecutar las consultas anteriores y analizar:
-- 1. ¿Cuántos módulos vs unidades hay?
-- 2. ¿Hay cursos con módulos pero sin unidades?
-- 3. ¿Hay cursos con unidades pero sin módulos?
-- 4. ¿Hay cursos con ambos?
-- 5. ¿Cuántos materiales están vinculados a módulos vs unidades?
-- 
-- DECISIÓN:
-- - Si course_modules tiene muchos datos importantes → Migrar a course_units
-- - Si course_modules está vacío o es de prueba → Deprecar y usar solo course_units
-- - Si ambos tienen datos → Decidir estrategia de unificación

