-- Script para insertar todos los roles necesarios
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar roles existentes (si quieres empezar limpio)
-- DELETE FROM roles;

-- Insertar todos los roles básicos
INSERT INTO roles (name, description) VALUES 
('student', 'Estudiante'),
('teacher', 'Docente'),
('admin', 'Administrador')
ON CONFLICT (name) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT * FROM roles ORDER BY id;
