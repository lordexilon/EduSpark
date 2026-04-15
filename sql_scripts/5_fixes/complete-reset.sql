-- Script completo para reset total de la base de datos
-- Ejecutar en el SQL Editor de Supabase

-- 1. DESHABILITAR RLS TEMPORALMENTE
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- 3. ELIMINAR TRIGGERS EXISTENTES
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- 4. ELIMINAR FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 5. ELIMINAR TABLAS EXISTENTES (CON TODOS SUS DATOS)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- 6. RECREAR TABLA DE ROLES
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. INSERTAR ROLES BÁSICOS
INSERT INTO roles (name, description) VALUES 
('student', 'Estudiante'),
('teacher', 'Docente'),
('admin', 'Administrador');

-- 8. RECREAR TABLA DE USUARIOS (SIN PASSWORD, MANEJADO POR SUPABASE AUTH)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. HABILITAR RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 10. CREAR FUNCIÓN PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. CREAR TRIGGERS
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. CREAR POLÍTICAS DE SEGURIDAD
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
