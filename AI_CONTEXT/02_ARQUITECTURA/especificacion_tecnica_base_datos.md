# Especificación Técnica: Base de Datos Completa
## Scripts SQL Detallados y Relaciones

**Fecha:** Octubre 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Tablas de Estructura Académica](#tablas-de-estructura-académica)
2. [Tablas de Matriculación](#tablas-de-matriculación)
3. [Tablas de Coordinación](#tablas-de-coordinación)
4. [Tablas de Sesiones y Asistencia](#tablas-de-sesiones-y-asistencia)
5. [Tablas de Evaluación](#tablas-de-evaluación)
6. [Tablas de Gamificación](#tablas-de-gamificación)
7. [Tablas de Seguimiento](#tablas-de-seguimiento)
8. [Tablas de IA Analítica](#tablas-de-ia-analítica)
9. [Vistas y Funciones](#vistas-y-funciones)
10. [Políticas RLS Completas](#políticas-rls-completas)

---

## 1. Tablas de Estructura Académica

### 1.1. Tabla `careers`

```sql
-- Crear tabla de carreras/programas académicos
CREATE TABLE IF NOT EXISTS public.careers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  coordinator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  duration_months INTEGER DEFAULT 48, -- Duración en meses (ej: 4 años = 48 meses)
  total_credits INTEGER DEFAULT 0,
  degree_type VARCHAR(50) DEFAULT 'bachelor', -- bachelor, master, diploma, certificate
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_duration CHECK (duration_months > 0),
  CONSTRAINT valid_credits CHECK (total_credits >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_careers_coordinator ON public.careers(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_careers_active ON public.careers(is_active);
CREATE INDEX IF NOT EXISTS idx_careers_code ON public.careers(code);

-- Comentarios
COMMENT ON TABLE public.careers IS 'Carreras o programas académicos completos';
COMMENT ON COLUMN public.careers.coordinator_id IS 'Coordinador académico responsable';
COMMENT ON COLUMN public.careers.duration_months IS 'Duración del programa en meses';
COMMENT ON COLUMN public.careers.total_credits IS 'Total de créditos del programa';
```

### 1.2. Tabla `subjects`

```sql
-- Crear tabla de materias/disciplinas
CREATE TABLE IF NOT EXISTS public.subjects (
  id SERIAL PRIMARY KEY,
  career_id INTEGER REFERENCES public.careers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 0,
  hours_per_week INTEGER DEFAULT 0,
  semester INTEGER, -- Semestre en el que se dicta (1-10, null = electiva)
  prerequisite_subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL,
  is_core BOOLEAN DEFAULT true, -- Materia obligatoria vs electiva
  difficulty_level VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(career_id, code),
  CONSTRAINT valid_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 20)),
  CONSTRAINT valid_credits CHECK (credits >= 0),
  CONSTRAINT valid_hours CHECK (hours_per_week >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subjects_career ON public.subjects(career_id);
CREATE INDEX IF NOT EXISTS idx_subjects_prerequisite ON public.subjects(prerequisite_subject_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(career_id, semester);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(career_id, code);

-- Comentarios
COMMENT ON TABLE public.subjects IS 'Materias o disciplinas dentro de una carrera';
COMMENT ON COLUMN public.subjects.prerequisite_subject_id IS 'Materia que debe aprobarse antes';
COMMENT ON COLUMN public.subjects.is_core IS 'true = obligatoria, false = electiva';
```

### 1.3. Modificaciones a `courses`

```sql
-- Agregar columnas necesarias a la tabla courses existente
DO $$
BEGIN
  -- Agregar subject_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL;
  END IF;
  
  -- Agregar academic_period si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'academic_period'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN academic_period VARCHAR(50); -- "2025-1", "2025-2"
  END IF;
  
  -- Agregar start_date si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN start_date DATE;
  END IF;
  
  -- Agregar end_date si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN end_date DATE;
  END IF;
  
  -- Agregar schedule si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'schedule'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN schedule JSONB DEFAULT '[]'::jsonb;
    -- Formato: [{"day": "Monday", "start_time": "08:00", "end_time": "10:00", "location": "Aula 101"}]
  END IF;
  
  -- Agregar max_students si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'max_students'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN max_students INTEGER;
  END IF;
  
  -- Agregar enrollment_deadline si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'enrollment_deadline'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN enrollment_deadline DATE;
  END IF;
END $$;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_period ON public.courses(academic_period);
CREATE INDEX IF NOT EXISTS idx_courses_dates ON public.courses(start_date, end_date);

-- Comentarios
COMMENT ON COLUMN public.courses.subject_id IS 'Materia a la que pertenece este curso';
COMMENT ON COLUMN public.courses.academic_period IS 'Período académico: formato "YYYY-S" donde S = 1 o 2';
COMMENT ON COLUMN public.courses.schedule IS 'Horarios de clase en formato JSON';
```

---

## 2. Tablas de Matriculación

### 2.1. Tabla `career_enrollments`

```sql
-- Matriculación: Estudiante se inscribe a una carrera
CREATE TABLE IF NOT EXISTS public.career_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  career_id INTEGER NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, suspended, dropped, graduated
  graduation_date DATE,
  current_semester INTEGER DEFAULT 1,
  total_credits_earned INTEGER DEFAULT 0,
  gpa DECIMAL(4,2), -- Grade Point Average (0.00 - 4.00 o 0.00 - 10.00 según sistema)
  academic_status VARCHAR(50) DEFAULT 'normal', -- normal, probation, honors
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, career_id),
  CONSTRAINT valid_semester CHECK (current_semester >= 1),
  CONSTRAINT valid_credits CHECK (total_credits_earned >= 0),
  CONSTRAINT valid_gpa CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 10))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_career_enrollments_student ON public.career_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_career_enrollments_career ON public.career_enrollments(career_id);
CREATE INDEX IF NOT EXISTS idx_career_enrollments_status ON public.career_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_career_enrollments_active ON public.career_enrollments(student_id, status) 
  WHERE status = 'active';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_career_enrollment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_career_enrollment_updated_at
  BEFORE UPDATE ON public.career_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_career_enrollment_updated_at();

-- Comentarios
COMMENT ON TABLE public.career_enrollments IS 'Matriculación de estudiantes en carreras';
COMMENT ON COLUMN public.career_enrollments.gpa IS 'Promedio general del estudiante';
```

### 2.2. Tabla `course_enrollments`

```sql
-- Inscripción: Estudiante se inscribe a una materia (curso)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, failed, dropped, withdrawn
  final_grade DECIMAL(5,2), -- Calificación final (0.00 - 100.00)
  letter_grade VARCHAR(5), -- A+, A, A-, B+, B, B-, C+, C, D, F
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_active ON public.course_enrollments(student_id, status) 
  WHERE status = 'active';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_course_enrollment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_course_enrollment_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_course_enrollment_updated_at();

-- Trigger para actualizar last_access_at cuando estudiante accede al curso
-- (Este trigger se activaría desde la aplicación cuando hay actividad)

-- Comentarios
COMMENT ON TABLE public.course_enrollments IS 'Inscripción de estudiantes en cursos específicos';
COMMENT ON COLUMN public.course_enrollments.letter_grade IS 'Calificación en letra según escala';
```

---

## 3. Tablas de Coordinación

### 3.1. Tabla `subject_assignments`

```sql
-- Asignación de docente a materia
CREATE TABLE IF NOT EXISTS public.subject_assignments (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  academic_period VARCHAR(50) NOT NULL, -- "2025-1", "2025-2"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Coordinador que asigna
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subject_id, teacher_id, academic_period),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subject_assignments_subject ON public.subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_teacher ON public.subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_period ON public.subject_assignments(academic_period);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_active ON public.subject_assignments(teacher_id, status) 
  WHERE status = 'active';

-- Comentarios
COMMENT ON TABLE public.subject_assignments IS 'Asignación de docentes a materias por período académico';
COMMENT ON COLUMN public.subject_assignments.academic_period IS 'Período en formato "YYYY-S"';
```

---

## 4. Tablas de Sesiones y Asistencia

### 4.1. Tabla `class_sessions`

```sql
-- Sesiones/clases del curso
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES public.course_modules(id) ON DELETE SET NULL,
  session_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type VARCHAR(20) DEFAULT 'regular', -- regular, exam, workshop, lab, review
  location VARCHAR(255), -- Aula física o URL virtual
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  materials_summary TEXT, -- Resumen de materiales a cubrir
  recording_url TEXT, -- URL de grabación si existe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, session_number),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT valid_session_number CHECK (session_number > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_class_sessions_course ON public.class_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_module ON public.class_sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_date ON public.class_sessions(course_id, scheduled_date);

-- Comentarios
COMMENT ON TABLE public.class_sessions IS 'Sesiones de clase programadas';
COMMENT ON COLUMN public.class_sessions.session_type IS 'Tipo de sesión: regular, exam, workshop, lab, review';
```

### 4.2. Tabla `attendance`

```sql
-- Asistencia a clases
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'present', -- present, absent, late, excused, partial
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Docente que registra
  auto_recorded BOOLEAN DEFAULT false, -- Si fue registrada automáticamente por sistema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, student_id),
  CONSTRAINT valid_checkout CHECK (checked_out_at IS NULL OR checked_in_at IS NULL OR checked_out_at >= checked_in_at)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.attendance IS 'Registro de asistencia a sesiones de clase';
COMMENT ON COLUMN public.attendance.auto_recorded IS 'Si fue detectada automáticamente por el sistema';
```

### 4.3. Tabla `class_participation`

```sql
-- Participación en clases (tracking automático y manual)
CREATE TABLE IF NOT EXISTS public.class_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participation_type VARCHAR(50) NOT NULL, -- question, answer, discussion, activity, group_work
  participation_score DECIMAL(3,1) DEFAULT 0, -- 0.0 - 10.0
  details JSONB DEFAULT '{}'::jsonb, -- Detalles de la participación
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Docente o sistema
  auto_recorded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_score CHECK (participation_score >= 0 AND participation_score <= 10)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_class_participation_session ON public.class_participation(session_id);
CREATE INDEX IF NOT EXISTS idx_class_participation_student ON public.class_participation(student_id);
CREATE INDEX IF NOT EXISTS idx_class_participation_type ON public.class_participation(participation_type);
CREATE INDEX IF NOT EXISTS idx_class_participation_date ON public.class_participation(recorded_at DESC);

-- Comentarios
COMMENT ON TABLE public.class_participation IS 'Registro de participación de estudiantes en clases';
COMMENT ON COLUMN public.class_participation.details IS 'JSON con detalles: {"question_text": "...", "response_time": 5}';
```

---

## 5. Tablas de Evaluación

### 5.1. Mejoras a `assignments`

```sql
-- Agregar columnas necesarias a assignments
DO $$
BEGIN
  -- Agregar module_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN module_id INTEGER REFERENCES public.course_modules(id) ON DELETE SET NULL;
  END IF;
  
  -- Agregar session_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL;
  END IF;
  
  -- Agregar assignment_type si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN assignment_type VARCHAR(50) DEFAULT 'homework';
    -- homework, project, exam, essay, lab_report, presentation
  END IF;
  
  -- Agregar instructions si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'instructions'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN instructions TEXT;
  END IF;
  
  -- Agregar rubric si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'rubric'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN rubric JSONB DEFAULT '[]'::jsonb;
    -- Formato: [{"criterion": "...", "max_points": 25, "description": "..."}]
  END IF;
  
  -- Agregar allow_late_submission si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'allow_late_submission'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN allow_late_submission BOOLEAN DEFAULT false;
  END IF;
  
  -- Agregar late_penalty_percentage si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'late_penalty_percentage'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN late_penalty_percentage DECIMAL(5,2) DEFAULT 0;
    -- Penalización por día de retraso (ej: 5% por día)
  END IF;
  
  -- Agregar max_attempts si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN max_attempts INTEGER DEFAULT 1;
  END IF;
  
  -- Agregar is_group_assignment si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'is_group_assignment'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN is_group_assignment BOOLEAN DEFAULT false;
  END IF;
  
  -- Agregar max_group_size si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'max_group_size'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN max_group_size INTEGER DEFAULT 1;
  END IF;
END $$;
```

### 5.2. Mejoras a `assignment_submissions`

```sql
-- Mejorar tabla assignment_submissions
DO $$
BEGIN
  -- Agregar attempt_number si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'attempt_number'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN attempt_number INTEGER DEFAULT 1;
  END IF;
  
  -- Agregar submission_status si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'submission_status'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN submission_status VARCHAR(20) DEFAULT 'submitted';
    -- submitted, graded, returned, needs_revision
  END IF;
  
  -- Agregar auto_feedback si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'auto_feedback'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN auto_feedback TEXT;
    -- Feedback generado automáticamente por IA
  END IF;
  
  -- Agregar rubric_scores si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'rubric_scores'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN rubric_scores JSONB DEFAULT '{}'::jsonb;
    -- {"criterion_1": 20, "criterion_2": 18, ...}
  END IF;
  
  -- Agregar time_spent_minutes si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'time_spent_minutes'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN time_spent_minutes INTEGER;
  END IF;
  
  -- Agregar files JSONB para múltiples archivos si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'files'
  ) THEN
    ALTER TABLE public.assignment_submissions ADD COLUMN files JSONB DEFAULT '[]'::jsonb;
    -- [{"url": "...", "name": "...", "type": "..."}]
  END IF;
END $$;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.assignment_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_submissions_attempt ON public.assignment_submissions(assignment_id, student_id, attempt_number);
```

---

## 6. Tablas de Gamificación

### 6.1. Tabla `quizzes`

```sql
-- Quizz y evaluaciones rápidas
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES public.course_modules(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quiz_type VARCHAR(50) DEFAULT 'formative', -- formative, summative, practice, diagnostic
  max_points DECIMAL(5,2) DEFAULT 100,
  time_limit_minutes INTEGER, -- NULL = sin límite de tiempo
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,
  show_results_immediately BOOLEAN DEFAULT true,
  show_correct_answers BOOLEAN DEFAULT true,
  allow_multiple_attempts BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 1,
  passing_score DECIMAL(5,2) DEFAULT 60, -- Puntaje mínimo para aprobar
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_points CHECK (max_points > 0),
  CONSTRAINT valid_time_limit CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100),
  CONSTRAINT valid_attempts CHECK (max_attempts > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON public.quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_session ON public.quizzes(session_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_type ON public.quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_active ON public.quizzes(is_active) WHERE is_active = true;
```

### 6.2. Tabla `quiz_questions`

```sql
-- Preguntas de quizz
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type VARCHAR(50) DEFAULT 'multiple_choice', 
  -- multiple_choice, true_false, short_answer, essay, matching, fill_blank
  question_text TEXT NOT NULL,
  options JSONB, -- Para multiple choice: ["opción 1", "opción 2", ...]
  correct_answer TEXT,
  correct_answers JSONB, -- Para preguntas con múltiples respuestas correctas
  points DECIMAL(5,2) DEFAULT 1,
  explanation TEXT, -- Explicación de la respuesta correcta
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_points CHECK (points > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON public.quiz_questions(quiz_id, order_index);
```

### 6.3. Tabla `quiz_attempts`

```sql
-- Respuestas de estudiantes
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score DECIMAL(5,2),
  percentage DECIMAL(5,2),
  answers JSONB DEFAULT '{}'::jsonb, -- {"question_id": "answer", ...}
  time_spent_seconds INTEGER,
  is_passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(quiz_id, student_id, attempt_number),
  CONSTRAINT valid_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON public.quiz_attempts(completed_at DESC);
```

### 6.4. Tabla `student_points`

```sql
-- Sistema de puntos y logros
CREATE TABLE IF NOT EXISTS public.student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  source VARCHAR(50) NOT NULL, -- quiz, assignment, attendance, participation, bonus, streak
  source_id UUID, -- ID del quiz, assignment, etc.
  reason TEXT, -- Motivo de los puntos
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_points CHECK (points != 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_points_student ON public.student_points(student_id);
CREATE INDEX IF NOT EXISTS idx_student_points_course ON public.student_points(course_id);
CREATE INDEX IF NOT EXISTS idx_student_points_date ON public.student_points(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_points_source ON public.student_points(source, source_id);
```

### 6.5. Tabla `achievements`

```sql
-- Logros y badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Nombre del icono (emoji o código)
  icon_color VARCHAR(7), -- Color en hex
  points_required INTEGER DEFAULT 0,
  achievement_type VARCHAR(50) NOT NULL, 
  -- perfect_score, attendance_streak, early_bird, participator, completionist, etc.
  course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL, -- NULL = logro global
  criteria JSONB DEFAULT '{}'::jsonb, -- Criterios específicos para obtener el logro
  is_active BOOLEAN DEFAULT true,
  rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_points CHECK (points_required >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_course ON public.achievements(course_id);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active) WHERE is_active = true;
```

### 6.6. Tabla `student_achievements`

```sql
-- Logros obtenidos por estudiantes
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT false,
  
  UNIQUE(student_id, achievement_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON public.student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement ON public.student_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_date ON public.student_achievements(earned_at DESC);
```

---

## 7. Tablas de Seguimiento

### 7.1. Tabla `module_progress`

```sql
-- Progreso por módulo
CREATE TABLE IF NOT EXISTS public.module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  materials_viewed INTEGER DEFAULT 0,
  materials_total INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(enrollment_id, module_id),
  CONSTRAINT valid_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT valid_materials CHECK (materials_viewed >= 0 AND materials_total >= 0),
  CONSTRAINT valid_time CHECK (time_spent_minutes >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_module_progress_enrollment ON public.module_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON public.module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_completed ON public.module_progress(completed_at) 
  WHERE completed_at IS NOT NULL;
```

### 7.2. Tabla `student_engagement`

```sql
-- Seguimiento de compromiso (para IA analítica)
CREATE TABLE IF NOT EXISTS public.student_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  engagement_score DECIMAL(5,2) DEFAULT 0, -- 0-100
  metrics JSONB DEFAULT '{}'::jsonb, -- {
  --   "time_spent_minutes": 120,
  --   "materials_viewed": 5,
  --   "assignments_submitted": 2,
  --   "quizzes_completed": 3,
  --   "participation_count": 5,
  --   "tutor_interactions": 10,
  --   "pages_viewed": 25
  -- }
  risk_level VARCHAR(20), -- low, medium, high (riesgo de deserción)
  trends JSONB DEFAULT '{}'::jsonb, -- {"direction": "improving", "velocity": 0.5}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, course_id, date),
  CONSTRAINT valid_score CHECK (engagement_score >= 0 AND engagement_score <= 100)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_engagement_student ON public.student_engagement(student_id);
CREATE INDEX IF NOT EXISTS idx_engagement_course ON public.student_engagement(course_id);
CREATE INDEX IF NOT EXISTS idx_engagement_date ON public.student_engagement(date DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_risk ON public.student_engagement(risk_level) 
  WHERE risk_level IN ('medium', 'high');
```

---

## 8. Tablas de IA Analítica

### 8.1. Tabla `ai_teacher_reports`

```sql
-- Reportes generados por IA para docentes
CREATE TABLE IF NOT EXISTS public.ai_teacher_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, 
  -- engagement_summary, risk_analysis, performance_prediction, intervention_suggestions
  report_date DATE DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  insights JSONB DEFAULT '{}'::jsonb, -- Análisis de IA
  recommendations JSONB DEFAULT '[]'::jsonb, -- Recomendaciones generadas
  students_at_risk JSONB DEFAULT '[]'::jsonb, -- Lista de estudiantes en riesgo
  statistics JSONB DEFAULT '{}'::jsonb, -- Estadísticas agregadas
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_teacher_reports_course ON public.ai_teacher_reports(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_reports_type ON public.ai_teacher_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_reports_date ON public.ai_teacher_reports(report_date DESC);
```

### 8.2. Tabla `ai_student_reports`

```sql
-- Reportes para estudiantes
CREATE TABLE IF NOT EXISTS public.ai_student_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, 
  -- progress_summary, study_recommendations, performance_analysis, strengths_weaknesses
  insights JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  predicted_grade DECIMAL(5,2), -- Predicción de calificación final
  strengths JSONB DEFAULT '[]'::jsonb, -- Áreas fuertes identificadas
  weaknesses JSONB DEFAULT '[]'::jsonb, -- Áreas de mejora
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_prediction CHECK (predicted_grade IS NULL OR (predicted_grade >= 0 AND predicted_grade <= 100))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_student_reports_student ON public.ai_student_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_student_reports_course ON public.ai_student_reports(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_student_reports_type ON public.ai_student_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_ai_student_reports_date ON public.ai_student_reports(generated_at DESC);
```

---

## 9. Vistas y Funciones

### 9.1. Vista: Resumen de Enrollments por Estudiante

```sql
CREATE OR REPLACE VIEW vw_student_enrollments_summary AS
SELECT 
  ce.student_id,
  u.first_name || ' ' || u.last_name AS student_name,
  ce.course_id,
  c.title AS course_title,
  s.name AS subject_name,
  car.name AS career_name,
  ce.status AS enrollment_status,
  ce.final_grade,
  ce.attendance_percentage,
  ce.participation_score,
  ce.completion_percentage,
  c.start_date,
  c.end_date,
  ce.last_access_at
FROM public.course_enrollments ce
JOIN public.users u ON ce.student_id = u.id
JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN public.subjects s ON c.subject_id = s.id
LEFT JOIN public.careers car ON s.career_id = car.id;
```

### 9.2. Vista: Resumen de Progreso por Curso

```sql
CREATE OR REPLACE VIEW vw_course_progress_summary AS
SELECT 
  c.id AS course_id,
  c.title AS course_title,
  COUNT(DISTINCT ce.student_id) AS total_students,
  COUNT(DISTINCT CASE WHEN ce.status = 'active' THEN ce.student_id END) AS active_students,
  AVG(ce.completion_percentage) AS avg_completion,
  AVG(ce.attendance_percentage) AS avg_attendance,
  AVG(ce.participation_score) AS avg_participation,
  COUNT(DISTINCT CASE WHEN se.risk_level IN ('medium', 'high') THEN se.student_id END) AS students_at_risk
FROM public.courses c
LEFT JOIN public.course_enrollments ce ON c.id = ce.course_id
LEFT JOIN public.student_engagement se ON c.id = se.course_id AND se.date = CURRENT_DATE
GROUP BY c.id, c.title;
```

### 9.3. Función: Calcular Engagement Score

```sql
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_student_id UUID,
  p_course_id INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_score DECIMAL(5,2);
  v_metrics JSONB;
BEGIN
  -- Obtener métricas del día
  SELECT metrics INTO v_metrics
  FROM public.student_engagement
  WHERE student_id = p_student_id 
    AND course_id = p_course_id 
    AND date = p_date;
  
  IF v_metrics IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular score ponderado
  -- (Esta es una fórmula simplificada, ajustar según necesidades)
  v_score := 
    COALESCE((v_metrics->>'time_spent_minutes')::DECIMAL / 120 * 30, 0) + -- Máximo 30 puntos por tiempo
    COALESCE((v_metrics->>'materials_viewed')::DECIMAL / 10 * 20, 0) + -- Máximo 20 puntos por materiales
    COALESCE((v_metrics->>'assignments_submitted')::DECIMAL / 5 * 25, 0) + -- Máximo 25 puntos por tareas
    COALESCE((v_metrics->>'quizzes_completed')::DECIMAL / 10 * 15, 0) + -- Máximo 15 puntos por quizz
    COALESCE((v_metrics->>'participation_count')::DECIMAL / 5 * 10, 0); -- Máximo 10 puntos por participación
  
  -- Asegurar que está entre 0 y 100
  RETURN LEAST(GREATEST(v_score, 0), 100);
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Políticas RLS Completas

### 10.1. RLS para `careers`

```sql
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

-- Coordinadores pueden gestionar sus carreras
CREATE POLICY "coordinators_manage_own_careers"
  ON public.careers FOR ALL
  USING (coordinator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() AND r.name = 'admin'
  ));

-- Todos pueden leer carreras activas
CREATE POLICY "everyone_reads_active_careers"
  ON public.careers FOR SELECT
  USING (is_active = true);
```

### 10.2. RLS para `course_enrollments`

```sql
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Estudiantes ven sus propias inscripciones
CREATE POLICY "students_view_own_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Docentes ven inscripciones de sus cursos
CREATE POLICY "teachers_view_course_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_enrollments.course_id 
    AND c.teacher_id = auth.uid()
  ));

-- Coordinadores y admin ven todas
CREATE POLICY "admins_view_all_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  ));

-- Estudiantes pueden inscribirse (con validaciones en aplicación)
CREATE POLICY "students_enroll_in_courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());
```

### 10.3. RLS para `class_sessions`

```sql
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- Docentes gestionan sesiones de sus cursos
CREATE POLICY "teachers_manage_sessions"
  ON public.class_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = class_sessions.course_id 
    AND c.teacher_id = auth.uid()
  ));

-- Estudiantes ven sesiones de cursos inscritos
CREATE POLICY "students_view_enrolled_sessions"
  ON public.class_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = class_sessions.course_id
    AND ce.student_id = auth.uid()
    AND ce.status = 'active'
  ));
```

### 10.4. RLS para `attendance`

```sql
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Estudiantes ven su propia asistencia
CREATE POLICY "students_view_own_attendance"
  ON public.attendance FOR SELECT
  USING (student_id = auth.uid());

-- Docentes gestionan asistencia de sus cursos
CREATE POLICY "teachers_manage_attendance"
  ON public.attendance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.class_sessions cs
    JOIN public.courses c ON cs.course_id = c.id
    WHERE cs.id = attendance.session_id
    AND c.teacher_id = auth.uid()
  ));
```

### 10.5. RLS para `quizzes`

```sql
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Docentes gestionan quizz de sus cursos
CREATE POLICY "teachers_manage_quizzes"
  ON public.quizzes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = quizzes.course_id 
    AND c.teacher_id = auth.uid()
  ));

