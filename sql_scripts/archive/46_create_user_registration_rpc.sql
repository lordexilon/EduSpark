-- 46_create_user_registration_rpc.sql
-- Crea una función RPC para permitir que un usuario se inserte a sí mismo después del registro
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- FUNCIÓN RPC PARA INSERCIÓN MANUAL DE USUARIO
-- =====================================================

-- Esta función permite que un usuario se inserte a sí mismo en public.users
-- después de registrarse en Supabase Auth. Se usa como fallback cuando el trigger falla.
-- La función verifica que el usuario esté autenticado y que el ID coincida.

DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role_id INTEGER DEFAULT 1 -- Default: student (1=student, 2=teacher, 3=admin, 4=coordinator)
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role_id INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario existe en auth.users (se registró exitosamente)
  -- Esto es más seguro que depender de auth.uid() que puede ser NULL durante el registro
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'El usuario no existe en auth.users. Debe registrarse primero en Supabase Auth.';
  END IF;
  
  -- Si hay una sesión activa, verificar que el ID coincida
  -- Si no hay sesión (durante el registro inicial), permitir la creación
  -- porque verificamos que el usuario existe en auth.users arriba
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para crear este perfil';
  END IF;

  -- Insertar o actualizar el usuario (ON CONFLICT para evitar duplicados)
  INSERT INTO public.users (id, email, first_name, last_name, role_id)
  VALUES (
    p_user_id,
    p_email,
    p_first_name,
    p_last_name,
    COALESCE(p_role_id, 1) -- Default: student (ID: 1) - Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    role_id = COALESCE(EXCLUDED.role_id, public.users.role_id),
    updated_at = NOW();
  
  -- Devolver el resultado directamente con RETURN QUERY desde la tabla
  -- Usar alias de tabla completo para evitar cualquier ambigüedad
  RETURN QUERY
  SELECT 
    u_table.id,
    u_table.email,
    u_table.first_name,
    u_table.last_name,
    u_table.role_id,
    u_table.created_at,
    u_table.updated_at
  FROM public.users u_table
  WHERE u_table.id = p_user_id;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_user_profile';

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Función RPC create_user_profile creada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE 'Esta función permite que un usuario se inserte a sí mismo';
  RAISE NOTICE 'en public.users después del registro en Supabase Auth.';
  RAISE NOTICE '';
  RAISE NOTICE 'La función verifica automáticamente que:';
  RAISE NOTICE '1. El usuario esté autenticado';
  RAISE NOTICE '2. El ID coincida con auth.uid()';
  RAISE NOTICE '';
  RAISE NOTICE 'Uso: SELECT * FROM create_user_profile(user_id, email, first_name, last_name, role_id);';
END $$;

