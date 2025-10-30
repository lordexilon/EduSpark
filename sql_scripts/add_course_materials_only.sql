-- Script simple para agregar solo materiales del curso
-- Sin recrear políticas RLS
-- Ejecutar en Supabase SQL Editor

-- Insertar materiales de ejemplo para todos los cursos existentes
INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Introducción a ' || c.title as title,
    'Este es el material de introducción para el curso ' || c.title || '. Aquí encontrarás los conceptos básicos y fundamentales que necesitas conocer.' as content,
    'chapter' as type,
    'beginner' as difficulty,
    1 as order_index
FROM courses c
WHERE NOT EXISTS (
    SELECT 1 FROM course_materials cm 
    WHERE cm.course_id = c.id AND cm.title = 'Introducción a ' || c.title
);

INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Conceptos Avanzados' as title,
    'En esta sección exploraremos conceptos más avanzados del tema, incluyendo ejemplos prácticos y ejercicios.' as content,
    'lesson' as type,
    'intermediate' as difficulty,
    2 as order_index
FROM courses c
WHERE NOT EXISTS (
    SELECT 1 FROM course_materials cm 
    WHERE cm.course_id = c.id AND cm.title = 'Conceptos Avanzados'
);

INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Ejercicios Prácticos' as title,
    'Aquí tienes una serie de ejercicios para practicar lo que has aprendido. Incluye problemas resueltos y ejercicios para resolver.' as content,
    'exercise' as type,
    'advanced' as difficulty,
    3 as order_index
FROM courses c
WHERE NOT EXISTS (
    SELECT 1 FROM course_materials cm 
    WHERE cm.course_id = c.id AND cm.title = 'Ejercicios Prácticos'
);

-- Verificar que se agregaron correctamente
SELECT 'course_materials' as tabla, COUNT(*) as registros FROM course_materials;

-- Mostrar materiales por curso
SELECT 
    c.title as curso,
    cm.title as material,
    cm.type as tipo,
    cm.difficulty as dificultad
FROM course_materials cm
JOIN courses c ON c.id = cm.course_id
ORDER BY c.title, cm.order_index;
