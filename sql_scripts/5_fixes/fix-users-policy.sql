-- Script para permitir inserción de usuarios durante el registro
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar políticas existentes de la tabla users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Teachers can view students" ON users;

-- 2. Crear nuevas políticas para la tabla users
-- Permitir inserción de nuevos usuarios (para registro)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT
    WITH CHECK (true);

-- Permitir a los usuarios ver su propia información
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Permitir a los usuarios actualizar su propia información
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Permitir a los administradores gestionar todos los usuarios
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
    );

-- Permitir a los docentes ver estudiantes
CREATE POLICY "Teachers can view students" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('admin', 'teacher')
        )
    );

-- 3. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
