-- Script para crear datos de ejemplo en EduSpark
-- Ejecutar en el SQL Editor de Supabase

-- 1. Insertar cursos de ejemplo
-- Nota: Reemplaza 'YOUR_TEACHER_ID' con el ID real de un docente en tu sistema

INSERT INTO courses (title, code, description, teacher_id, status, created_at, updated_at) VALUES
(
  'Introducción a la Programación con Python',
  'PROG101',
  'Aprende los fundamentos de la programación usando Python. Este curso cubre variables, funciones, estructuras de control y programación orientada a objetos.',
  'YOUR_TEACHER_ID', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
),
(
  'Diseño Web Moderno con React',
  'WEB201',
  'Domina las tecnologías web modernas. Aprende React, JavaScript ES6+, CSS Grid, Flexbox y las mejores prácticas de desarrollo web.',
  'YOUR_TEACHER_ID', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
),
(
  'Inteligencia Artificial para Principiantes',
  'AI301',
  'Introducción a los conceptos de IA, machine learning y deep learning. Aprende a implementar algoritmos básicos y entender las aplicaciones prácticas.',
  'YOUR_TEACHER_ID', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
),
(
  'Ética en la Tecnología',
  'ETH101',
  'Explora los dilemas éticos en el desarrollo de tecnología. Analiza casos reales y desarrolla un marco ético para la toma de decisiones tecnológicas.',
  'YOUR_TEACHER_ID', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
),
(
  'Análisis de Datos con Python',
  'DATA201',
  'Aprende a analizar datos usando pandas, NumPy y matplotlib. Desde la limpieza de datos hasta la visualización y estadísticas avanzadas.',
  'YOUR_TEACHER_ID', -- Reemplazar con ID real
  'active',
  NOW(),
  NOW()
);

-- 2. Obtener los IDs de los cursos creados (para usar en las siguientes inserciones)
-- Ejecutar esta consulta después de insertar los cursos para obtener los IDs:
-- SELECT id, title FROM courses ORDER BY created_at DESC LIMIT 5;

-- 3. Insertar unidades para el curso de Python (asumiendo que el curso tiene ID 1)
INSERT INTO course_units (id, course_id, number, title, description, created_at) VALUES
(gen_random_uuid(), 1, 1, 'Fundamentos de Python', 'Introducción al lenguaje Python y su sintaxis básica', NOW()),
(gen_random_uuid(), 1, 2, 'Variables y Tipos de Datos', 'Aprende sobre diferentes tipos de datos en Python', NOW()),
(gen_random_uuid(), 1, 3, 'Estructuras de Control', 'Condicionales, bucles y control de flujo', NOW()),
(gen_random_uuid(), 1, 4, 'Funciones y Módulos', 'Cómo crear y usar funciones, importar módulos', NOW()),
(gen_random_uuid(), 1, 5, 'Programación Orientada a Objetos', 'Clases, objetos, herencia y polimorfismo', NOW());

-- 4. Insertar unidades para el curso de React (asumiendo que el curso tiene ID 2)
INSERT INTO course_units (id, course_id, number, title, description, created_at) VALUES
(gen_random_uuid(), 2, 1, 'Introducción a React', 'Conceptos básicos y configuración del entorno', NOW()),
(gen_random_uuid(), 2, 2, 'Componentes y Props', 'Creación de componentes reutilizables', NOW()),
(gen_random_uuid(), 2, 3, 'Estado y Eventos', 'Manejo del estado local y eventos de usuario', NOW()),
(gen_random_uuid(), 2, 4, 'Hooks de React', 'useState, useEffect y otros hooks importantes', NOW()),
(gen_random_uuid(), 2, 5, 'Routing y Navegación', 'Implementación de rutas con React Router', NOW());

-- 5. Insertar sesiones para el curso de Python
INSERT INTO sessions (id, course_id, title, description, starts_at, ends_at, created_at) VALUES
(gen_random_uuid(), 1, 'Sesión 1: Instalación y Primeros Pasos', 'Configuración del entorno de desarrollo y primer programa en Python', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', NOW()),
(gen_random_uuid(), 1, 'Sesión 2: Variables y Operadores', 'Tipos de datos básicos y operaciones matemáticas', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '2 hours', NOW()),
(gen_random_uuid(), 1, 'Sesión 3: Condicionales y Bucles', 'if/else, for, while y estructuras de control avanzadas', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours', NOW()),
(gen_random_uuid(), 1, 'Sesión 4: Listas y Diccionarios', 'Estructuras de datos fundamentales en Python', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours', NOW()),
(gen_random_uuid(), 1, 'Sesión 5: Proyecto Final', 'Desarrollo de un proyecto práctico aplicando todos los conceptos', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours', NOW());

-- 6. Insertar materiales para el curso de Python
INSERT INTO materials (id, course_id, title, kind, url, mime_type, metadata, created_at) VALUES
(gen_random_uuid(), 1, 'Guía de Instalación de Python', 'markdown', NULL, 'text/markdown', '{"content": "# Guía de Instalación de Python\n\n## Windows\n1. Descarga Python desde python.org\n2. Ejecuta el instalador\n3. Marca la opción "Add Python to PATH"\n\n## macOS\n```bash\nbrew install python3\n```\n\n## Linux\n```bash\nsudo apt update\nsudo apt install python3\n```'}', NOW()),
(gen_random_uuid(), 1, 'Ejercicios de Variables', 'markdown', NULL, 'text/markdown', '{"content": "# Ejercicios de Variables\n\n## Ejercicio 1\nCrea variables para almacenar tu nombre, edad y ciudad.\n\n## Ejercicio 2\nCalcula el área de un círculo usando la variable radio."}', NOW()),
(gen_random_uuid(), 1, 'Video: Introducción a Python', 'video', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 'video/mp4', '{"duration": "15:30", "description": "Video introductorio sobre Python"}', NOW()),
(gen_random_uuid(), 1, 'Documentación de Python', 'link', 'https://docs.python.org/3/', 'text/html', '{"description": "Documentación oficial de Python 3"}', NOW());

-- 7. Insertar tareas de ejemplo
INSERT INTO assignments (id, course_id, title, description, max_points, due_at, created_at) VALUES
(gen_random_uuid(), 1, 'Ejercicios de Variables', 'Completa los ejercicios de variables y tipos de datos', 100, NOW() + INTERVAL '7 days', NOW()),
(gen_random_uuid(), 1, 'Proyecto: Calculadora Simple', 'Crea una calculadora básica usando Python', 150, NOW() + INTERVAL '14 days', NOW()),
(gen_random_uuid(), 1, 'Examen: Fundamentos de Python', 'Examen teórico y práctico sobre los conceptos básicos', 200, NOW() + INTERVAL '21 days', NOW()),
(gen_random_uuid(), 2, 'Componente de Tarjeta', 'Crea un componente de tarjeta reutilizable en React', 100, NOW() + INTERVAL '10 days', NOW()),
(gen_random_uuid(), 2, 'Aplicación Todo List', 'Desarrolla una aplicación de lista de tareas con React', 200, NOW() + INTERVAL '21 days', NOW());

-- 8. Verificar los datos insertados
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
GROUP BY c.id, c.title, c.code, c.status
ORDER BY c.created_at DESC;
