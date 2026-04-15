-- 54_update_role_id_defaults.sql
-- Actualiza todas las referencias a role_id por defecto en la base de datos
-- Ejecutar en el SQL Editor de Supabase
--
-- Mapeo correcto:
-- 1 = student (Estudiante)
-- 2 = teacher (Docente)
-- 3 = admin (Administrador)
-- 4 = coordinator (Coordinador)

-- =====================================================
-- VERIFICAR ESTADO ACTUAL
-- =====================================================

SELECT 
  'Roles actuales' as verificacion,
  id,
  name,
  description
FROM public.roles
ORDER BY id;

-- =====================================================
-- ACTUALIZAR TRIGGER handle_new_user
-- =====================================================

-- El trigger ya fue actualizado en 48_fix_and_test_trigger.sql
-- Verificar que esté usando role_id = 1
SELECT 
  'Función handle_new_user' as verificacion,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- =====================================================
-- ACTUALIZAR FUNCIÓN RPC create_user_profile
-- =====================================================

-- La función ya fue actualizada en 46_create_user_registration_rpc.sql
-- Verificar que esté usando COALESCE(p_role_id, 1)
SELECT 
  'Función create_user_profile' as verificacion,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_user_profile';

-- =====================================================
-- RESUMEN Y VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE ROLE_ID POR DEFECTO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Mapeo correcto de roles:';
  RAISE NOTICE '  1 = student (Estudiante)';
  RAISE NOTICE '  2 = teacher (Docente)';
  RAISE NOTICE '  3 = admin (Administrador)';
  RAISE NOTICE '  4 = coordinator (Coordinador)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todos los usuarios nuevos deben crearse con role_id = 1 (student)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Archivos actualizados:';
  RAISE NOTICE '  - services/api.ts: forcedRoleId = 1';
  RAISE NOTICE '  - components/RegisterForm.tsx: roleIdToUse = 1';
  RAISE NOTICE '  - sql_scripts/48_fix_and_test_trigger.sql: role_id = 1';
  RAISE NOTICE '  - sql_scripts/46_create_user_registration_rpc.sql: COALESCE(p_role_id, 1)';
  RAISE NOTICE '  - AI_CONTEXT/schema_actual.md: Documentación actualizada';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   Si la base de datos tiene roles en orden diferente,';
  RAISE NOTICE '   ejecuta primero: 53_verify_and_fix_roles.sql';
  RAISE NOTICE '';
END $$;

