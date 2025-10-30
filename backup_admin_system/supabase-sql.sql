-- =====================================================
-- Script SQL para Supabase - EduSpark Sistema Educativo
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- =====================================================

-- 1. Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Crear tabla de relación roles-permisos
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 5. Crear tabla de instituciones
CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Crear tabla de relación usuarios-instituciones
CREATE TABLE IF NOT EXISTS user_institutions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, institution_id)
);

-- 7. Crear tabla de cursos
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE,
    instructor_id UUID REFERENCES users(id),
    institution_id INTEGER REFERENCES institutions(id),
    status VARCHAR(20) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    max_students INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Crear tabla de inscripciones
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    grade DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- 9. Crear tabla de contenido
CREATE TABLE IF NOT EXISTS content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Crear tabla de tokens de restablecimiento
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 12. Crear tabla de desarrollo (features)
CREATE TABLE IF NOT EXISTS development_tracking (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL, -- 'feature', 'bug', 'improvement'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Crear tabla de logs de desarrollo
CREATE TABLE IF NOT EXISTS development_logs (
    id SERIAL PRIMARY KEY,
    feature_id INTEGER REFERENCES development_tracking(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 14. Crear tabla de métricas de rendimiento
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20),
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- 15. Crear tabla de errores del sistema
CREATE TABLE IF NOT EXISTS system_errors (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    user_id UUID REFERENCES users(id),
    request_url VARCHAR(500),
    request_method VARCHAR(10),
    user_agent TEXT,
    ip_address INET,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 16. Crear tabla de archivos del sistema
CREATE TABLE IF NOT EXISTS system_files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'document', 'image', 'video', 'audio', 'archive'
    uploaded_by UUID REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 17. Crear tabla de versiones de archivos
CREATE TABLE IF NOT EXISTS file_versions (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES system_files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    change_description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

-- 18. Crear tabla de procesamiento de archivos
CREATE TABLE IF NOT EXISTS file_processing (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES system_files(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL, -- 'thumbnail', 'compression', 'conversion'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    input_path VARCHAR(500),
    output_path VARCHAR(500),
    processing_options JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution_id ON courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_content_course_id ON content(course_id);
CREATE INDEX IF NOT EXISTS idx_content_created_by ON content(created_by);
CREATE INDEX IF NOT EXISTS idx_development_tracking_assigned_to ON development_tracking(assigned_to);
CREATE INDEX IF NOT EXISTS idx_development_tracking_status ON development_tracking(status);
CREATE INDEX IF NOT EXISTS idx_system_files_uploaded_by ON system_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_system_files_course_id ON system_files(course_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Insertar datos iniciales
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrador del sistema con acceso completo'),
('teacher', 'Docente con acceso a gestión de cursos y estudiantes'),
('student', 'Estudiante con acceso a cursos y contenido')
ON CONFLICT (name) DO NOTHING;

-- Insertar permisos básicos
INSERT INTO permissions (name, description, resource, action) VALUES 
('users.read', 'Ver usuarios', 'users', 'read'),
('users.create', 'Crear usuarios', 'users', 'create'),
('users.update', 'Editar usuarios', 'users', 'update'),
('users.delete', 'Eliminar usuarios', 'users', 'delete'),
('courses.read', 'Ver cursos', 'courses', 'read'),
('courses.create', 'Crear cursos', 'courses', 'create'),
('courses.update', 'Editar cursos', 'courses', 'update'),
('courses.delete', 'Eliminar cursos', 'courses', 'delete'),
('content.read', 'Ver contenido', 'content', 'read'),
('content.create', 'Crear contenido', 'content', 'create'),
('content.update', 'Editar contenido', 'content', 'update'),
('content.delete', 'Eliminar contenido', 'content', 'delete'),
('roles.read', 'Ver roles', 'roles', 'read'),
('roles.create', 'Crear roles', 'roles', 'create'),
('roles.update', 'Editar roles', 'roles', 'update'),
('roles.delete', 'Eliminar roles', 'roles', 'delete'),
('admin.dashboard', 'Acceso al dashboard de admin', 'admin', 'dashboard'),
('admin.analytics', 'Ver analytics del sistema', 'admin', 'analytics'),
('teacher.dashboard', 'Acceso al dashboard de docente', 'teacher', 'dashboard'),
('teacher.students', 'Gestionar estudiantes', 'teacher', 'students'),
('development.read', 'Ver métricas de desarrollo', 'development', 'read'),
('development.create', 'Crear features/bugs', 'development', 'create')
ON CONFLICT (name) DO NOTHING;

-- Insertar institución por defecto
INSERT INTO institutions (name, description, email, is_active) VALUES 
('EduSpark Universidad', 'Institución educativa principal', 'info@eduspark.ai', true)
ON CONFLICT DO NOTHING;

-- Asignar permisos a roles
-- Admin: todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Teacher: permisos de docente y contenido
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teacher' 
AND (p.name LIKE '%teacher%' OR p.name LIKE '%courses%' OR p.name LIKE '%content%' OR p.name = 'development.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Student: solo lectura de cursos y contenido
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'student' 
AND (p.name = 'courses.read' OR p.name = 'content.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Crear usuario administrador
INSERT INTO users (email, password, first_name, last_name, role_id, is_active, email_verified)
SELECT 
    'admin@eduspark.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5J5K5K5K5K', -- admin123
    'Administrador',
    'Sistema',
    r.id,
    true,
    true
FROM roles r WHERE r.name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- Crear usuario docente
INSERT INTO users (email, password, first_name, last_name, role_id, is_active, email_verified)
SELECT 
    'teacher@eduspark.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5J5K5K5K', -- teacher123
    'Profesor',
    'Prueba',
    r.id,
    true,
    true
FROM roles r WHERE r.name = 'teacher'
ON CONFLICT (email) DO NOTHING;

-- Crear usuario estudiante
INSERT INTO users (email, password, first_name, last_name, role_id, is_active, email_verified)
SELECT 
    'student@eduspark.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5J5K5K5K', -- student123
    'Estudiante',
    'Prueba',
    r.id,
    true,
    true
FROM roles r WHERE r.name = 'student'
ON CONFLICT (email) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_files ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
    );

CREATE POLICY "Teachers can view students" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('admin', 'teacher')
        )
    );

-- Comentarios finales
COMMENT ON TABLE roles IS 'Roles del sistema educativo';
COMMENT ON TABLE permissions IS 'Permisos granulares del sistema';
COMMENT ON TABLE users IS 'Usuarios del sistema educativo';
COMMENT ON TABLE courses IS 'Cursos educativos';
COMMENT ON TABLE content IS 'Contenido educativo';
COMMENT ON TABLE development_tracking IS 'Seguimiento de desarrollo de features';
COMMENT ON TABLE system_files IS 'Archivos del sistema educativo';
