-- Script simple para crear un curso de ejemplo
-- Ejecutar en Supabase SQL Editor

-- Verificar si hay cursos existentes
SELECT COUNT(*) as total_courses FROM courses;

-- Crear un curso de ejemplo si no existe ninguno
INSERT INTO courses (title, description, teacher_id, status)
SELECT 
    'Matemáticas Básicas' as title,
    'Curso introductorio de matemáticas para estudiantes de primaria' as description,
    (SELECT id FROM users WHERE role_id = 2 LIMIT 1) as teacher_id,
    'active' as status
WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 1);

-- Verificar el curso creado
SELECT id, title, teacher_id, status FROM courses ORDER BY created_at DESC LIMIT 5;

-- Crear configuración pedagógica para el curso
INSERT INTO course_pedagogical_settings (course_id, learning_style, difficulty_level, teaching_approach, assessment_method, feedback_frequency, interaction_style)
SELECT 
    id as course_id,
    'visual' as learning_style,
    'intermediate' as difficulty_level,
    'constructivist' as teaching_approach,
    'formative' as assessment_method,
    'immediate' as feedback_frequency,
    'collaborative' as interaction_style
FROM courses
WHERE id NOT IN (SELECT course_id FROM course_pedagogical_settings);

-- Crear escala de calificación para el curso
INSERT INTO course_grading_scales (course_id, scale_name, scale_type, min_score, max_score, passing_score, grade_scale)
SELECT 
    id as course_id,
    'Escala Estándar' as scale_name,
    'percentage' as scale_type,
    0 as min_score,
    100 as max_score,
    60 as passing_score,
    '{"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}'::jsonb as grade_scale
FROM courses
WHERE id NOT IN (SELECT course_id FROM course_grading_scales);

-- Verificar que todo se creó correctamente
SELECT 'courses' as tabla, COUNT(*) as registros FROM courses
UNION ALL
SELECT 'course_pedagogical_settings' as tabla, COUNT(*) as registros FROM course_pedagogical_settings
UNION ALL
SELECT 'course_grading_scales' as tabla, COUNT(*) as registros FROM course_grading_scales;
