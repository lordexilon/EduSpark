-- Script para corregir la función get_user_email_status
-- El problema es que auth.users.email es VARCHAR(255) pero la función declara TEXT

DROP FUNCTION IF EXISTS public.get_user_email_status(UUID);

CREATE OR REPLACE FUNCTION public.get_user_email_status(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),  -- Cambiado de TEXT a VARCHAR(255) para coincidir con auth.users
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
    au.email::VARCHAR(255),  -- Cast explícito para asegurar el tipo correcto
    au.email_confirmed_at,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END as is_confirmed
  FROM auth.users au
  WHERE au.id = p_user_id;
END;
$$;

-- Otorgar permiso de ejecución
GRANT EXECUTE ON FUNCTION public.get_user_email_status(UUID) TO authenticated;

-- Verificar que la función se creó correctamente
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_email_status';
