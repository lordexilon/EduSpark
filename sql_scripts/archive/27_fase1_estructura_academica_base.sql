-- ============================================
-- FASE 1: ESTRUCTURA ACADÉMICA BASE
-- ============================================
-- Este script crea las tablas fundamentales para:
-- 1. Carreras y materias
-- 2. Matriculación e inscripciones
-- 3. Asignación docente-materia
-- ============================================

-- 1. CREAR TABLA DE CARRERAS
CREATE TABLE IF NOT EXISTS public.careers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  coordinator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  duration_months INTEGER DEFAULT 48,
  total_credits INTEGER DEFAULT 0,
  degree_type VARCHAR(50) DEFAULT 'bachelor',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_duration CHECK (duration_months > 0),
  CONSTRAINT valid_credits CHECK (total_credits >= 0)
);

CREATE INDEX IF NOT EXISTS idx_careers_coordinator ON public.careers(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_careers_active ON public.careers(is_active);
CREATE INDEX IF NOT EXISTS idx_careers_code ON public.careers(code);

-- 2. CREAR TABLA DE MATERIAS
CREATE TABLE IF NOT EXISTS public.subjects (
  id SERIAL PRIMARY KEY,
  career_id INTEGER REFERENCES public.careers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 0,
  hours_per_week INTEGER DEFAULT 0,
  semester INTEGER,
  prerequisite_subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL,
  is_core BOOLEAN DEFAULT true,
  difficulty_level VARCHAR(20) DEFAULT 'intermediate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(career_id, code),
  CONSTRAINT valid_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 20)),
  CONSTRAINT valid_credits CHECK (credits >= 0),
  CONSTRAINT valid_hours CHECK (hours_per_week >= 0)
);

CREATE INDEX IF NOT EXISTS idx_subjects_career ON public.subjects(career_id);
CREATE INDEX IF NOT EXISTS idx_subjects_prerequisite ON public.subjects(prerequisite_subject_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(career_id, semester);

-- 3. AGREGAR COLUMNAS A COURSES (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'academic_period'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN academic_period VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN start_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN end_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'schedule'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN schedule JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'max_students'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN max_students INTEGER;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_period ON public.courses(academic_period);

-- 4. CREAR TABLA DE MATRICULACIÓN EN CARRERAS
CREATE TABLE IF NOT EXISTS public.career_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  career_id INTEGER NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active',
  graduation_date DATE,
  current_semester INTEGER DEFAULT 1,
  total_credits_earned INTEGER DEFAULT 0,
  gpa DECIMAL(4,2),
  academic_status VARCHAR(50) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, career_id),
  CONSTRAINT valid_semester CHECK (current_semester >= 1),
  CONSTRAINT valid_credits CHECK (total_credits_earned >= 0),
  CONSTRAINT valid_gpa CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 10))
);

CREATE INDEX IF NOT EXISTS idx_career_enrollments_student ON public.career_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_career_enrollments_career ON public.career_enrollments(career_id);
CREATE INDEX IF NOT EXISTS idx_career_enrollments_status ON public.career_enrollments(status);

-- 5. CREAR TABLA DE INSCRIPCIÓN EN CURSOS
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active',
  final_grade DECIMAL(5,2),
  letter_grade VARCHAR(5),
  attendance_percentage DECIMAL(5,2) DEFAULT 0,
  participation_score DECIMAL(5,2) DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  last_access_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, course_id),
  CONSTRAINT valid_final_grade CHECK (final_grade IS NULL OR (final_grade >= 0 AND final_grade <= 100)),
  CONSTRAINT valid_percentage CHECK (
    attendance_percentage >= 0 AND attendance_percentage <= 100 AND
    participation_score >= 0 AND participation_score <= 100 AND
    completion_percentage >= 0 AND completion_percentage <= 100
  ),
  CONSTRAINT valid_time CHECK (time_spent_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);

-- 6. CREAR TABLA DE ASIGNACIÓN DOCENTE-MATERIA
CREATE TABLE IF NOT EXISTS public.subject_assignments (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  academic_period VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subject_id, teacher_id, academic_period),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_subject_assignments_subject ON public.subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_teacher ON public.subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_period ON public.subject_assignments(academic_period);

-- 7. CREAR TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_careers_updated_at
  BEFORE UPDATE ON public.careers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_career_enrollments_updated_at
  BEFORE UPDATE ON public.career_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_subject_assignments_updated_at
  BEFORE UPDATE ON public.subject_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. VERIFICACIÓN FINAL
DO $$
BEGIN
  RAISE NOTICE '=== Verificación de Fase 1 ===';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'careers') THEN
    RAISE NOTICE '✓ Tabla careers creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subjects') THEN
    RAISE NOTICE '✓ Tabla subjects creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'career_enrollments') THEN
    RAISE NOTICE '✓ Tabla career_enrollments creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_enrollments') THEN
    RAISE NOTICE '✓ Tabla course_enrollments creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subject_assignments') THEN
    RAISE NOTICE '✓ Tabla subject_assignments creada';
  END IF;
  
  RAISE NOTICE '=== Fase 1: Completada ===';
END $$;

