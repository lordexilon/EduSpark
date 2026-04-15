-- 45_fix_user_registration_trigger.sql
-- Corrige y verifica el trigger de registro de usuarios
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR Y RECREAR EL TRIGGER
-- =====================================================

-- 1. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Eliminar función existente si existe
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- VERIFICAR POLÍTICAS RLS PARA PERMITIR INSERCIÓN
-- =====================================================

-- 5. Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Allow user registration" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- 6. Modificar la función handle_new_user para deshabilitar RLS temporalmente
-- Esto evita problemas de políticas RLS al insertar
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deshabilitar RLS temporalmente para esta operación (el trigger tiene permisos)
  -- Insertar directamente sin verificar políticas
  INSERT INTO public.users (id, email, first_name, last_name, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'role_id')::integer, 3) -- Default: student (ID: 3)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    role_id = COALESCE(EXCLUDED.role_id, public.users.role_id);
  
  RETURN new;
END;
$$;

-- 7. Crear política que permita la inserción
-- IMPORTANTE: El trigger usa SECURITY DEFINER y se ejecuta con permisos del propietario de la función
-- SECURITY DEFINER permite que el trigger inserte sin verificar políticas RLS
-- Esta política es principalmente para el frontend cuando un usuario se registra
-- Cuando un usuario se registra, auth.uid() coincide con el id que se está insertando
DROP POLICY IF EXISTS "Allow user registration via trigger or own insert" ON public.users;
CREATE POLICY "Allow user registration via trigger or own insert"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 8. Crear política SIMPLE para lectura SIN recursión
-- Solo permitir ver tu propio perfil (sin consultar users)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 8b. Crear política para actualización de perfil propio
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 9. Crear el trigger después de definir la función
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- NOTA: Si necesitas que los admins vean todos los usuarios, crea esa política
-- en una tabla separada o usa una función que consulte directamente auth.users metadata
-- en lugar de public.users para evitar recursión

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- 11. Verificar que el trigger se creó
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 12. Verificar que la función existe
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- 13. Verificar políticas RLS para users
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger y políticas RLS actualizados';
  RAISE NOTICE '';
  RAISE NOTICE 'Mejoras implementadas:';
  RAISE NOTICE '1. Trigger usa ON CONFLICT para evitar errores si el usuario ya existe';
  RAISE NOTICE '2. Políticas RLS actualizadas para permitir inserción del trigger';
  RAISE NOTICE '3. El trigger asigna rol por defecto (student, ID: 3) si no se especifica';
  RAISE NOTICE '';
  RAISE NOTICE 'El sistema ahora debería funcionar correctamente incluso si el trigger';
  RAISE NOTICE 'tarda en ejecutarse o si hay problemas de sincronización.';
END $$;

