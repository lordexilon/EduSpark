-- 103_create_flashcards_system.sql
-- Sistema de Flashcards Interactivas con Integración a Calificaciones y Progreso
-- Fecha: Enero 2025

-- =====================================================
-- TABLA: flashcards
-- =====================================================

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Contenido del frente
    front_text TEXT,
    front_image_url TEXT, -- URL en Supabase Storage
    
    -- Contenido del reverso
    back_text TEXT NOT NULL,
    back_image_url TEXT,
    
    -- Metadatos
    title VARCHAR(255),
    tags TEXT[],
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- Ponderación para calificaciones (opcional)
    points_value DECIMAL(5,2) DEFAULT 0, -- Puntos que vale dominar esta flashcard
    
    -- Relaciones
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuración
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para flashcards
CREATE INDEX IF NOT EXISTS idx_flashcards_course ON flashcards(course_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_unit ON flashcards(unit_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_session ON flashcards(session_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_by ON flashcards(created_by);
CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON flashcards USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_flashcards_active ON flashcards(is_active) WHERE is_active = true;

-- =====================================================
-- TABLA: flashcard_progress
-- Sistema de Spaced Repetition (SM-2)
-- =====================================================

CREATE TABLE IF NOT EXISTS flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    
    -- Nivel de dominio (0-5)
    -- 0 = No visto
    -- 1 = Muy difícil
    -- 2 = Difícil
    -- 3 = Regular
    -- 4 = Fácil
    -- 5 = Dominado
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
    
    -- Estadísticas
    times_studied INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    
    -- Spaced Repetition (Algoritmo SM-2)
    ease_factor DECIMAL(3, 2) DEFAULT 2.5 CHECK (ease_factor >= 1.3),
    interval_days INTEGER DEFAULT 1 CHECK (interval_days >= 1),
    repetitions INTEGER DEFAULT 0 CHECK (repetitions >= 0),
    
    -- Fechas
    last_studied_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ, -- Calculado con Spaced Repetition
    last_correct_at TIMESTAMPTZ,
    mastered_at TIMESTAMPTZ, -- Cuando alcanza mastery_level = 5
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint único
    UNIQUE(student_id, flashcard_id)
);

-- Índices para flashcard_progress
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_student ON flashcard_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_flashcard ON flashcard_progress(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON flashcard_progress(next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_mastery ON flashcard_progress(mastery_level);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_student_course ON flashcard_progress(student_id, flashcard_id);

-- =====================================================
-- INTEGRACIÓN CON SISTEMA DE CALIFICACIONES
-- Agregar ponderación de flashcards a subject_grading_weights
-- =====================================================

-- Agregar columna de ponderación de flashcards si no existe
DO $$ 
BEGIN
    -- Verificar si existe la tabla subject_grading_weights
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subject_grading_weights'
    ) THEN
        -- Agregar columna si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'subject_grading_weights' 
            AND column_name = 'flashcards_weight'
        ) THEN
            ALTER TABLE public.subject_grading_weights 
            ADD COLUMN flashcards_weight DECIMAL(5,2) DEFAULT 0.00;
            
            -- Actualizar constraint para incluir flashcards_weight
            ALTER TABLE public.subject_grading_weights 
            DROP CONSTRAINT IF EXISTS weights_sum_check;
            
            ALTER TABLE public.subject_grading_weights 
            ADD CONSTRAINT weights_sum_check CHECK (
                ABS((quizzes_weight + exam1_weight + exam2_weight + final_exam_weight + COALESCE(flashcards_weight, 0)) - 100.00) < 0.01
            );
        END IF;
    -- Si no existe subject_grading_weights, verificar course_grading_weights
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'course_grading_weights'
    ) THEN
        -- Agregar columna si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'course_grading_weights' 
            AND column_name = 'flashcards_weight'
        ) THEN
            ALTER TABLE public.course_grading_weights 
            ADD COLUMN flashcards_weight DECIMAL(5,2) DEFAULT 0.00;
            
            -- Actualizar constraint para incluir flashcards_weight
            ALTER TABLE public.course_grading_weights 
            DROP CONSTRAINT IF EXISTS weights_sum_check;
            
            ALTER TABLE public.course_grading_weights 
            ADD CONSTRAINT weights_sum_check CHECK (
                ABS((quizzes_weight + exam1_weight + exam2_weight + final_exam_weight + COALESCE(flashcards_weight, 0)) - 100.00) < 0.01
            );
        END IF;
    END IF;
END $$;

-- Comentarios
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subject_grading_weights'
    ) THEN
        EXECUTE 'COMMENT ON COLUMN public.subject_grading_weights.flashcards_weight IS ''Porcentaje que representan las flashcards dominadas (0% por defecto, opcional)''';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'course_grading_weights'
    ) THEN
        EXECUTE 'COMMENT ON COLUMN public.course_grading_weights.flashcards_weight IS ''Porcentaje que representan las flashcards dominadas (0% por defecto, opcional)''';
    END IF;
END $$;

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_flashcard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para flashcards
DROP TRIGGER IF EXISTS trigger_flashcard_updated_at ON flashcards;
CREATE TRIGGER trigger_flashcard_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_updated_at();

-- Trigger para flashcard_progress
DROP TRIGGER IF EXISTS trigger_flashcard_progress_updated_at ON flashcard_progress;
CREATE TRIGGER trigger_flashcard_progress_updated_at
    BEFORE UPDATE ON flashcard_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_updated_at();

