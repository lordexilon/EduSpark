-- Script simple para crear datos de ejemplo
-- Ejecutar paso a paso en el SQL Editor de Supabase

-- Paso 1: Crear docente de ejemplo
INSERT INTO users (id, email, first_name, last_name, role_id)
VALUES (
    gen_random_uuid(),
    'demo.teacher@eduspark.com',
    'Profesor',
    'Demo',
    2
)
ON CONFLICT (email) DO NOTHING;

-- Paso 2: Insertar cursos de ejemplo
INSERT INTO courses (title, code, description, teacher_id, status, created_at, updated_at)
SELECT 
    title,
    code,
    description,
    (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1) as teacher_id,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM (VALUES
    ('Python para Principiantes', 'PYTHON101', 'Aprende Python desde cero. Variables, funciones, bucles y programación orientada a objetos.'),
    ('React y JavaScript Moderno', 'REACT201', 'Desarrollo web moderno con React, hooks, context API y las mejores prácticas.'),
    ('Machine Learning Básico', 'ML301', 'Introducción al machine learning con Python, scikit-learn y casos de uso reales.')
) AS courses_data(title, code, description)
WHERE NOT EXISTS (
    SELECT 1 FROM courses 
    WHERE code = courses_data.code 
    AND teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
);

-- Paso 3: Verificar que se crearon los cursos
SELECT 
    c.id,
    c.title,
    c.code,
    c.status,
    u.first_name || ' ' || u.last_name as profesor
FROM courses c
JOIN users u ON c.teacher_id = u.id
WHERE u.email = 'demo.teacher@eduspark.com'
ORDER BY c.created_at DESC;
