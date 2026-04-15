-- Script para crear la tabla student_learning_profiles
-- Ejecutar en Supabase SQL Editor

-- Crear tabla de perfiles de aprendizaje de estudiantes
CREATE TABLE IF NOT EXISTS student_learning_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    preferred_learning_style VARCHAR(50) DEFAULT 'visual',
    difficulty_preference VARCHAR(20) DEFAULT 'intermediate',
    interaction_preference VARCHAR(50) DEFAULT 'collaborative',
    feedback_preference VARCHAR(20) DEFAULT 'immediate',
    topics_struggled TEXT[] DEFAULT '{}',
    topics_mastered TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON student_learning_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_course_id ON student_learning_profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_course ON student_learning_profiles(student_id, course_id);

-- Habilitar RLS
ALTER TABLE student_learning_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Students can manage their own profiles" ON student_learning_profiles
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view student profiles for their courses" ON student_learning_profiles
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

-- Crear perfiles de ejemplo para usuarios existentes
-- Solo crear perfiles si hay usuarios y cursos disponibles
DO $$
DECLARE
    user_count INTEGER;
    course_count INTEGER;
BEGIN
    -- Verificar si hay usuarios y cursos
    SELECT COUNT(*) INTO user_count FROM users WHERE role_id = 3; -- estudiantes
    SELECT COUNT(*) INTO course_count FROM courses;
    
    IF user_count > 0 AND course_count > 0 THEN
        -- Crear perfiles para el primer estudiante y todos los cursos
        INSERT INTO student_learning_profiles (student_id, course_id, preferred_learning_style, difficulty_preference, interaction_preference, feedback_preference)
        SELECT 
            u.id as student_id,
            c.id as course_id,
            'visual' as preferred_learning_style,
            'intermediate' as difficulty_preference,
            'collaborative' as interaction_preference,
            'immediate' as feedback_preference
        FROM users u
        CROSS JOIN courses c
        WHERE u.role_id = 3 -- solo estudiantes
        AND NOT EXISTS (
            SELECT 1 FROM student_learning_profiles slp 
            WHERE slp.student_id = u.id AND slp.course_id = c.id
        )
        LIMIT 5; -- limitar a 5 perfiles para evitar demasiados registros
        
        RAISE NOTICE 'Perfiles de estudiantes creados exitosamente';
    ELSE
        RAISE NOTICE 'No hay usuarios estudiantes o cursos disponibles para crear perfiles';
    END IF;
END $$;

-- Verificar que se creó correctamente
SELECT 'student_learning_profiles' as tabla, COUNT(*) as registros FROM student_learning_profiles;
