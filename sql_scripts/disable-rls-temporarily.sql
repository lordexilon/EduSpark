-- Script para deshabilitar temporalmente RLS en la tabla users
-- Ejecutar en el SQL Editor de Supabase

-- 1. Deshabilitar RLS temporalmente en la tabla users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS está deshabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 3. Verificar que no hay políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
