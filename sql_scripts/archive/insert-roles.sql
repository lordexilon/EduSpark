-- Script para insertar roles básicos en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Insertar roles básicos
INSERT INTO roles (name, description) VALUES 
('student', 'Estudiante'),
('teacher', 'Docente'),
('admin', 'Administrador')
ON CONFLICT (name) DO NOTHING;
