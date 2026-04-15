-- 61_create_admin_confirm_email_rpc.sql
-- Crea una función RPC para permitir a un administrador confirmar el email de un usuario
-- Ejecutar en el SQL Editor de Supabase

DROP FUNCTION IF EXISTS public.admin_confirm_user_email(UUID);

CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con los privilegios del creador (admin)
SET search_path = public, auth
AS $$
DECLARE
  is_admin_user BOOLEAN;
  v_email TEXT;
BEGIN
  -- Verificar si el usuario que llama a esta función es un administrador o coordinador
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  ) INTO is_admin_user;

  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Solo los administradores y coordinadores pueden confirmar emails de usuarios.';
  END IF;

  -- Verificar que el usuario existe en auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado en auth.users.';
  END IF;

  -- Obtener el email del usuario
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  -- Confirmar el email (actualizar email_confirmed_at)
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Retornar el resultado
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    CASE 
      WHEN au.email_confirmed_at IS NOT NULL THEN 'Email confirmado exitosamente'
      ELSE 'Error al confirmar email'
    END as status
  FROM auth.users au
  WHERE au.id = p_user_id;
END;
$$;

-- Otorgar permiso de ejecución a usuarios autenticados
-- (la función verifica internamente que sea admin/coordinator)
GRANT EXECUTE ON FUNCTION public.admin_confirm_user_email TO authenticated;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'FUNCIÓN RPC: admin_confirm_user_email';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Función creada exitosamente.';
  RAISE NOTICE '';
  RAISE NOTICE 'Esta función permite a administradores y coordinadores';
  RAISE NOTICE 'confirmar manualmente el email de cualquier usuario.';
  RAISE NOTICE '';
  RAISE NOTICE 'Uso desde el frontend:';
  RAISE NOTICE '  supabase.rpc(''admin_confirm_user_email'', { p_user_id: userId })';
  RAISE NOTICE '';
END $$;

