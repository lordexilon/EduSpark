-- 88_create_quizzes_assessments.sql
-- Sistema completo de Quizzes y Assessments

-- =====================================================
-- TABLA: assessments
-- Evaluaciones (quiz, trivia, examen, proyecto)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.course_units(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type VARCHAR(50) NOT NULL DEFAULT 'quiz', -- quiz, trivia, exam, project, assignment
    instructions TEXT,
    
    -- Configuración
    time_limit INTEGER, -- en minutos (NULL = sin límite)
    max_attempts INTEGER DEFAULT 1, -- NULL = ilimitados
    passing_score DECIMAL(5,2) DEFAULT 70.0,
    total_points DECIMAL(5,2) DEFAULT 100.0,
    
    -- Estado
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    allow_late_submission BOOLEAN DEFAULT false,
    
    -- Fechas
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100),
    CONSTRAINT valid_total_points CHECK (total_points > 0),
    CONSTRAINT valid_max_attempts CHECK (max_attempts IS NULL OR max_attempts > 0),
    CONSTRAINT valid_time_limit CHECK (time_limit IS NULL OR time_limit > 0),
    CONSTRAINT valid_dates CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from)
);

-- Índices para assessments
CREATE INDEX IF NOT EXISTS idx_assessments_course ON public.assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_unit ON public.assessments(unit_id);
CREATE INDEX IF NOT EXISTS idx_assessments_session ON public.assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON public.assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessments_published ON public.assessments(is_published);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON public.assessments(created_by);

-- =====================================================
-- TABLA: questions
-- Preguntas de un assessment
-- =====================================================

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer, essay, matching
    order_index INTEGER DEFAULT 0,
    
    -- Contenido
    options JSONB DEFAULT '[]'::jsonb, -- {id, text, correct} para opción múltiple
    correct_answer JSONB, -- Respuesta correcta (formato depende de tipo)
    explanation TEXT, -- Explicación de la respuesta correcta
    
    -- Evaluación
    points DECIMAL(5,2) DEFAULT 1.0,
    partial_credit BOOLEAN DEFAULT false, -- Permite crédito parcial
    
    -- UI
    is_required BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_question_points CHECK (points > 0)
);

-- Índices para questions
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON public.questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(assessment_id, order_index);

-- =====================================================
-- TABLA: assessment_attempts
-- Intentos de evaluación de un estudiante
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, submitted, auto_submitted, graded
    score DECIMAL(5,2), -- Puntuación obtenida
    percentage DECIMAL(5,2), -- Porcentaje del total
    is_passed BOOLEAN, -- Si alcanzó passing_score
    
    -- Tiempo
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_spent_minutes INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, assessment_id, attempt_number),
    CONSTRAINT valid_score CHECK (score IS NULL OR score >= 0),
    CONSTRAINT valid_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    CONSTRAINT valid_attempt_number CHECK (attempt_number > 0)
);

-- Índices para assessment_attempts
CREATE INDEX IF NOT EXISTS idx_attempts_student ON public.assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON public.assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_assessment ON public.assessment_attempts(student_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON public.assessment_attempts(status);

-- =====================================================
-- TABLA: question_responses
-- Respuestas a preguntas específicas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Respuesta
    response_data JSONB NOT NULL, -- Formato depende del tipo de pregunta
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) DEFAULT 0,
    
    -- Feedback
    teacher_feedback TEXT, -- Feedback manual del docente
    auto_feedback TEXT, -- Feedback automático
    
    -- Metadata
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_response_points CHECK (points_earned >= 0)
);

-- Índices para question_responses
CREATE INDEX IF NOT EXISTS idx_responses_attempt ON public.question_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON public.question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_student ON public.question_responses(student_id);

-- =====================================================
-- TRIGGERS: Actualizar updated_at automáticamente
-- =====================================================

-- Trigger para assessments
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assessments_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_assessments_updated_at();

-- Trigger para questions
CREATE OR REPLACE FUNCTION update_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION update_questions_updated_at();

-- Trigger para assessment_attempts
CREATE OR REPLACE FUNCTION update_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attempts_updated_at
    BEFORE UPDATE ON public.assessment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_attempts_updated_at();

