-- 60_verify_user_active_status.sql
-- Verifica el estado activo/inactivo de usuarios
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR ESTADO EN public.users
-- =====================================================

SELECT 
  'Estado en public.users' as verificacion,
  u.id,
  u.email,
  u.is_active,
  u.created_at,
  r.name as role_name,
  CASE 
    WHEN u.is_active IS NULL THEN '⚠️ NULL (debería ser true o false)'
    WHEN u.is_active = false THEN '❌ INACTIVO'
    ELSE '✅ ACTIVO'
  END as estado_visual
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- =====================================================
-- PASO 2: VERIFICAR ESTADO EN auth.users
-- =====================================================

SELECT 
  'Estado en auth.users' as verificacion,
  au.id,
  au.email,
  au.email_confirmed_at,
  au.deleted_at,
  CASE 
    WHEN au.deleted_at IS NOT NULL THEN '❌ ELIMINADO'
    WHEN au.email_confirmed_at IS NULL THEN '⏳ EMAIL NO CONFIRMADO'
    ELSE '✅ ACTIVO Y CONFIRMADO'
  END as estado_auth
FROM auth.users au
WHERE au.deleted_at IS NULL
ORDER BY au.created_at DESC;

-- =====================================================
-- PASO 3: COMPARAR AMBAS TABLAS
-- =====================================================

SELECT 
  'Comparación de estados' as verificacion,
  pu.email,
  pu.is_active as public_is_active,
  au.email_confirmed_at IS NOT NULL as auth_confirmed,
  au.deleted_at IS NULL as auth_not_deleted,
  CASE 
    WHEN pu.is_active = false THEN '❌ INACTIVO (correcto)'
    WHEN au.deleted_at IS NOT NULL THEN '❌ ELIMINADO EN AUTH'
    WHEN au.email_confirmed_at IS NULL THEN '⏳ EMAIL NO CONFIRMADO'
    WHEN pu.is_active = true AND au.email_confirmed_at IS NOT NULL AND au.deleted_at IS NULL THEN '✅ ACTIVO'
    ELSE '⚠️ ESTADO INCONSISTENTE'
  END as estado_completo
FROM public.users pu
INNER JOIN auth.users au ON pu.id = au.id
WHERE au.deleted_at IS NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- PASO 4: CORREGIR ESTADO DE miguec@gmail.com
-- =====================================================

-- Si el email no está confirmado, debería mostrarse como inactivo o pendiente
-- Opción 1: Establecer is_active = false si email no confirmado
UPDATE public.users pu
SET is_active = false,
    updated_at = NOW()
FROM auth.users au
WHERE pu.id = au.id
  AND pu.email = 'miguec@gmail.com'
  AND au.email_confirmed_at IS NULL
  AND pu.is_active = true;

-- Verificar después de la corrección
SELECT 
  'Estado después de corrección' as verificacion,
  pu.email,
  pu.is_active,
  au.email_confirmed_at,
  CASE 
    WHEN pu.is_active = false THEN '❌ INACTIVO'
    WHEN au.email_confirmed_at IS NULL THEN '⏳ EMAIL NO CONFIRMADO'
    ELSE '✅ ACTIVO'
  END as estado
FROM public.users pu
INNER JOIN auth.users au ON pu.id = au.id
WHERE pu.email = 'miguec@gmail.com';

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN Y CORRECCIÓN DE ESTADO DE USUARIOS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Se actualizó miguec@gmail.com:';
  RAISE NOTICE '   - is_active = false (porque email no confirmado)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Para activar el usuario:';
  RAISE NOTICE '   1. Confirmar el email ejecutando: 58_confirm_user_email.sql';
  RAISE NOTICE '   2. O establecer is_active = true manualmente';
  RAISE NOTICE '';
END $$;

