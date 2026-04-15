-- Script para permitir lectura de roles sin autenticación
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar la política actual que requiere autenticación
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;

-- 2. Crear nueva política que permita lectura a todos (incluyendo no autenticados)
CREATE POLICY "Allow public read access to roles" ON roles
    FOR SELECT
    USING (true);

-- 3. Verificar que la política se creó correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'roles';
