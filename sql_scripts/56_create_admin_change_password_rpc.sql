-- 56_create_admin_change_password_rpc.sql
-- Crea una función RPC para que administradores puedan cambiar contraseñas de usuarios
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- FUNCIÓN RPC PARA CAMBIAR CONTRASEÑA (REQUIERE BACKEND)
-- =====================================================

-- ⚠️ NOTA IMPORTANTE: 
-- Cambiar contraseñas requiere acceso a Supabase Auth, que solo está disponible
-- mediante el service role key desde un backend. El cliente no puede hacerlo directamente.
--
-- Opciones:
-- 1. Crear un endpoint backend que use el service role key
-- 2. Usar Supabase Edge Functions con service role
-- 3. Usar una función RPC que llame a auth.users mediante extensiones (limitado)

-- Por ahora, esta función solo verifica permisos y registra la intención
-- El cambio real debe hacerse desde el backend o Supabase Dashboard

DROP FUNCTION IF EXISTS public.admin_change_user_password(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.admin_change_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario autenticado es admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar contraseñas';
  END IF;

  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'El usuario no existe';
  END IF;

  -- Verificar que la contraseña no está vacía
  IF p_new_password IS NULL OR LENGTH(TRIM(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres';
  END IF;

  -- ⚠️ IMPORTANTE: Esta función NO puede cambiar la contraseña directamente
  -- porque no tiene acceso a Supabase Auth desde PostgreSQL
  -- 
  -- Para cambiar contraseñas necesitas:
  -- 1. Un endpoint backend que use el service role key de Supabase
  -- 2. O hacerlo manualmente desde Supabase Dashboard > Authentication > Users

  RAISE EXCEPTION 'Esta función solo valida permisos. El cambio de contraseña debe hacerse desde el backend con service role key o desde Supabase Dashboard.';

END;
$$;

-- =====================================================
-- NOTAS SOBRE CAMBIO DE CONTRASEÑAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'INFORMACIÓN SOBRE CAMBIO DE CONTRASEÑAS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   Cambiar contraseñas de usuarios requiere acceso a Supabase Auth,';
  RAISE NOTICE '   lo cual solo está disponible mediante el service role key.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 OPCIONES DISPONIBLES:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Supabase Dashboard:';
  RAISE NOTICE '   - Ve a Authentication > Users';
  RAISE NOTICE '   - Selecciona el usuario';
  RAISE NOTICE '   - Click en "Reset Password" o edita manualmente';
  RAISE NOTICE '';
  RAISE NOTICE '2. Backend API (Recomendado):';
  RAISE NOTICE '   - Crea un endpoint que use el service role key';
  RAISE NOTICE '   - Usa: supabase.auth.admin.updateUserById(userId, { password })';
  RAISE NOTICE '';
  RAISE NOTICE '3. Supabase Edge Function:';
  RAISE NOTICE '   - Crea una función que use service role key';
  RAISE NOTICE '   - Llámala desde el frontend';
  RAISE NOTICE '';
  RAISE NOTICE '✅ SOLUCIÓN TEMPORAL:';
  RAISE NOTICE '   El frontend mostrará un mensaje indicando que el cambio';
  RAISE NOTICE '   debe hacerse desde Supabase Dashboard.';
  RAISE NOTICE '';
END $$;

