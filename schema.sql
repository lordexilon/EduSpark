-- =====================================================
-- Esquema de Base de Datos - Sistema Educativo EduSpark
-- =====================================================

-- Extensión para vectores (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TABLAS DE USUARIOS Y ROLES
-- =====================================================

-- Tabla de roles del sistema
CREATE TABLE IF NOT EXISTS roles (
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
  ('student', 'Estudiante', '{"enroll": true, "learn": true}')
ON CONFLICT (name) DO NOTHING;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS institutions (
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
CREATE TABLE IF NOT EXISTS user_institutions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
  position VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, institution_id)
);

-- =====================================================
-- TABLAS DE CURSOS
-- =====================================================

CREATE TABLE IF NOT EXISTS course_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),
  parent_id INTEGER REFERENCES course_categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  category_id INTEGER REFERENCES course_categories(id),
  instructor_id UUID REFERENCES users(id),
  institution_id INTEGER REFERENCES institutions(id),
  thumbnail_url TEXT,
  difficulty_level VARCHAR(20) DEFAULT 'beginner',
  estimated_duration INTEGER,
  language VARCHAR(10) DEFAULT 'es',
  status VARCHAR(20) DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false,
  enrollment_type VARCHAR(20) DEFAULT 'open',
  max_students INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_objectives (
  id SERIAL PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unit_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  content_data JSONB,
  order_index INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10),
  file_hash VARCHAR(64),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
  content_id UUID REFERENCES unit_content(id) ON DELETE SET NULL,
  file_category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_versions (
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

CREATE TABLE IF NOT EXISTS file_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES system_files(id) ON DELETE CASCADE,
  processing_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  input_path TEXT,
  output_path TEXT,
  processing_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_accessed TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS unit_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  time_spent INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(enrollment_id, unit_id)
);

CREATE TABLE IF NOT EXISTS course_content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
  content_id UUID REFERENCES unit_content(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_chunks_embedding ON course_content_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  intent VARCHAR(50),
  tone VARCHAR(50),
  context_used JSONB,
  response_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assessment_type VARCHAR(50) NOT NULL,
  instructions TEXT,
  time_limit INTEGER,
  max_attempts INTEGER DEFAULT 1,
  passing_score DECIMAL(5,2) DEFAULT 70.0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  options JSONB,
  correct_answer JSONB,
  points DECIMAL(5,2) DEFAULT 1.0,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS development_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  acceptance_criteria JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_hours INTEGER,
  actual_hours INTEGER,
  start_date DATE,
  target_date DATE,
  completed_date DATE,
  dependencies JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS development_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES development_tracking(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20),
  context JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stack_trace TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  reproduction_steps TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  environment JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indices are skipped for brevity unless explicitly requested, 
-- but I'll add the default ones from the dump:

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VIEWS
CREATE OR REPLACE VIEW courses_with_instructor AS
SELECT c.*, u.first_name || ' ' || u.last_name as instructor_name, u.email as instructor_email, i.name as institution_name
FROM courses c
LEFT JOIN users u ON c.instructor_id = u.id
LEFT JOIN institutions i ON c.institution_id = i.id;

CREATE OR REPLACE VIEW student_progress AS
SELECT e.*, c.title as course_title, u.first_name || ' ' || u.last_name as student_name, 
COUNT(up.unit_id) as units_completed, COUNT(cu.id) as total_units
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN users u ON e.student_id = u.id
LEFT JOIN course_units cu ON cu.course_id = c.id
LEFT JOIN unit_progress up ON up.enrollment_id = e.id AND up.is_completed = true
GROUP BY e.id, c.title, u.first_name, u.last_name;

-- Insertar institución por defecto
INSERT INTO institutions (name, description, website, contact_email) VALUES 
('EduSpark Academy', 'Plataforma educativa inteligente', 'https://eduspark.ai', 'admin@eduspark.ai')
ON CONFLICT DO NOTHING;

COMMIT;
