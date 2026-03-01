-- ============================================
-- VERIFICACIÓN PRE-FASE 1
-- ============================================
-- Ejecutar este script ANTES de ejecutar los scripts de Fase 1
-- para verificar el estado actual de la base de datos
-- ============================================

-- 1. VERIFICAR TABLAS EXISTENTES
SELECT 
  'Tablas Existentes' AS categoria,
  table_name AS nombre,
  CASE 
    WHEN table_name IN ('careers', 'subjects', 'career_enrollments', 'course_enrollments', 'subject_assignments') 
    THEN '⚠️ YA EXISTE - Verificar si necesita migración'
    ELSE '✓ OK'
  END AS estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'roles', 'courses', 'course_modules', 
    'course_materials', 'enrollments',
    'careers', 'subjects', 'career_enrollments', 
    'course_enrollments', 'subject_assignments'
  )
ORDER BY table_name;

-- 2. VERIFICAR ESTRUCTURA DE COURSES
SELECT 
  'Estructura de courses' AS categoria,
  column_name AS columna,
  data_type AS tipo,
  is_nullable AS nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'courses'
  AND column_name IN ('subject_id', 'academic_period', 'start_date', 'end_date', 'schedule', 'max_students')
ORDER BY column_name;

-- 3. VERIFICAR SI EXISTE ENROLLMENTS Y SU ESTRUCTURA
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) THEN
    RAISE NOTICE '⚠️ Tabla enrollments existe - Verificar estructura';
  ELSE
    RAISE NOTICE '✓ Tabla enrollments no existe - Se creará course_enrollments';
  END IF;
END $$;

-- 4. VERIFICAR ROLES DISPONIBLES
SELECT 
  'Roles del Sistema' AS categoria,
  id,
  name AS nombre,
  description AS descripcion
FROM public.roles
ORDER BY id;

-- 5. VERIFICAR SI EXISTE ROL COORDINADOR
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'coordinator') 
    THEN '✓ Rol coordinator existe'
    ELSE '⚠️ Rol coordinator NO existe - Necesario agregarlo'
  END AS estado_coordinador;

-- 6. RESUMEN DE VERIFICACIÓN
DO $$
DECLARE
  v_courses_exists BOOLEAN;
  v_course_modules_exists BOOLEAN;
  v_enrollments_exists BOOLEAN;
  v_coordinator_role_exists BOOLEAN;
BEGIN
  -- Verificar tablas críticas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'courses'
  ) INTO v_courses_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'course_modules'
  ) INTO v_course_modules_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) INTO v_enrollments_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM public.roles WHERE name = 'coordinator'
  ) INTO v_coordinator_role_exists;
  
  RAISE NOTICE '=== RESUMEN DE VERIFICACIÓN ===';
  RAISE NOTICE 'Tabla courses: %', CASE WHEN v_courses_exists THEN '✓ Existe' ELSE '✗ No existe' END;
  RAISE NOTICE 'Tabla course_modules: %', CASE WHEN v_course_modules_exists THEN '✓ Existe' ELSE '✗ No existe' END;
  RAISE NOTICE 'Tabla enrollments: %', CASE WHEN v_enrollments_exists THEN '⚠️ Existe (verificar estructura)' ELSE '✓ No existe (OK)' END;
  RAISE NOTICE 'Rol coordinator: %', CASE WHEN v_coordinator_role_exists THEN '✓ Existe' ELSE '⚠️ NO existe - Agregar antes de continuar' END;
  RAISE NOTICE '=== LISTO PARA FASE 1: % ===', 
    CASE 
      WHEN v_courses_exists AND v_course_modules_exists AND v_coordinator_role_exists 
      THEN 'SÍ (si enrollments no existe o está OK)'
      ELSE 'NO - Corregir problemas antes'
    END;
END $$;

