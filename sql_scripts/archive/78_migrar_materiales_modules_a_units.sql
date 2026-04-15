-- 78_migrar_materiales_modules_a_units.sql
-- Script para migrar materiales de course_materials (con module_id) a materials (con unit_id)
-- Debe ejecutarse DESPUÉS de 77_migrar_modules_a_units.sql

-- =====================================================
-- PREREQUISITO: Ejecutar 77_migrar_modules_a_units.sql primero
-- =====================================================

-- =====================================================
-- IMPORTANTE: Este script está en modo transacción
-- Revisar los resultados antes de hacer COMMIT
-- Si hay problemas, hacer ROLLBACK
-- =====================================================
-- PREREQUISITO: Ejecutar 77_migrar_modules_a_units.sql primero
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Verificar mapeo módulos → unidades
-- =====================================================

-- Ver el mapeo entre módulos y unidades migradas
SELECT 
  cm.id as modulo_id,
  cm.name as modulo_nombre,
  cu.id as unidad_id,
  cu.title as unidad_titulo,
  COUNT(DISTINCT cmat.id) as materiales_en_modulo
FROM course_modules cm
INNER JOIN course_units cu ON cu.course_id = cm.course_id::INTEGER
  AND cu.title = COALESCE(cm.title, cm.name)
  AND cu.order_index = COALESCE(cm."order", 0)
LEFT JOIN course_materials cmat ON cmat.module_id = cm.id
GROUP BY cm.id, cm.name, cu.id, cu.title
ORDER BY cm.course_id, cu.order_index;

-- =====================================================
-- PASO 2: Migrar materiales
-- =====================================================

INSERT INTO materials (
  id,
  course_id,
  unit_id,
  title,
  kind,
  url,
  mime_type,
  size_bytes,
  metadata,
  created_at
)
SELECT 
  gen_random_uuid(), -- Nuevo UUID
  cmat.course_id::INTEGER, -- Convertir a INTEGER
  cu.id, -- UUID de la unidad migrada
  cmat.title,
  COALESCE(
    CASE 
      WHEN cmat.type = 'video' THEN 'video'
      WHEN cmat.type = 'document' THEN 'pdf'
      WHEN cmat.type = 'image' THEN 'other' -- materials no tiene 'image', usar 'other'
      ELSE 'other'
    END,
    'other'
  )::TEXT,
  COALESCE(cmat.file_url, cmat.source_url),
  NULL, -- mime_type (no existe en course_materials)
  NULL, -- size_bytes (no existe en course_materials)
  jsonb_build_object(
    'migrated_from', 'course_materials',
    'original_module_id', cmat.module_id,
    'original_type', cmat.type,
    'difficulty', cmat.difficulty,
    'order_index', cmat.order_index,
    'is_active', cmat.is_active
  ),
  COALESCE(cmat.created_at, NOW())
FROM course_materials cmat
INNER JOIN course_modules cm ON cm.id = cmat.module_id
INNER JOIN course_units cu ON cu.course_id = cm.course_id::INTEGER
  AND cu.title = COALESCE(cm.title, cm.name)
  AND cu.order_index = COALESCE(cm."order", 0)
WHERE cmat.module_id IS NOT NULL
  AND NOT EXISTS (
    -- Evitar duplicados
    SELECT 1 
    FROM materials m 
    WHERE m.course_id = cmat.course_id::INTEGER
      AND m.unit_id = cu.id
      AND m.title = cmat.title
  );

-- =====================================================
-- PASO 3: Verificar migración de materiales
-- =====================================================

SELECT 
  'Materiales migrados' as accion,
  COUNT(*) as total_migrados
FROM materials m
WHERE m.metadata->>'migrated_from' = 'course_materials';

-- Ver detalles de materiales migrados
SELECT 
  m.id,
  m.course_id,
  cu.title as unidad_titulo,
  m.title as material_titulo,
  m.kind,
  m.url,
  m.metadata->>'original_module_id' as modulo_original_id
FROM materials m
INNER JOIN course_units cu ON cu.id = m.unit_id
WHERE m.metadata->>'migrated_from' = 'course_materials'
ORDER BY m.course_id, cu.order_index;

-- =====================================================
-- PASO 4: Verificar integridad
-- =====================================================

-- Comparar cantidad de materiales antes y después
SELECT 
  'course_materials con module_id' as origen,
  COUNT(*) as cantidad
FROM course_materials
WHERE module_id IS NOT NULL
UNION ALL
SELECT 
  'materials migrados (metadata)' as destino,
  COUNT(*) as cantidad
FROM materials
WHERE metadata->>'migrated_from' = 'course_materials';

-- =====================================================
-- NOTAS
-- =====================================================

-- ⚠️ DESPUÉS DE LA MIGRACIÓN:
-- 1. Verificar que los materiales migrados sean visibles en las unidades
-- 2. Probar que CourseViewPage muestra correctamente los materiales
-- 3. Opcional: Marcar course_materials como deprecado o eliminar después de verificar

-- Si hay problemas, hacer ROLLBACK
-- ROLLBACK;

-- Si todo está correcto, hacer COMMIT
-- COMMIT;

