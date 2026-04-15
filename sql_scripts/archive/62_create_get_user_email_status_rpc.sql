-- 62_create_get_user_email_status_rpc.sql
-- Crea una función RPC para obtener el estado de confirmación de email de usuarios
-- Ejecutar en el SQL Editor de Supabase

DROP FUNCTION IF EXISTS public.get_user_email_status(UUID);

CREATE OR REPLACE FUNCTION public.get_user_email_status(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  is_confirmed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END as is_confirmed
  FROM auth.users au
  WHERE au.id = p_user_id;
END;
$$;

-- Otorgar permiso de ejecución
GRANT EXECUTE ON FUNCTION public.get_user_email_status TO authenticated;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Función get_user_email_status creada exitosamente.';
  RAISE NOTICE '';
  RAISE NOTICE 'Esta función permite obtener el estado de confirmación';
  RAISE NOTICE 'de email de cualquier usuario.';
END $$;

