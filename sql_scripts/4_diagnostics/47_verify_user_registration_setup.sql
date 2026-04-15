-- 47_verify_user_registration_setup.sql
-- Verifica que el trigger y la función RPC estén correctamente configurados
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR TRIGGER
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';

-- =====================================================
-- VERIFICAR FUNCIÓN DEL TRIGGER
-- =====================================================

SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- =====================================================
-- VERIFICAR FUNCIÓN RPC
-- =====================================================

SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_schema,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_user_profile';

-- =====================================================
-- VERIFICAR POLÍTICAS RLS PARA users
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- VERIFICAR PERMISOS DE LA FUNCIÓN RPC
-- =====================================================

SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_user_profile';

-- =====================================================
-- VERIFICAR ÚLTIMOS USUARIOS CREADOS EN auth.users
-- =====================================================

SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'role_id' as role_id
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- VERIFICAR ÚLTIMOS USUARIOS EN public.users
-- =====================================================

SELECT 
  id,
  email,
  first_name,
  last_name,
  role_id,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- VERIFICAR USUARIOS EN auth.users QUE NO ESTÁN EN public.users
-- =====================================================

SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  'Usuario en auth.users pero NO en public.users (el trigger falló)' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$
DECLARE
  trigger_count INTEGER;
  handle_user_function_count INTEGER;
  rpc_function_count INTEGER;
BEGIN
  -- Contar triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';
  
  -- Contar función handle_new_user
  SELECT COUNT(*) INTO handle_user_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = 'handle_new_user';
  
  -- Contar función RPC
  SELECT COUNT(*) INTO rpc_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = 'create_user_profile';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN DE CONFIGURACIÓN DE REGISTRO DE USUARIOS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger on_auth_user_created: %', 
    CASE WHEN trigger_count > 0 THEN '✅ ACTIVO' ELSE '❌ NO ENCONTRADO' END;
  RAISE NOTICE 'Función handle_new_user: %', 
    CASE WHEN handle_user_function_count > 0 THEN '✅ EXISTE' ELSE '❌ NO ENCONTRADA' END;
  RAISE NOTICE 'Función RPC create_user_profile: %', 
    CASE WHEN rpc_function_count > 0 THEN '✅ EXISTE' ELSE '❌ NO ENCONTRADA' END;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Si el trigger NO está activo, ejecuta: 45_fix_user_registration_trigger.sql';
  RAISE NOTICE 'Si la función RPC NO existe, ejecuta: 46_create_user_registration_rpc.sql';
  RAISE NOTICE '';
END $$;

