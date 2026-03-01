-- Script para verificar el estado de RLS
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar si RLS está habilitado o deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 2. Verificar las políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 3. Si RLS está habilitado, deshabilitarlo
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Verificar nuevamente
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';