-- Estudiantes ven quizz activos de cursos inscritos
CREATE POLICY "students_view_active_quizzes"
  ON public.quizzes FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = quizzes.course_id
      AND ce.student_id = auth.uid()
      AND ce.status = 'active'
    )
  );
```

---

## 📝 Notas de Implementación

### Orden de Ejecución de Scripts

1. **Estructura Académica** (careers, subjects)
2. **Modificaciones a courses** (agregar columnas)
3. **Matriculación** (career_enrollments, course_enrollments)
4. **Coordinación** (subject_assignments)
5. **Sesiones y Asistencia** (class_sessions, attendance, class_participation)
6. **Evaluación** (modificaciones a assignments y submissions)
7. **Gamificación** (quizzes, student_points, achievements)
8. **Seguimiento** (module_progress, student_engagement)
9. **IA Analítica** (ai_teacher_reports, ai_student_reports)
10. **Vistas y Funciones**
11. **Políticas RLS**

### Validaciones Importantes

- Validar prerrequisitos antes de permitir inscripción
- Validar límite de estudiantes en curso
- Validar fechas (start_date < end_date)
- Validar que docente tenga asignación de materia antes de crear curso
- Validar que estudiante esté matriculado en carrera antes de inscribirse a materia

### Consideraciones de Performance

- Todos los índices están definidos para optimizar consultas frecuentes
- Considerar particionamiento de `student_engagement` por fecha para grandes volúmenes
- Considerar cacheo de reportes de IA (regenerar solo diariamente)
- Índices compuestos para consultas multi-columna frecuentes

---

**Fin del Documento**

