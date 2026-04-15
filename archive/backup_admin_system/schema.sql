-- =====================================================
-- Esquema de Base de Datos - Sistema Educativo EduSpark
-- =====================================================

-- Extensión para vectores (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TABLAS DE USUARIOS Y ROLES
-- =====================================================

-- Tabla de roles del sistema
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles por defecto
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Administrador del sistema', '{"all": true}'),
('teacher', 'Docente', '{"courses": true, "students": true, "content": true}'),
('student', 'Estudiante', '{"enroll": true, "learn": true}');

-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de instituciones educativas
CREATE TABLE institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    contact_email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios por institución
CREATE TABLE user_institutions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    position VARCHAR(100), -- cargo o posición
    is_primary BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, institution_id)
);

-- =====================================================
-- TABLAS DE CURSOS
-- =====================================================

-- Tabla de categorías de cursos
CREATE TABLE course_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- código hex del color
    icon VARCHAR(50), -- nombre del icono
    parent_id INTEGER REFERENCES course_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cursos
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    category_id INTEGER REFERENCES course_categories(id),
    instructor_id UUID REFERENCES users(id),
    institution_id INTEGER REFERENCES institutions(id),
    thumbnail_url TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    estimated_duration INTEGER, -- en horas
    language VARCHAR(10) DEFAULT 'es',
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_public BOOLEAN DEFAULT false,
    enrollment_type VARCHAR(20) DEFAULT 'open', -- open, restricted, private
    max_students INTEGER,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de objetivos de aprendizaje
CREATE TABLE learning_objectives (
    id SERIAL PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de unidades/lecciones
CREATE TABLE course_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de contenido de unidades
CREATE TABLE unit_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- text, video, pdf, quiz, assignment
    content_data JSONB, -- datos específicos del tipo de contenido
    order_index INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de archivos del sistema
CREATE TABLE system_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL, -- nombre único en el servidor
    file_path TEXT NOT NULL, -- ruta completa del archivo
    file_size BIGINT NOT NULL, -- tamaño en bytes
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(10),
    file_hash VARCHAR(64), -- hash SHA-256 para deduplicación
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    content_id UUID REFERENCES unit_content(id) ON DELETE SET NULL,
    file_category VARCHAR(50) DEFAULT 'general', -- document, image, video, audio, archive
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- metadatos específicos del archivo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de versiones de archivos
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES system_files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    change_description TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, version_number)
);

-- Tabla de procesamiento de archivos
CREATE TABLE file_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES system_files(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL, -- thumbnail, compression, transcription, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    input_path TEXT,
    output_path TEXT,
    processing_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE ENROLLMENT Y PROGRESO
-- =====================================================

-- Tabla de inscripciones
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, dropped, suspended
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_accessed TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Tabla de progreso por unidad
CREATE TABLE unit_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_spent INTEGER DEFAULT 0, -- en minutos
    last_accessed TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(enrollment_id, unit_id)
);

-- =====================================================
-- TABLAS DE CONTENIDO VECTORIAL (RAG)
-- =====================================================

