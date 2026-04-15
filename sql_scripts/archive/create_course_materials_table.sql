-- Script para crear la tabla course_materials
-- Necesaria para el servicio RAG A2A
-- Ejecutar en Supabase SQL Editor

-- Crear tabla de materiales del curso
CREATE TABLE IF NOT EXISTS course_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) DEFAULT 'material', -- material, chapter, lesson, exercise, video, document
    difficulty VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_type ON course_materials(type);
CREATE INDEX IF NOT EXISTS idx_course_materials_difficulty ON course_materials(difficulty);
CREATE INDEX IF NOT EXISTS idx_course_materials_active ON course_materials(is_active);

-- Habilitar RLS
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Students can view course materials" ON course_materials;
DROP POLICY IF EXISTS "Teachers can manage course materials" ON course_materials;

-- Crear políticas RLS
CREATE POLICY "Students can view course materials" ON course_materials
    FOR SELECT USING (is_active = true);

CREATE POLICY "Teachers can manage course materials" ON course_materials
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

-- Insertar materiales de ejemplo para el curso de prueba
INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Introducción a ' || c.title as title,
    'Este es el material de introducción para el curso ' || c.title || '. Aquí encontrarás los conceptos básicos y fundamentales que necesitas conocer.' as content,
    'chapter' as type,
    'beginner' as difficulty,
    1 as order_index
FROM courses c
WHERE c.id = 1 -- Asumiendo que el curso de prueba tiene ID 1
ON CONFLICT DO NOTHING;

INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Conceptos Avanzados' as title,
    'En esta sección exploraremos conceptos más avanzados del tema, incluyendo ejemplos prácticos y ejercicios.' as content,
    'lesson' as type,
    'intermediate' as difficulty,
    2 as order_index
FROM courses c
WHERE c.id = 1
ON CONFLICT DO NOTHING;

INSERT INTO course_materials (course_id, title, content, type, difficulty, order_index)
SELECT 
    c.id as course_id,
    'Ejercicios Prácticos' as title,
    'Aquí tienes una serie de ejercicios para practicar lo que has aprendido. Incluye problemas resueltos y ejercicios para resolver.' as content,
    'exercise' as type,
    'advanced' as difficulty,
    3 as order_index
FROM courses c
WHERE c.id = 1
ON CONFLICT DO NOTHING;

-- Verificar que se creó correctamente
SELECT 'course_materials' as tabla, COUNT(*) as registros FROM course_materials;

-- Mostrar estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'course_materials'
ORDER BY ordinal_position;