-- =====================================================
-- FUNCIÓN: Calcular puntuación total de un intento
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_attempt_score(p_attempt_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_total_points DECIMAL(5,2);
BEGIN
    SELECT COALESCE(SUM(points_earned), 0) INTO v_total_points
    FROM public.question_responses
    WHERE attempt_id = p_attempt_id;
    
    RETURN v_total_points;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Actualizar score del intento automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_attempt_score()
RETURNS TRIGGER AS $$
DECLARE
    v_score DECIMAL(5,2);
    v_total_points DECIMAL(5,2);
    v_percentage DECIMAL(5,2);
    v_passing_score DECIMAL(5,2);
BEGIN
    -- Calcular puntuación total
    SELECT COALESCE(SUM(points_earned), 0) INTO v_score
    FROM public.question_responses
    WHERE attempt_id = NEW.attempt_id;
    
    -- Obtener puntos totales y passing score del assessment
    SELECT a.total_points, a.passing_score INTO v_total_points, v_passing_score
    FROM public.assessments a
    JOIN public.assessment_attempts at ON at.assessment_id = a.id
    WHERE at.id = NEW.attempt_id;
    
    -- Calcular porcentaje
    IF v_total_points > 0 THEN
        v_percentage := (v_score / v_total_points) * 100;
    ELSE
        v_percentage := 0;
    END IF;
    
    -- Actualizar el intento
    UPDATE public.assessment_attempts
    SET 
        score = v_score,
        percentage = v_percentage,
        is_passed = (v_percentage >= v_passing_score),
        updated_at = NOW()
    WHERE id = NEW.attempt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attempt_score
    AFTER INSERT OR UPDATE OF points_earned ON public.question_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_attempt_score();

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA ASSESSMENTS
-- =====================================================

-- Estudiantes: pueden ver assessments publicados de cursos inscritos
DROP POLICY IF EXISTS "students_view_published_assessments" ON public.assessments;
CREATE POLICY "students_view_published_assessments"
    ON public.assessments FOR SELECT
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1
            FROM public.course_enrollments ce
            WHERE ce.course_id = assessments.course_id
              AND ce.student_id = auth.uid()
              AND ce.status = 'active'
        )
    );

-- Docentes: pueden gestionar assessments de sus cursos
DROP POLICY IF EXISTS "teachers_manage_course_assessments" ON public.assessments;
CREATE POLICY "teachers_manage_course_assessments"
    ON public.assessments FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE c.id = assessments.course_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Admins: acceso total
DROP POLICY IF EXISTS "admins_all_assessments" ON public.assessments;
CREATE POLICY "admins_all_assessments"
    ON public.assessments FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- POLÍTICAS PARA QUESTIONS
-- =====================================================

-- Estudiantes: pueden ver questions de assessments publicados
DROP POLICY IF EXISTS "students_view_assessment_questions" ON public.questions;
CREATE POLICY "students_view_assessment_questions"
    ON public.questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.assessments a
            WHERE a.id = questions.assessment_id
              AND a.is_published = true
              AND EXISTS (
                  SELECT 1
                  FROM public.course_enrollments ce
                  WHERE ce.course_id = a.course_id
                    AND ce.student_id = auth.uid()
                    AND ce.status = 'active'
              )
        )
    );

-- Docentes: pueden gestionar questions de sus cursos
DROP POLICY IF EXISTS "teachers_manage_assessment_questions" ON public.questions;
CREATE POLICY "teachers_manage_assessment_questions"
    ON public.questions FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.assessments a
            JOIN public.courses c ON c.id = a.course_id
            WHERE a.id = questions.assessment_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Admins: acceso total
DROP POLICY IF EXISTS "admins_all_questions" ON public.questions;
CREATE POLICY "admins_all_questions"
    ON public.questions FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- POLÍTICAS PARA ASSESSMENT_ATTEMPTS
-- =====================================================

-- Estudiantes: pueden ver y gestionar sus propios intentos
DROP POLICY IF EXISTS "students_manage_own_attempts" ON public.assessment_attempts;
CREATE POLICY "students_manage_own_attempts"
    ON public.assessment_attempts FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Docentes: pueden ver intentos de sus cursos
DROP POLICY IF EXISTS "teachers_view_course_attempts" ON public.assessment_attempts;
CREATE POLICY "teachers_view_course_attempts"
    ON public.assessment_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.assessments a
            JOIN public.courses c ON c.id = a.course_id
            WHERE a.id = assessment_attempts.assessment_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Admins: acceso total
DROP POLICY IF EXISTS "admins_all_attempts" ON public.assessment_attempts;
CREATE POLICY "admins_all_attempts"
    ON public.assessment_attempts FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- POLÍTICAS PARA QUESTION_RESPONSES
-- =====================================================

-- Estudiantes: pueden ver y gestionar sus propias respuestas
DROP POLICY IF EXISTS "students_manage_own_responses" ON public.question_responses;
CREATE POLICY "students_manage_own_responses"
    ON public.question_responses FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Docentes: pueden ver respuestas de sus cursos
DROP POLICY IF EXISTS "teachers_view_course_responses" ON public.question_responses;
CREATE POLICY "teachers_view_course_responses"
    ON public.question_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.assessment_attempts at
            JOIN public.assessments a ON a.id = at.assessment_id
            JOIN public.courses c ON c.id = a.course_id
            WHERE at.id = question_responses.attempt_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Admins: acceso total
DROP POLICY IF EXISTS "admins_all_responses" ON public.question_responses;
CREATE POLICY "admins_all_responses"
    ON public.question_responses FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    'Tablas creadas exitosamente' as status,
    COUNT(*) FILTER (WHERE table_name = 'assessments') as assessments_exists,
    COUNT(*) FILTER (WHERE table_name = 'questions') as questions_exists,
    COUNT(*) FILTER (WHERE table_name = 'assessment_attempts') as attempts_exists,
    COUNT(*) FILTER (WHERE table_name = 'question_responses') as responses_exists
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('assessments', 'questions', 'assessment_attempts', 'question_responses');

SELECT 
    'Políticas RLS creadas exitosamente' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('assessments', 'questions', 'assessment_attempts', 'question_responses')
  AND schemaname = 'public';