-- Tabla de chunks de contenido para RAG
CREATE TABLE course_content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
    content_id UUID REFERENCES unit_content(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- embedding de 768 dimensiones
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda vectorial
CREATE INDEX ON course_content_chunks USING ivfflat (embedding vector_cosine_ops);

-- =====================================================
-- TABLAS DE INTERACCIONES CON TUTOR IA
-- =====================================================

-- Tabla de conversaciones con tutor
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id VARCHAR(100), -- ID de sesión de chat
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Tabla de mensajes del tutor
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- student, tutor
    message TEXT NOT NULL,
    intent VARCHAR(50), -- pregunta_contenido, saludo, motivacion, etc.
    tone VARCHAR(50), -- curioso, confundido, frustrado, etc.
    context_used JSONB, -- contexto RAG utilizado
    response_time INTEGER, -- tiempo de respuesta en ms
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE EVALUACIONES
-- =====================================================

-- Tabla de evaluaciones
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type VARCHAR(50) NOT NULL, -- quiz, assignment, project, exam
    instructions TEXT,
    time_limit INTEGER, -- en minutos
    max_attempts INTEGER DEFAULT 1,
    passing_score DECIMAL(5,2) DEFAULT 70.0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de preguntas
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, essay, etc.
    options JSONB, -- opciones para preguntas de opción múltiple
    correct_answer JSONB, -- respuesta correcta
    points DECIMAL(5,2) DEFAULT 1.0,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de respuestas de estudiantes
CREATE TABLE student_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    response_data JSONB NOT NULL,
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLAS DE ANALYTICS Y SEGUIMIENTO
-- =====================================================

-- Tabla de eventos de analytics
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- page_view, content_access, tutor_interaction, etc.
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de seguimiento de desarrollo
CREATE TABLE development_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- planned, in_progress, completed, testing, deployed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    acceptance_criteria JSONB DEFAULT '[]',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    start_date DATE,
    target_date DATE,
    completed_date DATE,
    dependencies JSONB DEFAULT '[]', -- IDs de otras features que deben completarse primero
    tags JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logs de desarrollo
CREATE TABLE development_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES development_tracking(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- created, updated, status_changed, comment_added, etc.
    old_values JSONB,
    new_values JSONB,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de métricas de rendimiento
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20), -- ms, %, count, etc.
    context JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de errores y bugs
CREATE TABLE system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type VARCHAR(100) NOT NULL, -- bug, performance, security, etc.
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stack_trace TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    reproduction_steps TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    environment JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para usuarios
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Índices para cursos
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_public ON courses(is_public);

-- Índices para enrollments
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Índices para contenido
CREATE INDEX idx_content_chunks_course ON course_content_chunks(course_id);
CREATE INDEX idx_content_chunks_unit ON course_content_chunks(unit_id);

-- Índices para archivos
CREATE INDEX idx_files_uploaded_by ON system_files(uploaded_by);
CREATE INDEX idx_files_course ON system_files(course_id);
CREATE INDEX idx_files_unit ON system_files(unit_id);
CREATE INDEX idx_files_content ON system_files(content_id);
CREATE INDEX idx_files_category ON system_files(file_category);
CREATE INDEX idx_files_hash ON system_files(file_hash);
CREATE INDEX idx_files_created ON system_files(created_at);

-- Índices para versiones de archivos
CREATE INDEX idx_file_versions_file ON file_versions(file_id);
CREATE INDEX idx_file_versions_number ON file_versions(version_number);

-- Índices para procesamiento de archivos
CREATE INDEX idx_file_processing_file ON file_processing(file_id);
CREATE INDEX idx_file_processing_type ON file_processing(processing_type);
CREATE INDEX idx_file_processing_status ON file_processing(status);

-- Índices para analytics
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_course ON analytics_events(course_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- Índices para seguimiento de desarrollo
CREATE INDEX idx_dev_tracking_status ON development_tracking(status);
CREATE INDEX idx_dev_tracking_priority ON development_tracking(priority);
CREATE INDEX idx_dev_tracking_assigned ON development_tracking(assigned_to);
CREATE INDEX idx_dev_tracking_created ON development_tracking(created_at);

-- Índices para logs de desarrollo
CREATE INDEX idx_dev_logs_feature ON development_logs(feature_id);
CREATE INDEX idx_dev_logs_user ON development_logs(user_id);
CREATE INDEX idx_dev_logs_created ON development_logs(created_at);

-- Índices para métricas de rendimiento
CREATE INDEX idx_performance_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_recorded ON performance_metrics(recorded_at);

-- Índices para errores del sistema
CREATE INDEX idx_errors_type ON system_errors(error_type);
CREATE INDEX idx_errors_severity ON system_errors(severity);
CREATE INDEX idx_errors_status ON system_errors(status);
CREATE INDEX idx_errors_assigned ON system_errors(assigned_to);
CREATE INDEX idx_errors_created ON system_errors(created_at);

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_units_updated_at BEFORE UPDATE ON course_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unit_content_updated_at BEFORE UPDATE ON unit_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de cursos con información del instructor
CREATE VIEW courses_with_instructor AS
SELECT 
    c.*,
    u.first_name || ' ' || u.last_name as instructor_name,
    u.email as instructor_email,
    i.name as institution_name
FROM courses c
LEFT JOIN users u ON c.instructor_id = u.id
LEFT JOIN institutions i ON c.institution_id = i.id;

-- Vista de progreso de estudiantes
CREATE VIEW student_progress AS
SELECT 
    e.*,
    c.title as course_title,
    u.first_name || ' ' || u.last_name as student_name,
    COUNT(up.unit_id) as units_completed,
    COUNT(cu.id) as total_units
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN users u ON e.student_id = u.id
LEFT JOIN course_units cu ON cu.course_id = c.id
LEFT JOIN unit_progress up ON up.enrollment_id = e.id AND up.is_completed = true
GROUP BY e.id, c.title, u.first_name, u.last_name;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar categorías de cursos por defecto
INSERT INTO course_categories (name, description, color, icon) VALUES
('Matemáticas', 'Cursos de matemáticas y ciencias exactas', '#3B82F6', 'calculator'),
('Ciencias', 'Ciencias naturales y experimentales', '#10B981', 'flask'),
('Tecnología', 'Programación, informática y tecnología', '#8B5CF6', 'computer'),
('Negocios', 'Administración, finanzas y emprendimiento', '#F59E0B', 'briefcase'),
('Idiomas', 'Aprendizaje de idiomas extranjeros', '#EF4444', 'translate'),
('Humanidades', 'Historia, literatura y filosofía', '#6B7280', 'book');

-- Insertar institución por defecto
INSERT INTO institutions (name, description, website, contact_email) VALUES
('EduSpark Academy', 'Plataforma educativa inteligente', 'https://eduspark.ai', 'admin@eduspark.ai');

COMMIT;
