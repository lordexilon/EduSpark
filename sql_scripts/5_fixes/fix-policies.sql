-- Script para corregir solo las políticas problemáticas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar TODAS las políticas existentes de ambas tablas
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- 2. Eliminar políticas adicionales que puedan existir
DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- 3. Recrear las políticas correctas
-- Permitir lectura de roles a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to read roles" ON roles
    FOR SELECT TO authenticated
    USING (true);

-- Permitir a los usuarios ver su propia información
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Permitir a los usuarios actualizar su propia información
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Permitir inserción de nuevos usuarios (para registro)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
