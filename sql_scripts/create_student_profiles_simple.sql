-- Script simple para crear solo la tabla student_learning_profiles
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

-- Verificar que se creó correctamente
SELECT 'student_learning_profiles' as tabla, COUNT(*) as registros FROM student_learning_profiles;

-- Mostrar estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_learning_profiles'
ORDER BY ordinal_position;
