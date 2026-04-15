-- Script para agregar contenido a los cursos existentes
-- Ejecutar después de crear los cursos básicos

-- Insertar unidades para el curso de Python
INSERT INTO course_units (id, course_id, number, title, description, created_at)
SELECT 
    gen_random_uuid(),
    c.id,
    unit_data.number,
    unit_data.title,
    unit_data.description,
    NOW()
FROM courses c
CROSS JOIN (VALUES
    (1, 'Introducción a Python', 'Configuración del entorno y primer programa'),
    (2, 'Variables y Tipos', 'Tipos de datos básicos en Python'),
    (3, 'Estructuras de Control', 'if/else, for, while'),
    (4, 'Funciones', 'Crear y usar funciones'),
    (5, 'POO Básica', 'Clases y objetos')
) AS unit_data(number, title, description)
WHERE c.code = 'PYTHON101'
AND c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM course_units cu 
    WHERE cu.course_id = c.id AND cu.number = unit_data.number
);

-- Insertar unidades para el curso de React
INSERT INTO course_units (id, course_id, number, title, description, created_at)
SELECT 
    gen_random_uuid(),
    c.id,
    unit_data.number,
    unit_data.title,
    unit_data.description,
    NOW()
FROM courses c
CROSS JOIN (VALUES
    (1, 'Introducción a React', 'Conceptos básicos y JSX'),
    (2, 'Componentes', 'Creación de componentes'),
    (3, 'Estado y Props', 'Manejo del estado'),
    (4, 'Hooks', 'useState, useEffect'),
    (5, 'Routing', 'React Router')
) AS unit_data(number, title, description)
WHERE c.code = 'REACT201'
AND c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM course_units cu 
    WHERE cu.course_id = c.id AND cu.number = unit_data.number
);

-- Insertar unidades para el curso de ML
INSERT INTO course_units (id, course_id, number, title, description, created_at)
SELECT 
    gen_random_uuid(),
    c.id,
    unit_data.number,
    unit_data.title,
    unit_data.description,
    NOW()
FROM courses c
CROSS JOIN (VALUES
    (1, 'Introducción a ML', 'Conceptos básicos'),
    (2, 'Preparación de Datos', 'Limpieza y preprocesamiento'),
    (3, 'Algoritmos Supervisados', 'Regresión y clasificación'),
    (4, 'Algoritmos No Supervisados', 'Clustering'),
    (5, 'Evaluación de Modelos', 'Métricas y validación')
) AS unit_data(number, title, description)
WHERE c.code = 'ML301'
AND c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM course_units cu 
    WHERE cu.course_id = c.id AND cu.number = unit_data.number
);

-- Insertar sesiones para Python
INSERT INTO sessions (id, course_id, title, description, starts_at, ends_at, created_at)
SELECT 
    gen_random_uuid(),
    c.id,
    session_data.title,
    session_data.description,
    session_data.starts_at,
    session_data.ends_at,
    NOW()
FROM courses c
CROSS JOIN (VALUES
    ('Sesión 1: Primeros Pasos', 'Instalación y Hello World', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours'),
    ('Sesión 2: Variables', 'Tipos de datos y operadores', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '2 hours'),
    ('Sesión 3: Condicionales', 'if/else y operadores lógicos', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours')
) AS session_data(title, description, starts_at, ends_at)
WHERE c.code = 'PYTHON101'
AND c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.course_id = c.id AND s.title = session_data.title
);

-- Insertar materiales de ejemplo
INSERT INTO materials (id, course_id, title, kind, url, mime_type, metadata, created_at)
SELECT 
    gen_random_uuid(),
    c.id,
    material_data.title,
    material_data.kind,
    material_data.url,
    material_data.mime_type,
    material_data.metadata::jsonb,
    NOW()
FROM courses c
CROSS JOIN (VALUES
    ('Guía de Instalación', 'markdown', NULL, 'text/markdown', '{"content": "# Instalación de Python\n\n## Windows\n1. Descarga desde python.org\n2. Instala con PATH habilitado\n\n## macOS\n```bash\nbrew install python3\n```\n\n## Linux\n```bash\nsudo apt install python3\n```"}'),
    ('Video: Introducción', 'video', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 'video/mp4', '{"duration": "15:30"}'),
    ('Documentación React', 'link', 'https://react.dev/', 'text/html', '{"description": "Documentación oficial de React"}')
) AS material_data(title, kind, url, mime_type, metadata)
WHERE (c.code = 'PYTHON101' AND material_data.title IN ('Guía de Instalación', 'Video: Introducción'))
   OR (c.code = 'REACT201' AND material_data.title = 'Documentación React')
AND c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM materials m 
    WHERE m.course_id = c.id AND m.title = material_data.title
);

-- Insertar tareas de ejemplo
INSERT INTO assignments (id, course_id, title, description, max_points, due_at, created_at)
SELECT 
    gen_random_uuid(),
    c.id,
    assignment_data.title,
    assignment_data.description,
    assignment_data.max_points,
    assignment_data.due_at,
    NOW()
FROM courses c
CROSS JOIN (VALUES
    ('Ejercicios de Variables', 'Practica con variables y tipos de datos', 100, NOW() + INTERVAL '7 days'),
    ('Calculadora Simple', 'Crea una calculadora básica en Python', 150, NOW() + INTERVAL '14 days'),
    ('Componente Card', 'Crea un componente de tarjeta reutilizable', 100, NOW() + INTERVAL '10 days'),
    ('Análisis Exploratorio', 'Analiza un dataset con pandas', 200, NOW() + INTERVAL '21 days')
) AS assignment_data(title, description, max_points, due_at)
WHERE (c.code = 'PYTHON101' AND assignment_data.title IN ('Ejercicios de Variables', 'Calculadora Simple'))
   OR (c.code = 'REACT201' AND assignment_data.title = 'Componente Card')
   OR (c.code = 'ML301' AND assignment_data.title = 'Análisis Exploratorio')
AND c.teacher_id = (SELECT id FROM users WHERE email = 'demo.teacher@eduspark.com' LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM assignments a 
    WHERE a.course_id = c.id AND a.title = assignment_data.title
);

-- Verificar el contenido creado
SELECT 
    c.title as curso,
    c.code,
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
GROUP BY c.id, c.title, c.code
ORDER BY c.created_at DESC;
