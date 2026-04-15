-- Script para configurar políticas finales de RLS
-- Ejecutar en el SQL Editor de Supabase

-- 1. Habilitar RLS en la tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Teachers can view students" ON users;

-- 3. Crear políticas más permisivas
-- Permitir inserción de nuevos usuarios (para registro)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT
    WITH CHECK (true);

-- Permitir lectura de usuarios a usuarios autenticados
CREATE POLICY "Allow authenticated read users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- Permitir actualización de perfil propio
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- 4. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Verificar el estado de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';