-- Función para calcular próxima revisión (Spaced Repetition SM-2)
CREATE OR REPLACE FUNCTION calculate_next_review(
    p_quality INTEGER, -- 0-5 (0=muy difícil, 5=fácil)
    p_current_ease DECIMAL,
    p_current_interval INTEGER,
    p_current_repetitions INTEGER
)
RETURNS TABLE(
    new_ease DECIMAL,
    new_interval INTEGER,
    new_repetitions INTEGER,
    next_review_date TIMESTAMPTZ
) AS $$
DECLARE
    v_new_ease DECIMAL;
    v_new_interval INTEGER;
    v_new_repetitions INTEGER;
BEGIN
    -- Calcular nuevo ease factor
    v_new_ease := p_current_ease + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    IF v_new_ease < 1.3 THEN
        v_new_ease := 1.3;
    END IF;
    
    -- Calcular nuevo intervalo y repeticiones
    IF p_quality < 3 THEN
        -- Respuesta incorrecta: reiniciar
        v_new_interval := 1;
        v_new_repetitions := 0;
    ELSE
        -- Respuesta correcta
        IF p_current_repetitions = 0 THEN
            v_new_interval := 1;
        ELSIF p_current_repetitions = 1 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(p_current_interval * v_new_ease)::INTEGER;
        END IF;
        v_new_repetitions := p_current_repetitions + 1;
    END IF;
    
    -- Calcular próxima fecha de revisión
    RETURN QUERY SELECT 
        v_new_ease, 
        v_new_interval, 
        v_new_repetitions,
        NOW() + (v_new_interval || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular porcentaje de flashcards dominadas por estudiante en un curso
CREATE OR REPLACE FUNCTION calculate_flashcard_mastery_percentage(
    p_student_id UUID,
    p_course_id INTEGER
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_total INTEGER;
    v_mastered INTEGER;
    v_percentage DECIMAL(5,2);
BEGIN
    -- Contar total de flashcards activas en el curso
    SELECT COUNT(*) INTO v_total
    FROM flashcards
    WHERE course_id = p_course_id
    AND is_active = true;
    
    -- Si no hay flashcards, retornar 0
    IF v_total = 0 THEN
        RETURN 0.00;
    END IF;
    
    -- Contar flashcards dominadas (mastery_level >= 4)
    SELECT COUNT(*) INTO v_mastered
    FROM flashcard_progress fp
    JOIN flashcards f ON f.id = fp.flashcard_id
    WHERE fp.student_id = p_student_id
    AND f.course_id = p_course_id
    AND f.is_active = true
    AND fp.mastery_level >= 4;
    
    -- Calcular porcentaje
    v_percentage := (v_mastered::DECIMAL / v_total::DECIMAL) * 100.00;
    
    RETURN COALESCE(v_percentage, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Función para calcular puntos de flashcards dominadas
CREATE OR REPLACE FUNCTION calculate_flashcard_points(
    p_student_id UUID,
    p_course_id INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total_points DECIMAL(10,2);
BEGIN
    -- Sumar puntos de flashcards dominadas (mastery_level >= 4)
    SELECT COALESCE(SUM(f.points_value), 0) INTO v_total_points
    FROM flashcard_progress fp
    JOIN flashcards f ON f.id = fp.flashcard_id
    WHERE fp.student_id = p_student_id
    AND f.course_id = p_course_id
    AND f.is_active = true
    AND fp.mastery_level >= 4;
    
    RETURN COALESCE(v_total_points, 0.00);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para flashcards

-- Docentes pueden ver/editar sus propias flashcards
CREATE POLICY "Teachers can manage their own flashcards"
    ON flashcards FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Docentes pueden ver flashcards de sus cursos
CREATE POLICY "Teachers can view flashcards in their courses"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = flashcards.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Estudiantes pueden ver flashcards de sus cursos inscritos
CREATE POLICY "Students can view flashcards in enrolled courses"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = flashcards.course_id
            AND ce.student_id = auth.uid()
        )
    );

-- Políticas RLS para flashcard_progress

-- Estudiantes pueden ver/editar su propio progreso
CREATE POLICY "Students can manage their own progress"
    ON flashcard_progress FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Docentes pueden ver progreso de sus estudiantes
CREATE POLICY "Teachers can view progress in their courses"
    ON flashcard_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM flashcards f
            JOIN courses c ON c.id = f.course_id
            WHERE f.id = flashcard_progress.flashcard_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores y coordinadores pueden ver todo
CREATE POLICY "Admins can view all flashcards"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Admins can view all flashcard progress"
    ON flashcard_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'coordinator')
        )
    );

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE flashcards IS 'Sistema de flashcards interactivas para aprendizaje con imágenes';
COMMENT ON TABLE flashcard_progress IS 'Progreso de estudiantes con flashcards usando Spaced Repetition (SM-2)';
COMMENT ON COLUMN flashcards.points_value IS 'Puntos que vale dominar esta flashcard (para calificaciones)';
COMMENT ON COLUMN flashcard_progress.mastery_level IS 'Nivel de dominio: 0=No visto, 1-2=Difícil, 3=Regular, 4-5=Dominado';
COMMENT ON COLUMN flashcard_progress.ease_factor IS 'Factor de facilidad para Spaced Repetition (SM-2)';
COMMENT ON COLUMN flashcard_progress.next_review_at IS 'Fecha calculada para próxima revisión usando algoritmo SM-2';

