-- =====================================================
-- Script 05: Tablas del Tutor Virtual Multi-Agente
-- Sistema de personalización pedagógica por curso-docente-estudiante
-- =====================================================

-- Conversaciones del tutor virtual
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Mensajes del chat (memoria a largo plazo)
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Configuración pedagógica por curso-docente
CREATE TABLE course_pedagogical_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teaching_style TEXT, -- 'socratico', 'directo', 'colaborativo', 'constructivista'
    tone_preference TEXT DEFAULT 'amigable', -- 'amigable', 'formal', 'motivador'
    detail_level TEXT DEFAULT 'medio', -- 'basico', 'medio', 'avanzado'
    use_examples BOOLEAN DEFAULT true,
    encourage_questions BOOLEAN DEFAULT true,
    voice_name TEXT DEFAULT 'Kore', -- 'Kore', 'Charon', 'Fenrir', 'Aoede', 'Puck'
    voice_speed NUMERIC DEFAULT 1.0, -- 0.5 a 2.0
    system_prompt_override TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id)
);

-- Sistema de calificaciones personalizado por curso
CREATE TABLE course_grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Escala de Calificación',
    scale JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{"grade":"A+","minScore":95,"maxScore":100,"description":"Excelente"}]
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id)
);

-- Perfil de aprendizaje del estudiante
CREATE TABLE student_learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    preferred_learning_style TEXT DEFAULT 'visual', -- 'visual', 'auditory', 'kinesthetic', 'reading'
    difficulty_level TEXT DEFAULT 'medio', -- 'basico', 'medio', 'avanzado'
    preferred_examples TEXT DEFAULT 'practicos', -- 'practicos', 'teoricos', 'visuales', 'auditivos'
    topics_struggled JSONB DEFAULT '[]'::jsonb,
    topics_mastered JSONB DEFAULT '[]'::jsonb,
    interaction_count INTEGER DEFAULT 0,
    avg_session_duration INTERVAL,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Actualizar tabla de materiales para soportar imágenes
-- (Nota: materials ya existe según docente_modulo.md, solo agregamos columnas)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb; -- Array de URLs de imágenes

-- Actualizar tabla de cursos para soportar imagen de portada
ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Tabla para gestión de imágenes del sistema
CREATE TABLE course_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    image_url TEXT NOT NULL,
    image_type TEXT, -- 'cover', 'banner', 'material', 'content'
    file_size_bytes BIGINT,
    mime_type TEXT,
    alt_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para materiales del curso (si no existe)
CREATE TABLE IF NOT EXISTS course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text', -- 'text', 'pdf', 'video', 'audio', 'image'
    file_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para métricas de uso del tutor virtual
CREATE TABLE tutor_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- 'response_time', 'satisfaction', 'completion_rate'
    metric_value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para configuraciones del sistema multi-agente
CREATE TABLE agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL, -- 'voice', 'rag', 'context', 'coordinator'
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, agent_type)
);

-- Índices para optimización
CREATE INDEX idx_tutor_conversations_student ON tutor_conversations(student_id);
CREATE INDEX idx_tutor_conversations_course ON tutor_conversations(course_id);
CREATE INDEX idx_tutor_conversations_activity ON tutor_conversations(last_activity_at);
CREATE INDEX idx_tutor_messages_conversation ON tutor_messages(conversation_id);
CREATE INDEX idx_tutor_messages_created ON tutor_messages(created_at);
CREATE INDEX idx_tutor_messages_role ON tutor_messages(role);
CREATE INDEX idx_student_profiles_lookup ON student_learning_profiles(student_id, course_id);
CREATE INDEX idx_student_profiles_style ON student_learning_profiles(preferred_learning_style);
CREATE INDEX idx_course_images_course ON course_images(course_id);
CREATE INDEX idx_course_images_type ON course_images(image_type);
CREATE INDEX idx_course_grading_scales_course ON course_grading_scales(course_id);
CREATE INDEX idx_course_materials_course ON course_materials(course_id);
CREATE INDEX idx_course_materials_type ON course_materials(type);
CREATE INDEX idx_tutor_metrics_conversation ON tutor_usage_metrics(conversation_id);
CREATE INDEX idx_tutor_metrics_student ON tutor_usage_metrics(student_id);
CREATE INDEX idx_tutor_metrics_course ON tutor_usage_metrics(course_id);
CREATE INDEX idx_tutor_metrics_type ON tutor_usage_metrics(metric_type);
CREATE INDEX idx_agent_configs_course ON agent_configurations(course_id);
CREATE INDEX idx_agent_configs_type ON agent_configurations(agent_type);
CREATE INDEX idx_agent_configs_active ON agent_configurations(is_active);

-- Comentarios para documentación
COMMENT ON TABLE tutor_conversations IS 'Conversaciones del tutor virtual por estudiante y curso';
COMMENT ON TABLE tutor_messages IS 'Mensajes individuales de las conversaciones del tutor';
COMMENT ON TABLE course_pedagogical_settings IS 'Configuración pedagógica personalizada por curso y docente';
COMMENT ON TABLE course_grading_scales IS 'Escalas de calificación personalizadas por curso';
COMMENT ON TABLE student_learning_profiles IS 'Perfiles de aprendizaje de estudiantes por curso';
COMMENT ON TABLE course_images IS 'Gestión de imágenes para cursos y materiales';
COMMENT ON TABLE course_materials IS 'Materiales de contenido para cursos';
COMMENT ON TABLE tutor_usage_metrics IS 'Métricas de uso y rendimiento del tutor virtual';
COMMENT ON TABLE agent_configurations IS 'Configuraciones específicas para cada agente del sistema multi-agente';
