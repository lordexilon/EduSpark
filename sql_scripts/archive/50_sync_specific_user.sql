-- 50_sync_specific_user.sql
-- Sincroniza un usuario específico de auth.users a public.users
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR SI EXISTE EN public.users
-- =====================================================

SELECT 
  'Estado actual' as verificacion,
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  au.deleted_at,
  pu.id as public_id,
  pu.email as public_email,
  pu.role_id as public_role_id,
  CASE 
    WHEN pu.id IS NULL THEN '❌ NO EXISTE en public.users'
    ELSE '✅ EXISTE en public.users'
  END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.id = '228e43a9-d78d-4117-ab00-a01a39df51d3'; -- ID del usuario

-- =====================================================
-- PASO 2: INSERTAR O ACTUALIZAR EN public.users
-- =====================================================

INSERT INTO public.users (id, email, first_name, last_name, role_id)
SELECT 
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  1 -- Siempre estudiante (ID: 1) - Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator
FROM auth.users au
WHERE au.id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
  last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
  role_id = COALESCE(EXCLUDED.role_id, public.users.role_id),
  updated_at = NOW();

-- =====================================================
-- PASO 3: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  'Verificación final' as verificacion,
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name' as auth_first_name,
  au.raw_user_meta_data->>'last_name' as auth_last_name,
  (au.raw_user_meta_data->>'role_id')::integer as auth_role_id,
  pu.id as public_id,
  pu.email as public_email,
  pu.first_name as public_first_name,
  pu.last_name as public_last_name,
  pu.role_id as public_role_id,
  r.name as role_name,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ SINCRONIZADO'
    ELSE '❌ ERROR: No se pudo sincronizar'
  END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id = '228e43a9-d78d-4117-ab00-a01a39df51d3';

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'SINCRONIZACIÓN DE USUARIO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuario ID: 228e43a9-d78d-4117-ab00-a01a39df51d3';
  RAISE NOTICE 'Email: miguec@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Si el usuario aparece como "SINCRONIZADO" arriba,';
  RAISE NOTICE '   ya puede iniciar sesión normalmente.';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ Si sigue sin aparecer en public.users, el trigger';
  RAISE NOTICE '   puede tener un problema. Revisa los logs de Supabase.';
  RAISE NOTICE '';
END $$;

