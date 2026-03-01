-- 77_migrar_modules_a_units.sql
-- Script para migrar datos de course_modules a course_units
-- Permite que el contenido creado por admin/coordinator sea visible para estudiantes

-- =====================================================
-- IMPORTANTE: Ejecutar el script 76_verificar_datos_modulos_unidades.sql primero
-- para verificar qué datos se van a migrar
-- =====================================================

-- =====================================================
-- IMPORTANTE: Este script está en modo transacción
-- Revisar los resultados antes de hacer COMMIT
-- Si hay problemas, hacer ROLLBACK
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Migrar course_modules → course_units
-- =====================================================

-- Crear unidades desde módulos existentes
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
  gen_random_uuid(), -- Generar nuevo UUID para cada unidad
  cm.course_id::INTEGER, -- Convertir BIGINT a INTEGER
  COALESCE(cm."order", 0) + 1, -- Usar order + 1 como number (course_units.number empieza en 1)
  COALESCE(cm.title, cm.name), -- Preferir title, fallback a name
  cm.description,
  COALESCE(cm."order", 0), -- Usar order como order_index
  cm.created_at,
  cm.updated_at
FROM course_modules cm
WHERE NOT EXISTS (
  -- Solo migrar si no existe ya una unidad con el mismo título y curso
  SELECT 1 
  FROM course_units cu 
  WHERE cu.course_id = cm.course_id::INTEGER 
    AND cu.title = COALESCE(cm.title, cm.name)
    AND cu.order_index = COALESCE(cm."order", 0)
)
AND cm.is_active = true; -- Solo migrar módulos activos

-- Verificar cuántos registros se insertaron
SELECT 
  'Unidades migradas desde módulos' as accion,
  COUNT(*) as cantidad
FROM course_units cu
WHERE EXISTS (
  SELECT 1 
  FROM course_modules cm
  WHERE cm.course_id::INTEGER = cu.course_id
    AND COALESCE(cm.title, cm.name) = cu.title
    AND COALESCE(cm."order", 0) = cu.order_index
);

-- =====================================================
-- PASO 2: Migrar materiales de course_materials → materials
-- =====================================================

-- Primero, verificar si hay materiales en course_materials vinculados a módulos
DO $$
DECLARE
  materiales_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO materiales_count
  FROM course_materials
  WHERE module_id IS NOT NULL;
  
  IF materiales_count > 0 THEN
    RAISE NOTICE 'Se encontraron % materiales en course_materials vinculados a módulos', materiales_count;
    RAISE NOTICE 'NOTA: La tabla materials requiere unit_id (UUID), pero course_materials tiene module_id (BIGINT)';
    RAISE NOTICE 'Necesitarás migrar manualmente estos materiales después de que las unidades estén creadas';
    RAISE NOTICE 'Usando el mapeo: course_modules.id → course_units.id (por título y orden)';
  ELSE
    RAISE NOTICE 'No hay materiales en course_materials para migrar';
  END IF;
END $$;

-- Script auxiliar para migrar materiales (ejecutar después de la migración de unidades)
-- Este script debe ejecutarse manualmente después de verificar el mapeo correcto
/*
INSERT INTO materials (
  id,
  course_id,
  unit_id,
  title,
  kind,
  url,
  metadata,
  created_at
)
SELECT 
  gen_random_uuid(),
  cm.course_id::INTEGER,
  cu.id, -- Usar el UUID de la unidad migrada
  cm.title,
  COALESCE(cm.type, 'other')::TEXT,
  COALESCE(cm.file_url, cm.source_url),
  jsonb_build_object(
    'migrated_from', 'course_materials',
    'original_module_id', cm.module_id,
    'difficulty', cm.difficulty,
    'order_index', cm.order_index
  ),
  cm.created_at
FROM course_materials cm
INNER JOIN course_modules mod ON mod.id = cm.module_id
INNER JOIN course_units cu ON cu.course_id = mod.course_id::INTEGER
  AND cu.title = COALESCE(mod.title, mod.name)
  AND cu.order_index = COALESCE(mod."order", 0)
WHERE cm.module_id IS NOT NULL;
*/

-- =====================================================
-- PASO 3: Verificar migración
-- =====================================================

-- Verificar que las unidades migradas estén correctas
SELECT 
  'Verificación de migración' as accion,
  cm.id as modulo_id_original,
  cm.name as modulo_nombre,
  cu.id as unidad_id_nueva,
  cu.title as unidad_titulo,
  cu.number as unidad_numero,
  cu.order_index as unidad_orden
FROM course_modules cm
INNER JOIN course_units cu ON cu.course_id = cm.course_id::INTEGER
  AND cu.title = COALESCE(cm.title, cm.name)
  AND cu.order_index = COALESCE(cm."order", 0)
ORDER BY cm.course_id, cu.order_index;

-- =====================================================
-- PASO 4: Actualizar número de unidades si hay conflictos
-- =====================================================

-- Ajustar números de unidades si hay conflictos
-- (Las unidades migradas deben tener números únicos consecutivos por curso)
DO $$
DECLARE
  curso_rec RECORD;
  unidad_rec RECORD;
  nuevo_numero INTEGER;
BEGIN
  FOR curso_rec IN 
    SELECT DISTINCT course_id 
    FROM course_units 
    WHERE course_id IN (SELECT DISTINCT course_id::INTEGER FROM course_modules)
  LOOP
    -- Reordenar números de unidades para este curso
    nuevo_numero := 1;
    FOR unidad_rec IN 
      SELECT id 
      FROM course_units 
      WHERE course_id = curso_rec.course_id
      ORDER BY order_index, created_at
    LOOP
      UPDATE course_units
      SET number = nuevo_numero
      WHERE id = unidad_rec.id;
      nuevo_numero := nuevo_numero + 1;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- ⚠️ DESPUÉS DE LA MIGRACIÓN:
-- 1. Verificar que las unidades migradas sean visibles en CourseViewPage
-- 2. Actualizar CourseModulesPage para usar course_units en lugar de course_modules
-- 3. Actualizar ModuleEditorPage para usar course_units
-- 4. Opcional: Deprecar o eliminar course_modules después de verificar que todo funciona
-- 5. Migrar manualmente los materiales de course_materials si existen

-- =====================================================
-- ROLLBACK (por si algo sale mal)
-- =====================================================

-- Si necesitas revertir la migración, ejecuta:
/*
DELETE FROM course_units 
WHERE EXISTS (
  SELECT 1 
  FROM course_modules cm
  WHERE cm.course_id::INTEGER = course_units.course_id
    AND COALESCE(cm.title, cm.name) = course_units.title
    AND COALESCE(cm."order", 0) = course_units.order_index
);
*/

-- Verificar antes de hacer COMMIT
SELECT 
  'Resumen de migración' as accion,
  (SELECT COUNT(*) FROM course_modules) as modulos_originales,
  (SELECT COUNT(*) FROM course_units 
   WHERE EXISTS (
     SELECT 1 FROM course_modules cm
     WHERE cm.course_id::INTEGER = course_units.course_id
       AND COALESCE(cm.title, cm.name) = course_units.title
   )
  ) as unidades_migradas;

-- Si todo está correcto, hacer COMMIT
-- COMMIT;

-- Si hay problemas, hacer ROLLBACK
-- ROLLBACK;

