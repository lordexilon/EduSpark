-- 81_migracion_SIMPLE.sql
-- Versión SIMPLIFICADA de la migración SIN transacción
-- Ejecuta cada bloque individualmente

-- =====================================================
-- PASO 1: Migrar course_modules → course_units
-- =====================================================

INSERT INTO course_units (
  id,
  course_id,
  number,
  title,
  description,
  order_index,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  cm.course_id::INTEGER,
  COALESCE(cm."order", 0) + 1,
  COALESCE(cm.title, cm.name),
  cm.description,
  COALESCE(cm."order", 0),
  cm.created_at,
  cm.updated_at
FROM course_modules cm
WHERE NOT EXISTS (
  SELECT 1 
  FROM course_units cu 
  WHERE cu.course_id = cm.course_id::INTEGER 
    AND cu.title = COALESCE(cm.title, cm.name)
    AND cu.order_index = COALESCE(cm."order", 0)
)
AND cm.is_active = true;

-- Verificar que se insertaron 6 registros
SELECT COUNT(*) as unidades_insertadas FROM course_units WHERE course_id = 9;

-- =====================================================
-- PASO 2: Verificar unidades insertadas
-- =====================================================

SELECT 
  id,
  course_id,
  number,
  title,
  order_index
FROM course_units
WHERE course_id = 9
ORDER BY order_index;

-- =====================================================
-- PASO 3: Migrar materiales (ejecutar después de PASO 1)
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
  gen_random_uuid(),
  cmat.course_id::INTEGER,
  cu.id,
  cmat.title,
  COALESCE(
    CASE 
      WHEN cmat.type = 'video' THEN 'video'
      WHEN cmat.type = 'document' THEN 'pdf'
      ELSE 'other'
    END,
    'other'
  )::TEXT,
  COALESCE(cmat.file_url, cmat.source_url),
  NULL,
  NULL,
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
    SELECT 1 
    FROM materials m 
    WHERE m.course_id = cmat.course_id::INTEGER
      AND m.unit_id = cu.id
      AND m.title = cmat.title
  );

-- Verificar que se insertaron 2 materiales
SELECT COUNT(*) as materiales_insertados 
FROM materials 
WHERE metadata->>'migrated_from' = 'course_materials';

-- =====================================================
-- PASO 4: Verificación final
-- =====================================================

SELECT 
  cu.id,
  cu.course_id,
  cu.number,
  cu.title,
  COUNT(m.id) as materiales_count
FROM course_units cu
LEFT JOIN materials m ON m.unit_id = cu.id
WHERE cu.course_id = 9
GROUP BY cu.id, cu.course_id, cu.number, cu.title
ORDER BY cu.order_index;

