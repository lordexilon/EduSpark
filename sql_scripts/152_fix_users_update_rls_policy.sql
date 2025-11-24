-- Script para corregir políticas RLS de actualización de usuarios
-- Permite que los usuarios actualicen su propio perfil incluyendo identity_document
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar política existente de actualización si existe
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;

-- 2. Crear política que permita actualizar todos los campos del perfil propio
-- IMPORTANTE: Usar WITH CHECK además de USING para permitir la actualización
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Verificar que la política se creó correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'users' 
  AND policyname LIKE '%update%'
ORDER BY policyname;

-- 4. Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- 5. Comentario sobre la política
COMMENT ON POLICY "users_update_own_profile" ON public.users IS
'Permite que los usuarios autenticados actualicen su propio perfil.
Incluye todos los campos editables: first_name, last_name, identity_document, avatar_url, etc.
Requiere que auth.uid() coincida con el id del usuario (USING y WITH CHECK).';

