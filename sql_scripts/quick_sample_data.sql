-- Script rápido para crear datos de ejemplo
-- Ejecutar en el SQL Editor de Supabase

-- 1. Primero, obtener el ID de un docente existente
-- Ejecuta esta consulta para ver los docentes disponibles:
SELECT id, email, first_name, last_name, role_id 
FROM users 
WHERE role_id = 2; -- 2 es el ID del rol 'teacher'

-- 2. Insertar cursos de ejemplo (reemplaza 'TEACHER_ID_AQUI' con el ID real del docente)
INSERT INTO courses (title, code, description, teacher_id, status, created_at, updated_at) VALUES
(
  'Introducción a la Programación con Python',
  'PROG101',
  'Aprende los fundamentos de la programación usando Python. Variables, funciones, estructuras de control y POO.',
  'TEACHER_ID_AQUI', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
),
(
  'Diseño Web Moderno con React',
  'WEB201',
  'Domina React, JavaScript ES6+, CSS Grid y las mejores prácticas de desarrollo web.',
  'TEACHER_ID_AQUI', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
),
(
  'Inteligencia Artificial para Principiantes',
  'AI301',
  'Introducción a IA, machine learning y deep learning con aplicaciones prácticas.',
  'TEACHER_ID_AQUI', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
);

-- 3. Verificar que los cursos se crearon
SELECT id, title, code, status FROM courses ORDER BY created_at DESC LIMIT 5;
