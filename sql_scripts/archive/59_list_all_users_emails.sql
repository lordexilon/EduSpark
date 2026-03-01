-- 59_list_all_users_emails.sql
-- Lista todos los usuarios con sus emails para verificación
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- LISTAR TODOS LOS USUARIOS Y SUS EMAILS
-- =====================================================

SELECT 
  'Usuarios en auth.users' as tabla,
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ ELIMINADO'
    WHEN email_confirmed_at IS NULL THEN '⏳ NO CONFIRMADO'
    WHEN last_sign_in_at IS NULL THEN '⚠️ NUNCA HA INICIADO SESIÓN'
    ELSE '✅ ACTIVO'
  END as estado,
  created_at
FROM auth.users
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- =====================================================
-- LISTAR EMAILS SIMILARES (PARA VERIFICAR TYPOS)
-- =====================================================

SELECT 
  'Emails similares a miguel' as busqueda,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmado,
  created_at
FROM auth.users
WHERE email LIKE '%miguel%'
  AND deleted_at IS NULL
ORDER BY email;

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$
DECLARE
  total_usuarios INTEGER;
  usuarios_no_confirmados INTEGER;
  usuarios_confirmados INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_usuarios
  FROM auth.users
  WHERE deleted_at IS NULL;
  
  SELECT COUNT(*) INTO usuarios_no_confirmados
  FROM auth.users
  WHERE deleted_at IS NULL
    AND email_confirmed_at IS NULL;
  
  SELECT COUNT(*) INTO usuarios_confirmados
  FROM auth.users
  WHERE deleted_at IS NULL
    AND email_confirmed_at IS NOT NULL;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN DE USUARIOS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de usuarios activos: %', total_usuarios;
  RAISE NOTICE 'Usuarios con email confirmado: %', usuarios_confirmados;
  RAISE NOTICE 'Usuarios sin email confirmado: %', usuarios_no_confirmados;
  RAISE NOTICE '';
  IF usuarios_no_confirmados > 0 THEN
    RAISE NOTICE '⚠️ Hay % usuario(s) con email sin confirmar.', usuarios_no_confirmados;
    RAISE NOTICE '   Estos usuarios NO pueden iniciar sesión hasta confirmar su email.';
    RAISE NOTICE '   Ejecuta: 58_confirm_user_email.sql para confirmarlos manualmente.';
  END IF;
  RAISE NOTICE '';
END $$;

