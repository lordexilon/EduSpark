-- 49_check_email_exists.sql
-- Verifica si un email ya está registrado en auth.users o public.users
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR EMAIL EN auth.users
-- =====================================================

-- Reemplazar 'miguelc@gmail.com' con el email que quieras verificar
SELECT 
  'auth.users' as tabla,
  id,
  email,
  created_at,
  email_confirmed_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ ELIMINADO'
    WHEN email_confirmed_at IS NULL THEN '⏳ PENDIENTE DE CONFIRMACIÓN'
    ELSE '✅ ACTIVO'
  END as estado
FROM auth.users
WHERE email = 'miguelc@gmail.com'; -- Cambiar por el email a verificar

-- =====================================================
-- VERIFICAR EMAIL EN public.users
-- =====================================================

SELECT 
  'public.users' as tabla,
  id,
  email,
  first_name,
  last_name,
  role_id,
  created_at,
  CASE 
    WHEN id IN (SELECT id FROM auth.users WHERE deleted_at IS NOT NULL) THEN '❌ ELIMINADO EN AUTH'
    ELSE '✅ ACTIVO'
  END as estado
FROM public.users
WHERE email = 'miguelc@gmail.com'; -- Cambiar por el email a verificar

-- =====================================================
-- VERIFICAR AMBAS TABLAS (COMPARACIÓN)
-- =====================================================

SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  au.email_confirmed_at,
  au.deleted_at as auth_deleted,
  pu.id as public_user_id,
  pu.email as public_email,
  pu.first_name,
  pu.last_name,
  CASE 
    WHEN au.deleted_at IS NOT NULL THEN '❌ Usuario eliminado en auth.users'
    WHEN au.email_confirmed_at IS NULL THEN '⏳ Email no confirmado en auth.users'
    WHEN pu.id IS NULL THEN '⚠️ Usuario en auth.users pero NO en public.users'
    WHEN au.id IS NULL THEN '⚠️ Usuario en public.users pero NO en auth.users (RARO)'
    ELSE '✅ Usuario sincronizado correctamente'
  END as estado_sincronizacion
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'miguelc@gmail.com' OR pu.email = 'miguelc@gmail.com'; -- Cambiar por el email a verificar

-- =====================================================
-- LISTAR TODOS LOS EMAILS REGISTRADOS
-- =====================================================

SELECT 
  'Todos los usuarios' as resumen,
  COUNT(*) as total_usuarios
FROM auth.users
WHERE deleted_at IS NULL;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE EMAIL';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script verifica si el email existe en:';
  RAISE NOTICE '1. auth.users (tabla de Supabase Auth)';
  RAISE NOTICE '2. public.users (tabla personalizada)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Si el email existe pero está "deleted_at IS NOT NULL",';
  RAISE NOTICE '     Supabase puede rechazarlo con "email_address_invalid"';
  RAISE NOTICE '   - Si el email no está confirmado, puede estar pendiente';
  RAISE NOTICE '   - Si el email existe en auth.users pero NO en public.users,';
  RAISE NOTICE '     el trigger puede haber fallado';
  RAISE NOTICE '';
  RAISE NOTICE '💡 SOLUCIÓN:';
  RAISE NOTICE '   - Si el email existe pero está eliminado, puedes';
  RAISE NOTICE '     restaurarlo desde el Dashboard de Supabase';
  RAISE NOTICE '   - Si el email existe pero no está sincronizado, ejecuta:';
  RAISE NOTICE '     48_fix_and_test_trigger.sql para sincronizar';
  RAISE NOTICE '';
END $$;

