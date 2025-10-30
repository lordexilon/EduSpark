-- Script para debuggear y verificar los roles
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar que los roles existen
SELECT * FROM roles ORDER BY id;

-- 2. Verificar las políticas de RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'roles';

-- 3. Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'roles';

-- 4. Si hay problemas con RLS, deshabilitar temporalmente para probar
-- ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- 5. Probar consulta simple
SELECT id, name, description FROM roles ORDER BY id;

-- 6. Verificar permisos del usuario actual
SELECT current_user, current_role;
