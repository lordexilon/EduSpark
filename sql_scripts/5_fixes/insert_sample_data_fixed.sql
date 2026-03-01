-- Script corregido para insertar datos de ejemplo
-- Ejecutar todo de una vez en el SQL Editor de Supabase

DO $$
DECLARE
    teacher_id_var uuid;
    course1_id integer;
    course2_id integer;
    course3_id integer;
BEGIN
    -- Crear docente de ejemplo (solo si no existe)
    INSERT INTO users (id, email, first_name, last_name, role_id)
    VALUES (
        gen_random_uuid(),
        'demo.teacher@eduspark.com',
        'Profesor',
        'Demo',
        2
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Obtener el ID del docente
    SELECT id INTO teacher_id_var 
    FROM users 
    WHERE email = 'demo.teacher@eduspark.com' 
    LIMIT 1;
    
    -- Verificar que se obtuvo el ID del docente
    IF teacher_id_var IS NULL THEN
        RAISE EXCEPTION 'No se pudo obtener el ID del docente';
    END IF;
    
    -- Insertar cursos (solo si no existen)
    INSERT INTO courses (title, code, description, teacher_id, status, created_at, updated_at) 
    SELECT * FROM (VALUES
        ('Python para Principiantes', 'PYTHON101', 'Aprende Python desde cero. Variables, funciones, bucles y programación orientada a objetos.', teacher_id_var, 'active', NOW(), NOW()),
        ('React y JavaScript Moderno', 'REACT201', 'Desarrollo web moderno con React, hooks, context API y las mejores prácticas.', teacher_id_var, 'active', NOW(), NOW()),
        ('Machine Learning Básico', 'ML301', 'Introducción al machine learning con Python, scikit-learn y casos de uso reales.', teacher_id_var, 'active', NOW(), NOW())
    ) AS v(title, code, description, teacher_id, status, created_at, updated_at)
    WHERE NOT EXISTS (SELECT 1 FROM courses WHERE code = v.code AND teacher_id = teacher_id_var);
    
    -- Obtener IDs de los cursos
    SELECT id INTO course1_id FROM courses WHERE code = 'PYTHON101' AND teacher_id = teacher_id_var LIMIT 1;
    SELECT id INTO course2_id FROM courses WHERE code = 'REACT201' AND teacher_id = teacher_id_var LIMIT 1;
    SELECT id INTO course3_id FROM courses WHERE code = 'ML301' AND teacher_id = teacher_id_var LIMIT 1;
    
    -- Verificar que se obtuvieron los IDs de los cursos
    IF course1_id IS NULL OR course2_id IS NULL OR course3_id IS NULL THEN
        RAISE EXCEPTION 'No se pudieron obtener los IDs de los cursos';
    END IF;
    
    -- Insertar unidades para Python (solo si no existen)
    INSERT INTO course_units (id, course_id, number, title, description, created_at) 
    SELECT gen_random_uuid(), course1_id, number, title, description, NOW()
    FROM (VALUES
        (1, 'Introducción a Python', 'Configuración del entorno y primer programa'),
        (2, 'Variables y Tipos', 'Tipos de datos básicos en Python'),
        (3, 'Estructuras de Control', 'if/else, for, while'),
        (4, 'Funciones', 'Crear y usar funciones'),
        (5, 'POO Básica', 'Clases y objetos')
    ) AS v(number, title, description)
    WHERE NOT EXISTS (SELECT 1 FROM course_units WHERE course_id = course1_id AND number = v.number);
    
    -- Insertar unidades para React (solo si no existen)
    INSERT INTO course_units (id, course_id, number, title, description, created_at) 
    SELECT gen_random_uuid(), course2_id, number, title, description, NOW()
    FROM (VALUES
        (1, 'Introducción a React', 'Conceptos básicos y JSX'),
        (2, 'Componentes', 'Creación de componentes'),
        (3, 'Estado y Props', 'Manejo del estado'),
        (4, 'Hooks', 'useState, useEffect'),
        (5, 'Routing', 'React Router')
    ) AS v(number, title, description)
    WHERE NOT EXISTS (SELECT 1 FROM course_units WHERE course_id = course2_id AND number = v.number);
    
    -- Insertar unidades para ML (solo si no existen)
    INSERT INTO course_units (id, course_id, number, title, description, created_at) 
    SELECT gen_random_uuid(), course3_id, number, title, description, NOW()
    FROM (VALUES
        (1, 'Introducción a ML', 'Conceptos básicos'),
        (2, 'Preparación de Datos', 'Limpieza y preprocesamiento'),
        (3, 'Algoritmos Supervisados', 'Regresión y clasificación'),
        (4, 'Algoritmos No Supervisados', 'Clustering'),
        (5, 'Evaluación de Modelos', 'Métricas y validación')
    ) AS v(number, title, description)
    WHERE NOT EXISTS (SELECT 1 FROM course_units WHERE course_id = course3_id AND number = v.number);
    
    -- Insertar sesiones para Python (solo si no existen)
    INSERT INTO sessions (id, course_id, title, description, starts_at, ends_at, created_at) 
    SELECT gen_random_uuid(), course1_id, title, description, starts_at, ends_at, NOW()
    FROM (VALUES
        ('Sesión 1: Primeros Pasos', 'Instalación y Hello World', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours'),
        ('Sesión 2: Variables', 'Tipos de datos y operadores', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '2 hours'),
        ('Sesión 3: Condicionales', 'if/else y operadores lógicos', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours')
    ) AS v(title, description, starts_at, ends_at)
    WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE course_id = course1_id AND title = v.title);
    
    -- Insertar materiales de ejemplo (solo si no existen)
    INSERT INTO materials (id, course_id, title, kind, url, mime_type, metadata, created_at) 
    SELECT gen_random_uuid(), course_id, title, kind, url, mime_type, metadata::jsonb, NOW()
    FROM (VALUES
        (course1_id, 'Guía de Instalación', 'markdown', NULL, 'text/markdown', '{"content": "# Instalación de Python\n\n## Windows\n1. Descarga desde python.org\n2. Instala con PATH habilitado\n\n## macOS\n```bash\nbrew install python3\n```\n\n## Linux\n```bash\nsudo apt install python3\n```"}'),
        (course1_id, 'Video: Introducción', 'video', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 'video/mp4', '{"duration": "15:30"}'),
        (course2_id, 'Documentación React', 'link', 'https://react.dev/', 'text/html', '{"description": "Documentación oficial de React"}')
    ) AS v(course_id, title, kind, url, mime_type, metadata)
    WHERE NOT EXISTS (SELECT 1 FROM materials WHERE course_id = v.course_id AND title = v.title);
    
    -- Insertar tareas de ejemplo (solo si no existen)
    INSERT INTO assignments (id, course_id, title, description, max_points, due_at, created_at) 
    SELECT gen_random_uuid(), course_id, title, description, max_points, due_at, NOW()
    FROM (VALUES
        (course1_id, 'Ejercicios de Variables', 'Practica con variables y tipos de datos', 100, NOW() + INTERVAL '7 days'),
        (course1_id, 'Calculadora Simple', 'Crea una calculadora básica en Python', 150, NOW() + INTERVAL '14 days'),
        (course2_id, 'Componente Card', 'Crea un componente de tarjeta reutilizable', 100, NOW() + INTERVAL '10 days'),
        (course3_id, 'Análisis Exploratorio', 'Analiza un dataset con pandas', 200, NOW() + INTERVAL '21 days')
    ) AS v(course_id, title, description, max_points, due_at)
    WHERE NOT EXISTS (SELECT 1 FROM assignments WHERE course_id = v.course_id AND title = v.title);
    
    RAISE NOTICE 'Datos de ejemplo insertados correctamente!';
    RAISE NOTICE 'Docente ID: %', teacher_id_var;
    RAISE NOTICE 'Curso Python ID: %', course1_id;
    RAISE NOTICE 'Curso React ID: %', course2_id;
    RAISE NOTICE 'Curso ML ID: %', course3_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al insertar datos de ejemplo: %', SQLERRM;
END $$;

-- Verificar los datos insertados
SELECT 
    c.title as curso,
    c.code,
    c.status,
    COUNT(DISTINCT cu.id) as unidades,
    COUNT(DISTINCT s.id) as sesiones,
    COUNT(DISTINCT m.id) as materiales,
    COUNT(DISTINCT a.id) as tareas
FROM courses c
LEFT JOIN course_units cu ON c.id = cu.course_id
LEFT JOIN sessions s ON c.id = s.course_id
LEFT JOIN materials m ON c.id = m.course_id
LEFT JOIN assignments a ON c.id = a.course_id
WHERE c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
GROUP BY c.id, c.title, c.code, c.status
ORDER BY c.created_at DESC;
