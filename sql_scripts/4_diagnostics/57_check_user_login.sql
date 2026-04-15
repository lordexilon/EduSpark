-- 57_check_user_login.sql
-- Verifica usuarios y sus credenciales en auth.users
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR USUARIO ESPECÍFICO
-- =====================================================

-- Reemplazar 'miguelc@gmail.com' con el email que quieras verificar
SELECT 
  'Usuario en auth.users' as verificacion,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ ELIMINADO'
    WHEN email_confirmed_at IS NULL THEN '⏳ EMAIL NO CONFIRMADO'
    WHEN last_sign_in_at IS NULL THEN '⚠️ NUNCA HA INICIADO SESIÓN'
    ELSE '✅ ACTIVO'
  END as estado
FROM auth.users
WHERE email = 'miguelc@gmail.com'; -- Cambiar por el email a verificar

-- =====================================================
-- PASO 2: VERIFICAR SI EXISTE EN public.users
-- =====================================================

SELECT 
  'Usuario en public.users' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  u.is_active,
  u.created_at,
  CASE 
    WHEN u.is_active = false THEN '❌ INACTIVO'
    WHEN u.id IS NULL THEN '⚠️ NO EXISTE EN public.users'
    ELSE '✅ ACTIVO'
  END as estado
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'miguelc@gmail.com'; -- Cambiar por el email a verificar

-- =====================================================
-- PASO 3: COMPARAR AMBAS TABLAS
-- =====================================================

SELECT 
  'Comparación de usuarios' as verificacion,
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  au.deleted_at as auth_deleted,
  pu.id as public_id,
  pu.email as public_email,
  pu.is_active as public_active,
  r.name as public_role,
  CASE 
    WHEN au.deleted_at IS NOT NULL THEN '❌ Usuario eliminado en auth.users'
    WHEN au.email_confirmed_at IS NULL THEN '⏳ Email no confirmado'
    WHEN pu.id IS NULL THEN '⚠️ Existe en auth.users pero NO en public.users'
    WHEN pu.is_active = false THEN '⚠️ Existe pero está INACTIVO'
    WHEN au.id IS NULL THEN '⚠️ Existe en public.users pero NO en auth.users (RARO)'
    ELSE '✅ Usuario válido y activo'
  END as estado_completo
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.email = 'miguelc@gmail.com' OR pu.email = 'miguelc@gmail.com'; -- Cambiar por el email

-- =====================================================
-- PASO 4: LISTAR TODOS LOS USUARIOS (SIN MOSTRAR CONTRASEÑAS)
-- =====================================================

SELECT 
  'Todos los usuarios en auth.users' as verificacion,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌'
    WHEN email_confirmed_at IS NULL THEN '⏳'
    ELSE '✅'
  END as estado
FROM auth.users
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE USUARIOS PARA LOGIN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script verifica:';
  RAISE NOTICE '1. Si el usuario existe en auth.users';
  RAISE NOTICE '2. Si el email está confirmado';
  RAISE NOTICE '3. Si el usuario está eliminado';
  RAISE NOTICE '4. Si existe en public.users y está activo';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ CAUSAS COMUNES DE "Invalid login credentials":';
  RAISE NOTICE '   - Email o contraseña incorrectos';
  RAISE NOTICE '   - Usuario eliminado en auth.users';
  RAISE NOTICE '   - Email no confirmado (si confirmación está habilitada)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 SOLUCIONES:';
  RAISE NOTICE '   1. Verificar que el email sea correcto';
  RAISE NOTICE '   2. Verificar que el usuario exista y esté activo';
  RAISE NOTICE '   3. Si el usuario está eliminado, restaurarlo desde Dashboard';
  RAISE NOTICE '   4. Si el email no está confirmado, confirmarlo o deshabilitar';
  RAISE NOTICE '      la confirmación de email en Supabase Dashboard';
  RAISE NOTICE '';
END $$;

