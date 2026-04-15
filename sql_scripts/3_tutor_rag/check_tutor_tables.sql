-- Script para verificar si las tablas del Tutor Virtual existen
-- Ejecutar en Supabase SQL Editor

-- Verificar si las tablas existen
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN 'EXISTE'
        ELSE 'NO EXISTE'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'tutor_conversations',
    'tutor_messages', 
    'course_pedagogical_settings',
    'course_grading_scales',
    'course_images'
);

-- Verificar si la tabla courses existe y su estructura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'courses'
ORDER BY ordinal_position;

-- Verificar si hay datos en courses
SELECT COUNT(*) as total_courses FROM courses;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'tutor_conversations',
    'tutor_messages', 
    'course_pedagogical_settings',
    'course_grading_scales',
    'course_images'
);
