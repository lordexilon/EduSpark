# Modelo de Datos Detallado - EduSpark
## Especificación Técnica Completa

**Fecha:** Octubre 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Tablas Base del Sistema](#tablas-base-del-sistema)
2. [Tablas Académicas](#tablas-académicas)
3. [Tablas de Matriculación](#tablas-de-matriculación)
4. [Tablas de Contenido](#tablas-de-contenido)
5. [Tablas de Evaluación](#tablas-de-evaluación)
6. [Tablas de Gamificación](#tablas-de-gamificación)
7. [Tablas de Análisis IA](#tablas-de-análisis-ia)
8. [Relaciones y Constraints](#relaciones-y-constraints)
9. [Índices Optimizados](#índices-optimizados)
10. [Vistas Útiles](#vistas-útiles)

---

## 🗄️ Tablas Base del Sistema

### Tabla: `roles`

Ya existe. Roles adicionales propuestos:

```sql
-- Agregar rol de coordinador si no existe
INSERT INTO roles (name, description) 
VALUES ('coordinator', 'Coordinador Académico')
ON CONFLICT (name) DO NOTHING;
```

**Roles del Sistema:**
- `admin` - Administrador total
- `coordinator` - Coordinador académico (NUEVO)
- `teacher` - Docente
- `student` - Estudiante

---

## 📚 Tablas Académicas

### Tabla: `careers` (Carreras/Mallas Curriculares)

```sql
CREATE TABLE IF NOT EXISTS careers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  duration_months INTEGER, -- Duración total en meses
  total_credits INTEGER, -- Total de créditos requeridos
  degree_type VARCHAR(50), -- 'undergraduate', 'graduate', 'diploma', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_careers_coordinator ON careers(coordinator_id);
CREATE INDEX idx_careers_active ON careers(is_active);
```

**Ejemplo de datos:**
```sql
INSERT INTO careers (name, code, description, coordinator_id, duration_months, total_credits, degree_type)
VALUES 
  ('Medicina', 'MED-001', 'Carrera de Medicina General', 'uuid-coordinator', 72, 360, 'undergraduate'),
  ('Ingeniería de Sistemas', 'IS-001', 'Ingeniería en Sistemas y Computación', 'uuid-coordinator', 60, 300, 'undergraduate');
```

### Tabla: `subjects` (Materias/Disciplinas)

```sql
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  career_id INTEGER REFERENCES careers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 0,
  hours_per_week INTEGER, -- Horas de clase por semana
  total_hours INTEGER, -- Total de horas del curso
  semester INTEGER, -- Semestre en el que se dicta (1-10)
  prerequisite_subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  is_core BOOLEAN DEFAULT true, -- true = obligatoria, false = electiva
  difficulty_level VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(career_id, code)
);

-- Índices
CREATE INDEX idx_subjects_career ON subjects(career_id);
CREATE INDEX idx_subjects_semester ON subjects(career_id, semester);
CREATE INDEX idx_subjects_prerequisite ON subjects(prerequisite_subject_id);
```

**Ejemplo con prerrequisitos:**
```sql
-- Anatomía I (primer semestre, sin prerrequisitos)
INSERT INTO subjects (career_id, name, code, credits, hours_per_week, semester, is_core)
VALUES (1, 'Anatomía I', 'ANAT-101', 4, 6, 1, true)
RETURNING id; -- Retorna, por ejemplo, id = 1

-- Anatomía II (segundo semestre, requiere Anatomía I)
INSERT INTO subjects (career_id, name, code, credits, hours_per_week, semester, prerequisite_subject_id, is_core)
VALUES (1, 'Anatomía II', 'ANAT-102', 4, 6, 2, 1, true);
```

### Tabla: `subject_assignments` (Asignación Docente-Materia)

```sql
CREATE TABLE IF NOT EXISTS subject_assignments (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  academic_period VARCHAR(50) NOT NULL, -- "2025-1", "2025-2", "2025-VERANO"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Coordinador que asigna
  notes TEXT, -- Notas adicionales de la asignación
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, teacher_id, academic_period)
);

-- Índices
CREATE INDEX idx_subject_assignments_teacher ON subject_assignments(teacher_id);
CREATE INDEX idx_subject_assignments_period ON subject_assignments(academic_period);
CREATE INDEX idx_subject_assignments_status ON subject_assignments(status);
```

**Ejemplo:**
```sql
INSERT INTO subject_assignments (subject_id, teacher_id, academic_period, start_date, end_date, assigned_by)
VALUES 
  (1, 'uuid-teacher-1', '2025-1', '2025-01-15', '2025-05-30', 'uuid-coordinator'),
  (2, 'uuid-teacher-1', '2025-1', '2025-01-15', '2025-05-30', 'uuid-coordinator');
```

### Modificación a Tabla `courses` Existente

```sql
-- Agregar columnas necesarias a la tabla courses existente
ALTER TABLE courses 
  ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS academic_period VARCHAR(50),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb, -- {"monday": "08:00-10:00", "wednesday": "08:00-10:00"}
  ADD COLUMN IF NOT EXISTS max_students INTEGER,
  ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS classroom VARCHAR(100); -- Aula física o URL virtual

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_period ON courses(academic_period);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_subject ON courses(teacher_id, subject_id);
```

**Estructura de schedule (JSONB):**
```json
{
  "monday": {
    "start": "08:00",
    "end": "10:00",
    "location": "Aula 201"
  },
  "wednesday": {
    "start": "08:00",
    "end": "10:00",
    "location": "Aula 201"
  }
}
```

---

## 🎓 Tablas de Matriculación

### Tabla: `career_enrollments` (Matriculación a Carrera)

```sql
CREATE TABLE IF NOT EXISTS career_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  career_id INTEGER REFERENCES careers(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, suspended, dropped, transferred
  graduation_date DATE,
  current_semester INTEGER DEFAULT 1,
  total_credits_earned INTEGER DEFAULT 0,
  total_credits_pending INTEGER, -- Calculado dinámicamente
  gpa DECIMAL(4,2), -- Grade Point Average (0.00 - 4.00 o 0.00 - 10.00)
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, career_id)
);

-- Índices
CREATE INDEX idx_career_enrollments_student ON career_enrollments(student_id);
CREATE INDEX idx_career_enrollments_career ON career_enrollments(career_id);
CREATE INDEX idx_career_enrollments_status ON career_enrollments(status);
```

**Ejemplo:**
```sql
INSERT INTO career_enrollments (student_id, career_id, enrollment_date, current_semester)
VALUES 
  ('uuid-student-1', 1, '2024-08-15', 1),
  ('uuid-student-2', 1, '2024-08-15', 2);
```

### Tabla: `course_enrollments` (Inscripción a Materia/Curso)

```sql
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, failed, dropped, in_progress
  final_grade DECIMAL(5,2), -- Nota final (0.00 - 100.00)
  letter_grade VARCHAR(2), -- A, B, C, D, F (o equivalente)
  attendance_percentage DECIMAL(5,2) DEFAULT 0, -- 0.00 - 100.00
  participation_score DECIMAL(5,2) DEFAULT 0, -- 0.00 - 100.00
  completion_percentage DECIMAL(5,2) DEFAULT 0, -- 0.00 - 100.00
  assignments_completed INTEGER DEFAULT 0,
  assignments_total INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  quizzes_total INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0, -- Tiempo total en plataforma
  last_access_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Índices
CREATE INDEX idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_course_enrollments_completion ON course_enrollments(completion_percentage);
```

**Función para calcular porcentaje de completación:**
```sql
CREATE OR REPLACE FUNCTION calculate_course_completion(
  p_enrollment_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_completion DECIMAL(5,2);
  v_modules_completed INTEGER;
  v_modules_total INTEGER;
  v_materials_viewed INTEGER;
  v_materials_total INTEGER;
  v_assignments_completed INTEGER;
  v_assignments_total INTEGER;
BEGIN
  -- Calcular completación de módulos
  SELECT COUNT(*), COUNT(*) FILTER (WHERE mp.completed_at IS NOT NULL)
  INTO v_modules_total, v_modules_completed
  FROM course_modules cm
  LEFT JOIN module_progress mp ON mp.module_id = cm.id AND mp.enrollment_id = p_enrollment_id
  WHERE cm.course_id = (SELECT course_id FROM course_enrollments WHERE id = p_enrollment_id);
  
  -- Calcular materiales vistos (simplificado)
  SELECT COUNT(*), COUNT(DISTINCT cm.id)
  INTO v_materials_total, v_materials_viewed
  FROM course_materials cm
  WHERE cm.course_id = (SELECT course_id FROM course_enrollments WHERE id = p_enrollment_id);
  
  -- Calcular tareas completadas
  SELECT 
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT a.id) FILTER (WHERE asub.id IS NOT NULL AND asub.grade IS NOT NULL)
  INTO v_assignments_total, v_assignments_completed
  FROM assignments a
  LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id 
    AND asub.student_id = (SELECT student_id FROM course_enrollments WHERE id = p_enrollment_id)
  WHERE a.course_id = (SELECT course_id FROM course_enrollments WHERE id = p_enrollment_id);
  
  -- Calcular promedio ponderado (módulos 40%, materiales 30%, tareas 30%)
  v_completion := (
    COALESCE((v_modules_completed::DECIMAL / NULLIF(v_modules_total, 0) * 100), 0) * 0.4 +
    COALESCE((v_materials_viewed::DECIMAL / NULLIF(v_materials_total, 0) * 100), 0) * 0.3 +
    COALESCE((v_assignments_completed::DECIMAL / NULLIF(v_assignments_total, 0) * 100), 0) * 0.3
  );
  
  RETURN LEAST(v_completion, 100.00);
END;
$$ LANGUAGE plpgsql;
```

---

## 📖 Tablas de Contenido

### Tabla: `class_sessions` (Sesiones de Clase)

```sql
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES course_modules(id) ON DELETE SET NULL,
  session_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type VARCHAR(20) DEFAULT 'regular', -- regular, exam, workshop, lab, seminar
  location VARCHAR(255), -- Aula física o URL de Zoom/Meet
  description TEXT,
  learning_objectives TEXT[], -- Array de objetivos de aprendizaje
  materials_summary TEXT, -- Resumen de materiales a cubrir
  is_mandatory BOOLEAN DEFAULT true,
  recording_url TEXT, -- URL de grabación si existe
  notes TEXT, -- Notas del docente después de la clase
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, session_number)
);

-- Índices
CREATE INDEX idx_class_sessions_course ON class_sessions(course_id);
CREATE INDEX idx_class_sessions_module ON class_sessions(module_id);
CREATE INDEX idx_class_sessions_date ON class_sessions(scheduled_date);
CREATE INDEX idx_class_sessions_course_date ON class_sessions(course_id, scheduled_date);
```

**Ejemplo:**
```sql
INSERT INTO class_sessions (
  course_id, module_id, session_number, title, scheduled_date, 
  duration_minutes, session_type, location, learning_objectives, is_mandatory
)
VALUES (
  1, 5, 1, 'Introducción a la Anatomía',
  '2025-02-05 08:00:00+00', 120, 'regular', 'Aula 201',
  ARRAY['Definir anatomía', 'Identificar planos anatómicos', 'Terminología básica'],
  true
);
```

### Tabla: `attendance` (Asistencia)

```sql
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'present', -- present, absent, late, excused, partial
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  notes TEXT, -- Notas adicionales (ej: llegó 15 min tarde)
  recorded_by UUID REFERENCES users(id), -- Docente que registra
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Índices
CREATE INDEX idx_attendance_session ON attendance(session_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_student_session ON attendance(student_id, session_id);
```

### Tabla: `class_participation` (Participación en Clases)

```sql
CREATE TABLE IF NOT EXISTS class_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  participation_type VARCHAR(50), -- question, answer, discussion, activity, presentation
  participation_score DECIMAL(3,1) DEFAULT 0, -- 0.0 - 10.0
  details JSONB DEFAULT '{}'::jsonb, -- Detalles específicos
  recorded_by UUID REFERENCES users(id), -- Docente que registra
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_class_participation_session ON class_participation(session_id);
CREATE INDEX idx_class_participation_student ON class_participation(student_id);
CREATE INDEX idx_class_participation_type ON class_participation(participation_type);
```

**Estructura de details (JSONB):**
```json
{
  "question_topic": "Sistema circulatorio",
  "quality": "high",
  "contribution_length": "brief",
  "timestamp": "2025-02-05T09:15:00Z"
}
```

---

## ✅ Tablas de Evaluación

### Tabla: `module_progress` (Progreso por Módulo)

```sql
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  materials_viewed INTEGER DEFAULT 0,
  materials_total INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  first_access_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, module_id)
);

-- Índices
CREATE INDEX idx_module_progress_enrollment ON module_progress(enrollment_id);
CREATE INDEX idx_module_progress_module ON module_progress(module_id);
CREATE INDEX idx_module_progress_completion ON module_progress(completion_percentage);
```

### Tabla: `quizzes` (Quizz y Evaluaciones)

```sql
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES course_modules(id) ON DELETE SET NULL,
  session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quiz_type VARCHAR(50) DEFAULT 'formative', -- formative (antes clase), summative (después), practice, exam
  max_points DECIMAL(5,2) DEFAULT 100,
  time_limit_minutes INTEGER, -- NULL = sin límite
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,
  show_results_immediately BOOLEAN DEFAULT true,
  passing_score DECIMAL(5,2) DEFAULT 70, -- Puntaje mínimo para aprobar
  max_attempts INTEGER DEFAULT 1, -- NULL = ilimitado
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  instructions TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_quizzes_course ON quizzes(course_id);
CREATE INDEX idx_quizzes_module ON quizzes(module_id);
CREATE INDEX idx_quizzes_session ON quizzes(session_id);
CREATE INDEX idx_quizzes_type ON quizzes(quiz_type);
CREATE INDEX idx_quizzes_available ON quizzes(available_from, available_until);
```

### Tabla: `quiz_questions` (Preguntas)

```sql
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type VARCHAR(50) DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer, essay, matching
  question_text TEXT NOT NULL,
  options JSONB, -- Para multiple choice: ["Opción A", "Opción B", "Opción C", "Opción D"]
  correct_answer TEXT, -- Respuesta correcta o índice de opción correcta
  correct_answers TEXT[], -- Para respuestas múltiples correctas
  points DECIMAL(5,2) DEFAULT 1,
  explanation TEXT, -- Explicación de la respuesta correcta
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb, -- Información adicional
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_type ON quiz_questions(question_type);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);
```

**Ejemplo de pregunta múltiple:**
```json
{
  "question_type": "multiple_choice",
  "question_text": "¿Cuál es el órgano más grande del cuerpo humano?",
  "options": ["Corazón", "Pulmón", "Piel", "Hígado"],
  "correct_answer": "2", // Índice de "Piel"
  "explanation": "La piel es el órgano más grande del cuerpo humano, cubriendo toda la superficie externa."
}
```

### Tabla: `quiz_attempts` (Intentos de Quizz)

```sql
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score DECIMAL(5,2), -- Puntaje obtenido
  percentage DECIMAL(5,2), -- Porcentaje (score / max_points * 100)
  answers JSONB DEFAULT '{}'::jsonb, -- {"question_id": "answer", ...}
  time_spent_seconds INTEGER, -- Tiempo total en segundos
  is_passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1,
  review_notes TEXT, -- Notas del estudiante al revisar
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_student_quiz ON quiz_attempts(student_id, quiz_id);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at);
```

---

## 🎮 Tablas de Gamificación

### Tabla: `student_points` (Puntos del Estudiante)

```sql
CREATE TABLE IF NOT EXISTS student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  source VARCHAR(50), -- quiz, assignment, attendance, participation, bonus, streak
  source_id UUID, -- ID del quiz, assignment, etc.
  reason TEXT, -- Motivo de los puntos
  metadata JSONB DEFAULT '{}'::jsonb,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_student_points_student ON student_points(student_id);
CREATE INDEX idx_student_points_course ON student_points(course_id);
CREATE INDEX idx_student_points_source ON student_points(source);
CREATE INDEX idx_student_points_earned ON student_points(earned_at);
```

**Función para calcular puntos totales:**
```sql
CREATE OR REPLACE FUNCTION get_total_points(
  p_student_id UUID,
  p_course_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
BEGIN
  IF p_course_id IS NULL THEN
    RETURN COALESCE(SUM(points), 0)
    FROM student_points
    WHERE student_id = p_student_id;
  ELSE
    RETURN COALESCE(SUM(points), 0)
    FROM student_points
    WHERE student_id = p_student_id AND course_id = p_course_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Tabla: `achievements` (Logros/Badges)

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Nombre del icono (ej: 'star', 'trophy', 'medal')
  icon_color VARCHAR(7), -- Color hex
  points_required INTEGER DEFAULT 0,
  achievement_type VARCHAR(50), -- perfect_score, attendance_streak, early_bird, completion, participation
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL, -- NULL = logro global
  category VARCHAR(50), -- study, participation, performance, consistency
  rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejemplos de logros predefinidos
INSERT INTO achievements (title, description, icon, points_required, achievement_type, category, rarity)
VALUES
  ('Estudiante Dedicado', '7 días consecutivos de acceso a la plataforma', 'calendar', 0, 'attendance_streak', 'consistency', 'common'),
  ('Perfecto', '100% en 5 quizz consecutivos', 'star', 0, 'perfect_score', 'performance', 'rare'),
  ('Temprano', 'Entregar 3 tareas antes de fecha límite', 'clock', 0, 'early_bird', 'study', 'common'),
  ('Participativo', '10 participaciones en clases', 'message-circle', 0, 'participation', 'participation', 'common'),
  ('Voraz', 'Ver todos los materiales de un módulo', 'book', 0, 'completion', 'study', 'common'),
  ('Completo', 'Completar todos los módulos de un curso', 'trophy', 0, 'completion', 'performance', 'epic');
```

### Tabla: `student_achievements` (Logros Obtenidos)

```sql
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL, -- Para logros por curso
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT false, -- Si ya se notificó al estudiante
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, achievement_id, course_id)
);

-- Índices
CREATE INDEX idx_student_achievements_student ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement ON student_achievements(achievement_id);
CREATE INDEX idx_student_achievements_course ON student_achievements(course_id);
```

---

## 🤖 Tablas de Análisis IA

### Tabla: `student_engagement` (Seguimiento de Compromiso)

```sql
CREATE TABLE IF NOT EXISTS student_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  engagement_score DECIMAL(5,2) DEFAULT 0, -- 0.00 - 100.00
  metrics JSONB DEFAULT '{}'::jsonb, -- Métricas detalladas
  risk_level VARCHAR(20), -- low, medium, high (riesgo de deserción)
  ai_insights TEXT, -- Insights generados por IA
  ai_recommendations TEXT[], -- Recomendaciones de IA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, date)
);

-- Índices
CREATE INDEX idx_student_engagement_student ON student_engagement(student_id);
CREATE INDEX idx_student_engagement_course ON student_engagement(course_id);
CREATE INDEX idx_student_engagement_date ON student_engagement(date);
CREATE INDEX idx_student_engagement_risk ON student_engagement(risk_level);
CREATE INDEX idx_student_engagement_score ON student_engagement(engagement_score);
```

**Estructura de metrics (JSONB):**
```json
{
  "time_spent_minutes": 120,
  "materials_viewed": 5,
  "materials_total": 8,
  "assignments_submitted": 2,
  "assignments_total": 3,
  "quizzes_completed": 3,
  "quizzes_total": 5,
  "participation_count": 5,
  "tutor_interactions": 10,
  "attendance_count": 3,
  "attendance_total": 3,
  "average_quiz_score": 85.5,
  "assignment_grades_avg": 90.0
}
```

### Tabla: `ai_teacher_reports` (Reportes para Docentes)

```sql
CREATE TABLE IF NOT EXISTS ai_teacher_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  report_type VARCHAR(50), -- engagement_summary, risk_analysis, performance_prediction, intervention_suggestions
  report_date DATE DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  insights JSONB DEFAULT '{}'::jsonb, -- Análisis de IA
  recommendations JSONB DEFAULT '[]'::jsonb, -- Recomendaciones generadas
  students_at_risk JSONB DEFAULT '[]'::jsonb, -- Lista de estudiantes en riesgo
  statistics JSONB DEFAULT '{}'::jsonb, -- Estadísticas agregadas
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ai_teacher_reports_course ON ai_teacher_reports(course_id);
CREATE INDEX idx_ai_teacher_reports_type ON ai_teacher_reports(report_type);
CREATE INDEX idx_ai_teacher_reports_date ON ai_teacher_reports(report_date);
```

**Estructura de insights (JSONB):**
```json
{
  "summary": "El curso muestra buen engagement general, pero 3 estudiantes requieren atención",
  "average_engagement": 75.5,
  "engagement_trend": "improving",
  "top_performers": ["student-uuid-1", "student-uuid-2"],
  "needs_attention": ["student-uuid-3", "student-uuid-4", "student-uuid-5"],
  "class_participation_trend": "increasing",
  "assignment_completion_rate": 85.0
}
```

---

## 🔗 Relaciones y Constraints

### Foreign Keys Principales

```sql
-- Verificar integridad referencial
ALTER TABLE careers 
  ADD CONSTRAINT fk_careers_coordinator 
  FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE subjects 
  ADD CONSTRAINT fk_subjects_career 
  FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_subjects_prerequisite 
  FOREIGN KEY (prerequisite_subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE courses 
  ADD CONSTRAINT fk_courses_subject 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
```

### Constraints de Validación

```sql
-- Validar que GPA esté en rango
ALTER TABLE career_enrollments 
  ADD CONSTRAINT check_gpa_range 
  CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 10));

-- Validar que porcentajes estén en rango
ALTER TABLE course_enrollments 
  ADD CONSTRAINT check_percentages 
  CHECK (
    (attendance_percentage >= 0 AND attendance_percentage <= 100) AND
    (participation_score >= 0 AND participation_score <= 100) AND
    (completion_percentage >= 0 AND completion_percentage <= 100)
  );

-- Validar que engagement_score esté en rango
ALTER TABLE student_engagement 
  ADD CONSTRAINT check_engagement_score 
  CHECK (engagement_score >= 0 AND engagement_score <= 100);
```

---

## 📊 Vistas Útiles

### Vista: `vw_student_course_progress`

```sql
CREATE OR REPLACE VIEW vw_student_course_progress AS
SELECT 
  ce.student_id,
  ce.course_id,
  c.title as course_title,
  c.code as course_code,
  ce.completion_percentage,
  ce.attendance_percentage,
  ce.participation_score,
  ce.final_grade,
  ce.status,
  COUNT(DISTINCT cm.id) as total_modules,
  COUNT(DISTINCT mp.module_id) FILTER (WHERE mp.completed_at IS NOT NULL) as completed_modules,
  COUNT(DISTINCT a.id) as total_assignments,
  COUNT(DISTINCT asub.assignment_id) FILTER (WHERE asub.grade IS NOT NULL) as completed_assignments,
  ce.time_spent_minutes,
  ce.last_access_at
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
LEFT JOIN course_modules cm ON cm.course_id = c.id
LEFT JOIN module_progress mp ON mp.enrollment_id = ce.id AND mp.module_id = cm.id
LEFT JOIN assignments a ON a.course_id = c.id
LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ce.student_id
GROUP BY ce.id, ce.student_id, ce.course_id, c.title, c.code, ce.completion_percentage, 
         ce.attendance_percentage, ce.participation_score, ce.final_grade, ce.status, 
         ce.time_spent_minutes, ce.last_access_at;
```

### Vista: `vw_student_engagement_summary`

```sql
CREATE OR REPLACE VIEW vw_student_engagement_summary AS
SELECT 
  se.student_id,
  se.course_id,
  AVG(se.engagement_score) as avg_engagement_score,
  MAX(se.engagement_score) as max_engagement_score,
  MIN(se.engagement_score) as min_engagement_score,
  COUNT(*) as days_tracked,
  MAX(se.risk_level) as current_risk_level,
  SUM((se.metrics->>'time_spent_minutes')::INTEGER) as total_time_spent,
  AVG((se.metrics->>'average_quiz_score')::DECIMAL) as avg_quiz_score
FROM student_engagement se
GROUP BY se.student_id, se.course_id;
```

---

## 🎯 Próximos Pasos

1. **Revisar y validar** todas las tablas propuestas
2. **Crear scripts SQL** de migración incremental
3. **Implementar funciones** auxiliares necesarias
4. **Crear políticas RLS** para cada tabla
5. **Desarrollar servicios** de aplicación correspondientes

Este modelo de datos proporciona una base sólida y escalable para todo el sistema educativo propuesto.

