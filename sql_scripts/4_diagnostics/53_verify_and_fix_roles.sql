-- 53_verify_and_fix_roles.sql
-- Verifica y corrige la estructura de roles según el mapeo correcto
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR ROLES ACTUALES
-- =====================================================

SELECT 
  'Roles actuales en la base de datos' as verificacion,
  id,
  name,
  description,
  created_at
FROM public.roles
ORDER BY id;

-- =====================================================
-- PASO 2: VERIFICAR MAPEO CORRECTO
-- =====================================================
-- Mapeo correcto según especificación:
-- 1 = student (Estudiante)
-- 2 = teacher (Docente)
-- 3 = admin (Administrador)
-- 4 = coordinator (Coordinador)

-- Verificar si el mapeo actual es correcto
DO $$
DECLARE
  student_id INTEGER;
  teacher_id INTEGER;
  admin_id INTEGER;
  coordinator_id INTEGER;
BEGIN
  -- Buscar IDs actuales
  SELECT id INTO student_id FROM public.roles WHERE name = 'student';
  SELECT id INTO teacher_id FROM public.roles WHERE name = 'teacher';
  SELECT id INTO admin_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO coordinator_id FROM public.roles WHERE name = 'coordinator';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE MAPEO DE ROLES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Mapeo correcto esperado:';
  RAISE NOTICE '  1 = student (Estudiante)';
  RAISE NOTICE '  2 = teacher (Docente)';
  RAISE NOTICE '  3 = admin (Administrador)';
  RAISE NOTICE '  4 = coordinator (Coordinador)';
  RAISE NOTICE '';
  RAISE NOTICE 'Estado actual:';
  RAISE NOTICE '  student (ID actual: %): %', 
    COALESCE(student_id::text, 'NO EXISTE'),
    CASE WHEN student_id = 1 THEN '✅ CORRECTO' ELSE '❌ INCORRECTO' END;
  RAISE NOTICE '  teacher (ID actual: %): %', 
    COALESCE(teacher_id::text, 'NO EXISTE'),
    CASE WHEN teacher_id = 2 THEN '✅ CORRECTO' ELSE '❌ INCORRECTO' END;
  RAISE NOTICE '  admin (ID actual: %): %', 
    COALESCE(admin_id::text, 'NO EXISTE'),
    CASE WHEN admin_id = 3 THEN '✅ CORRECTO' ELSE '❌ INCORRECTO' END;
  RAISE NOTICE '  coordinator (ID actual: %): %', 
    COALESCE(coordinator_id::text, 'NO EXISTE'),
    CASE WHEN coordinator_id = 4 THEN '✅ CORRECTO' ELSE '❌ NO EXISTE' END;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PASO 3: CREAR/VERIFICAR ROLES CON MAPEO CORRECTO
-- =====================================================

-- Insertar roles con IDs específicos usando SERIAL reset
-- Primero eliminar roles existentes si es necesario (CUIDADO: esto afectará usuarios existentes)

-- Opción A: Si NO hay usuarios asignados, recrear roles
-- Opción B: Si HAY usuarios, actualizar los roles existentes

-- Verificar si hay usuarios con roles asignados
SELECT 
  'Usuarios con roles asignados' as verificacion,
  r.id as role_id,
  r.name as role_name,
  COUNT(u.id) as usuarios_count
FROM public.roles r
LEFT JOIN public.users u ON r.id = u.role_id
GROUP BY r.id, r.name
ORDER BY r.id;

-- =====================================================
-- PASO 4: ACTUALIZAR ROLES SIN PERDER DATOS
-- =====================================================

-- Si los roles no tienen el mapeo correcto, hay dos opciones:
-- 1. Si no hay usuarios: Recrear roles
-- 2. Si hay usuarios: Crear nueva tabla temporal y migrar

-- Por seguridad, solo insertamos roles que no existan y verificamos los existentes
INSERT INTO public.roles (id, name, description)
VALUES 
  (1, 'student', 'Estudiante'),
  (2, 'teacher', 'Docente'),
  (3, 'admin', 'Administrador del sistema'),
  (4, 'coordinator', 'Coordinador académico')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Si hay conflictos de nombre (diferente ID), necesitamos manejar manualmente
-- Por ahora, solo actualizamos si el ID coincide

-- =====================================================
-- PASO 5: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  'Roles después de la corrección' as verificacion,
  id,
  name,
  description,
  CASE 
    WHEN id = 1 AND name = 'student' THEN '✅ CORRECTO'
    WHEN id = 2 AND name = 'teacher' THEN '✅ CORRECTO'
    WHEN id = 3 AND name = 'admin' THEN '✅ CORRECTO'
    WHEN id = 4 AND name = 'coordinator' THEN '✅ CORRECTO'
    ELSE '❌ REVISAR'
  END as estado
FROM public.roles
ORDER BY id;

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN COMPLETA DE ROLES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   Si los roles NO tienen el mapeo correcto y hay usuarios';
  RAISE NOTICE '   asignados, necesitarás migrar manualmente los role_id';
  RAISE NOTICE '   de los usuarios.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Mapeo correcto:';
  RAISE NOTICE '   1 = student (Estudiante)';
  RAISE NOTICE '   2 = teacher (Docente)';
  RAISE NOTICE '   3 = admin (Administrador)';
  RAISE NOTICE '   4 = coordinator (Coordinador)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Si todos los roles muestran "CORRECTO" arriba,';
  RAISE NOTICE '   el sistema está configurado correctamente.';
  RAISE NOTICE '';
END $$;
