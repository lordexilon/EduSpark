-- Script para limpiar tablas existentes y recrear con la estructura correcta
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar tablas existentes (si existen)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- 2. Eliminar funciones y triggers relacionados
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. Crear tabla de roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Insertar roles básicos
INSERT INTO roles (name, description) VALUES 
('student', 'Estudiante'),
('teacher', 'Docente'),
('admin', 'Administrador');

-- 5. Crear tabla de usuarios (sin password, manejado por Supabase Auth)
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

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 7. Eliminar políticas existentes (si existen)
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON roles;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- 8. Políticas de seguridad básicas
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

-- 9. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Crear triggers para updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
