-- 52_verify_trigger_active.sql
-- Verifica que el trigger de registro esté activo y funcionando
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR TRIGGER
-- =====================================================

SELECT 
  'Estado del Trigger' as verificacion,
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_statement,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ ACTIVO'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';

-- =====================================================
-- VERIFICAR FUNCIÓN
-- =====================================================

SELECT 
  'Estado de la Función' as verificacion,
  routine_name,
  routine_type,
  security_type,
  data_type as return_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- =====================================================
-- VERIFICAR RLS POLICIES PARA INSERT
-- =====================================================

SELECT 
  'Políticas RLS para INSERT' as verificacion,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
  AND cmd = 'INSERT';

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
  insert_policy_exists BOOLEAN;
BEGIN
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
  ) INTO trigger_exists;
  
  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'handle_new_user'
  ) INTO function_exists;
  
  -- Verificar política INSERT
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
      AND schemaname = 'public'
      AND cmd = 'INSERT'
  ) INTO insert_policy_exists;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DEL SISTEMA DE REGISTRO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger on_auth_user_created: %', 
    CASE WHEN trigger_exists THEN '✅ ACTIVO' ELSE '❌ NO EXISTE' END;
  RAISE NOTICE 'Función handle_new_user: %', 
    CASE WHEN function_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
  RAISE NOTICE 'Política RLS para INSERT: %', 
    CASE WHEN insert_policy_exists THEN '✅ CONFIGURADA' ELSE '❌ FALTANTE' END;
  RAISE NOTICE '';
  IF trigger_exists AND function_exists AND insert_policy_exists THEN
    RAISE NOTICE '✅ El sistema está configurado correctamente.';
    RAISE NOTICE '   Los nuevos registros deberían funcionar automáticamente.';
  ELSE
    RAISE NOTICE '⚠️ Hay problemas en la configuración.';
    IF NOT trigger_exists THEN
      RAISE NOTICE '   - Falta el trigger. Ejecuta: 48_fix_and_test_trigger.sql';
    END IF;
    IF NOT function_exists THEN
      RAISE NOTICE '   - Falta la función. Ejecuta: 48_fix_and_test_trigger.sql';
    END IF;
    IF NOT insert_policy_exists THEN
      RAISE NOTICE '   - Falta la política RLS. Ejecuta: 45_fix_user_registration_trigger.sql';
    END IF;
  END IF;
  RAISE NOTICE '';
END $$;

