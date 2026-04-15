-- Script esencial para el Tutor Virtual
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de conversaciones del tutor (ESENCIAL)
CREATE TABLE IF NOT EXISTS tutor_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 2. Tabla de mensajes del tutor (ESENCIAL)
CREATE TABLE IF NOT EXISTS tutor_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de configuraciones pedagógicas (ESENCIAL)
CREATE TABLE IF NOT EXISTS course_pedagogical_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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

-- 4. Tabla de escalas de calificación (ESENCIAL)
CREATE TABLE IF NOT EXISTS course_grading_scales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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

-- 5. Tabla de imágenes del curso (ESENCIAL)
CREATE TABLE IF NOT EXISTS course_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    image_type VARCHAR(50) DEFAULT 'content',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_student_id ON tutor_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_course_id ON tutor_conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_messages_conversation_id ON tutor_messages(conversation_id);

-- RLS básico
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_pedagogical_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_images ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para estudiantes
CREATE POLICY "Students can manage their tutor conversations" ON tutor_conversations
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Students can manage their tutor messages" ON tutor_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM tutor_conversations WHERE student_id = auth.uid()
        )
    );

-- Políticas básicas para profesores
CREATE POLICY "Teachers can view course conversations" ON tutor_conversations
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view course messages" ON tutor_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT tc.id FROM tutor_conversations tc
            JOIN courses c ON tc.course_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

-- Políticas para configuraciones
CREATE POLICY "Teachers can manage course settings" ON course_pedagogical_settings
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

-- Política simplificada: Los estudiantes pueden ver configuraciones de cualquier curso
-- (ya que las configuraciones son públicas para los cursos)
CREATE POLICY "Students can view course settings" ON course_pedagogical_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para escalas de calificación
CREATE POLICY "Teachers can manage grading scales" ON course_grading_scales
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view grading scales" ON course_grading_scales
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para imágenes del curso
CREATE POLICY "Teachers can manage course images" ON course_images
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view course images" ON course_images
    FOR SELECT USING (auth.role() = 'authenticated');

-- Datos por defecto
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
