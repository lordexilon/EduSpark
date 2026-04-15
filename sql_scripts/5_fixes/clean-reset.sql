-- Script para reset completo de políticas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas (esto debería funcionar ahora)
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- 3. Habilitar RLS nuevamente
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Crear las políticas correctas
CREATE POLICY "Allow authenticated users to read roles" ON roles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Allow user registration" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
