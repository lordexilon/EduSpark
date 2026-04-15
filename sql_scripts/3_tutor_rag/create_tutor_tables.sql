-- Script para crear las tablas necesarias para el Tutor Virtual
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de conversaciones del tutor
CREATE TABLE IF NOT EXISTS tutor_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 2. Tabla de mensajes del tutor
CREATE TABLE IF NOT EXISTS tutor_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de configuraciones pedagógicas del curso
CREATE TABLE IF NOT EXISTS course_pedagogical_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    learning_style VARCHAR(50) DEFAULT 'visual',
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    teaching_approach VARCHAR(50) DEFAULT 'constructivist',
    assessment_method VARCHAR(50) DEFAULT 'formative',
    feedback_frequency VARCHAR(20) DEFAULT 'immediate',
    interaction_style VARCHAR(50) DEFAULT 'collaborative',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id)
);

-- 4. Tabla de escalas de calificación
CREATE TABLE IF NOT EXISTS course_grading_scales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    scale_name VARCHAR(100) NOT NULL,
    scale_type VARCHAR(20) DEFAULT 'percentage',
    min_score DECIMAL(5,2) DEFAULT 0,
    max_score DECIMAL(5,2) DEFAULT 100,
    passing_score DECIMAL(5,2) DEFAULT 60,
    grade_scale JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id)
);

-- 5. Tabla de imágenes del curso
CREATE TABLE IF NOT EXISTS course_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    image_type VARCHAR(50) DEFAULT 'content',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de configuraciones del tutor por estudiante
CREATE TABLE IF NOT EXISTS student_tutor_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    preferred_learning_style VARCHAR(50) DEFAULT 'visual',
    difficulty_preference VARCHAR(20) DEFAULT 'intermediate',
    interaction_preference VARCHAR(50) DEFAULT 'collaborative',
    feedback_preference VARCHAR(20) DEFAULT 'immediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_student_id ON tutor_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_course_id ON tutor_conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_created_at ON tutor_conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_tutor_messages_conversation_id ON tutor_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tutor_messages_created_at ON tutor_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_course_pedagogical_settings_course_id ON course_pedagogical_settings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grading_scales_course_id ON course_grading_scales(course_id);
CREATE INDEX IF NOT EXISTS idx_course_images_course_id ON course_images(course_id);
CREATE INDEX IF NOT EXISTS idx_student_tutor_settings_student_course ON student_tutor_settings(student_id, course_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_pedagogical_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tutor_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para estudiantes
CREATE POLICY "Students can view their own tutor conversations" ON tutor_conversations
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create their own tutor conversations" ON tutor_conversations
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own tutor conversations" ON tutor_conversations
    FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Students can view messages in their conversations" ON tutor_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM tutor_conversations WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Students can create messages in their conversations" ON tutor_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM tutor_conversations WHERE student_id = auth.uid()
        )
    );

-- Políticas para profesores
CREATE POLICY "Teachers can view conversations in their courses" ON tutor_conversations
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view messages in their course conversations" ON tutor_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT tc.id FROM tutor_conversations tc
            JOIN courses c ON tc.course_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

-- Políticas para configuraciones pedagógicas
CREATE POLICY "Teachers can manage pedagogical settings for their courses" ON course_pedagogical_settings
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view pedagogical settings for their courses" ON course_pedagogical_settings
    FOR SELECT USING (
        course_id IN (
            SELECT course_id FROM user_courses WHERE user_id = auth.uid()
        )
    );

-- Políticas para escalas de calificación
CREATE POLICY "Teachers can manage grading scales for their courses" ON course_grading_scales
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view grading scales for their courses" ON course_grading_scales
    FOR SELECT USING (
        course_id IN (
            SELECT course_id FROM user_courses WHERE user_id = auth.uid()
        )
    );

-- Políticas para imágenes del curso
CREATE POLICY "Teachers can manage images for their courses" ON course_images
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view images for their courses" ON course_images
    FOR SELECT USING (
        course_id IN (
            SELECT course_id FROM user_courses WHERE user_id = auth.uid()
        )
    );

-- Políticas para configuraciones del tutor del estudiante
CREATE POLICY "Students can manage their own tutor settings" ON student_tutor_settings
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view student tutor settings for their courses" ON student_tutor_settings
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

-- Insertar datos de ejemplo para configuraciones pedagógicas
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

-- Insertar escalas de calificación por defecto
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

-- Comentarios de las tablas
COMMENT ON TABLE tutor_conversations IS 'Conversaciones entre estudiantes y el tutor virtual';
COMMENT ON TABLE tutor_messages IS 'Mensajes individuales dentro de las conversaciones del tutor';
COMMENT ON TABLE course_pedagogical_settings IS 'Configuraciones pedagógicas específicas por curso';
COMMENT ON TABLE course_grading_scales IS 'Escalas de calificación personalizadas por curso';
COMMENT ON TABLE course_images IS 'Imágenes asociadas a los cursos';
COMMENT ON TABLE student_tutor_settings IS 'Preferencias del tutor personalizadas por estudiante y curso';
