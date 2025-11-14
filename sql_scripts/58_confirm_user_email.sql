-- 58_confirm_user_email.sql
-- Confirma el email de un usuario manualmente
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR USUARIO ANTES DE CONFIRMAR
-- =====================================================

SELECT 
  'Usuario antes de confirmar' as verificacion,
  id,
  email,
  email_confirmed_at,
  created_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ ELIMINADO'
    WHEN email_confirmed_at IS NOT NULL THEN '✅ YA CONFIRMADO'
    ELSE '⏳ NO CONFIRMADO'
  END as estado
FROM auth.users
WHERE email = 'miguec@gmail.com'; -- Cambiar por el email a confirmar

-- =====================================================
-- PASO 2: CONFIRMAR EMAIL MANUALMENTE
-- =====================================================

-- Actualizar email_confirmed_at para confirmar el email
UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'miguec@gmail.com'  -- Cambiar por el email a confirmar
  AND email_confirmed_at IS NULL;

-- =====================================================
-- PASO 3: VERIFICAR DESPUÉS DE CONFIRMAR
-- =====================================================

SELECT 
  'Usuario después de confirmar' as verificacion,
  id,
  email,
  email_confirmed_at,
  updated_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMADO'
    ELSE '❌ ERROR: No se pudo confirmar'
  END as estado
FROM auth.users
WHERE email = 'miguec@gmail.com'; -- Cambiar por el email

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'CONFIRMACIÓN DE EMAIL';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Email confirmado manualmente.';
  RAISE NOTICE '';
  RAISE NOTICE 'Ahora el usuario puede iniciar sesión con:';
  RAISE NOTICE '  Email: miguec@gmail.com';
  RAISE NOTICE '  (Usa la contraseña que configuró durante el registro)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Verifica que estés usando el email correcto: miguec@gmail.com';
  RAISE NOTICE '   - NO miguelc@gmail.com (con la l)';
  RAISE NOTICE '';
END $$;

