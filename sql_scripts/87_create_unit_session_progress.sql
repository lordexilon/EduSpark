-- 87_create_unit_session_progress.sql
-- Tablas para tracking de progreso por unidad y sesión

-- =====================================================
-- TABLA: unit_progress
-- Track progreso de estudiante por unidad
-- =====================================================

CREATE TABLE IF NOT EXISTS public.unit_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    -- Estado de progreso
    is_completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Tracking temporal
    first_accessed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, unit_id),
    CONSTRAINT valid_unit_progress_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT valid_unit_progress_time CHECK (time_spent_minutes >= 0)
);

-- Índices para unit_progress
CREATE INDEX IF NOT EXISTS idx_unit_progress_student ON public.unit_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_unit ON public.unit_progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_course ON public.unit_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_unit_progress_student_course ON public.unit_progress(student_id, course_id);

-- =====================================================
-- TABLA: session_progress
-- Track progreso de estudiante por sesión
-- =====================================================

CREATE TABLE IF NOT EXISTS public.session_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.course_units(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    -- Estado de progreso
    is_completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Actividades completadas
    activities_completed INTEGER DEFAULT 0,
    total_activities INTEGER DEFAULT 0,
    
    -- Tracking temporal
    first_accessed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, session_id),
    CONSTRAINT valid_session_progress_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT valid_session_progress_time CHECK (time_spent_minutes >= 0),
    CONSTRAINT valid_session_progress_activities CHECK (activities_completed >= 0 AND total_activities >= 0 AND activities_completed <= total_activities)
);

-- Índices para session_progress
CREATE INDEX IF NOT EXISTS idx_session_progress_student ON public.session_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_session ON public.session_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_unit ON public.session_progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_course ON public.session_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_student_course ON public.session_progress(student_id, course_id);

-- =====================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =====================================================

-- Trigger para unit_progress
CREATE OR REPLACE FUNCTION update_unit_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unit_progress_updated_at
    BEFORE UPDATE ON public.unit_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_progress_updated_at();

-- Trigger para session_progress
CREATE OR REPLACE FUNCTION update_session_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_session_progress_updated_at
    BEFORE UPDATE ON public.session_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_session_progress_updated_at();

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en unit_progress
ALTER TABLE public.unit_progress ENABLE ROW LEVEL SECURITY;

-- Política para estudiantes: pueden ver y gestionar su propio progreso
DROP POLICY IF EXISTS "students_manage_own_unit_progress" ON public.unit_progress;
CREATE POLICY "students_manage_own_unit_progress"
    ON public.unit_progress
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Política para docentes: pueden ver progreso de estudiantes en sus cursos
DROP POLICY IF EXISTS "teachers_view_course_unit_progress" ON public.unit_progress;
CREATE POLICY "teachers_view_course_unit_progress"
    ON public.unit_progress
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE c.id = unit_progress.course_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Política para admins: acceso total
DROP POLICY IF EXISTS "admins_all_unit_progress" ON public.unit_progress;
CREATE POLICY "admins_all_unit_progress"
    ON public.unit_progress
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Habilitar RLS en session_progress
ALTER TABLE public.session_progress ENABLE ROW LEVEL SECURITY;

-- Política para estudiantes: pueden ver y gestionar su propio progreso
DROP POLICY IF EXISTS "students_manage_own_session_progress" ON public.session_progress;
CREATE POLICY "students_manage_own_session_progress"
    ON public.session_progress
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Política para docentes: pueden ver progreso de estudiantes en sus cursos
DROP POLICY IF EXISTS "teachers_view_course_session_progress" ON public.session_progress;
CREATE POLICY "teachers_view_course_session_progress"
    ON public.session_progress
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE c.id = session_progress.course_id
              AND c.teacher_id = auth.uid()
        )
    );

-- Política para admins: acceso total
DROP POLICY IF EXISTS "admins_all_session_progress" ON public.session_progress;
CREATE POLICY "admins_all_session_progress"
    ON public.session_progress
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- FUNCIÓN: Actualizar progreso del curso automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_course_completion_from_units()
RETURNS TRIGGER AS $$
DECLARE
    v_total_units INTEGER;
    v_completed_units INTEGER;
    v_new_completion DECIMAL(5,2);
BEGIN
    -- Calcular total de unidades del curso
    SELECT COUNT(*) INTO v_total_units
    FROM public.course_units
    WHERE course_id = NEW.course_id;
    
    -- Calcular unidades completadas (con is_completed = true)
    SELECT COUNT(*) INTO v_completed_units
    FROM public.unit_progress
    WHERE course_id = NEW.course_id
      AND student_id = NEW.student_id
      AND is_completed = true;
    
    -- Calcular nuevo porcentaje de completitud
    IF v_total_units > 0 THEN
        v_new_completion := (v_completed_units::DECIMAL / v_total_units::DECIMAL) * 100;
    ELSE
        v_new_completion := 0;
    END IF;
    
    -- Actualizar enrollment del curso
    UPDATE public.course_enrollments
    SET completion_percentage = v_new_completion,
        updated_at = NOW()
    WHERE student_id = NEW.student_id
      AND course_id = NEW.course_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que actualiza completion del curso cuando cambia el progreso de una unidad
CREATE TRIGGER trigger_update_course_completion
    AFTER UPDATE OF is_completed ON public.unit_progress
    FOR EACH ROW
    WHEN (OLD.is_completed IS DISTINCT FROM NEW.is_completed)
    EXECUTE FUNCTION update_course_completion_from_units();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    'Tablas creadas exitosamente' as status,
    COUNT(*) FILTER (WHERE table_name = 'unit_progress') as unit_progress_exists,
    COUNT(*) FILTER (WHERE table_name = 'session_progress') as session_progress_exists
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('unit_progress', 'session_progress');

SELECT 
    'Políticas RLS creadas exitosamente' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('unit_progress', 'session_progress')
  AND schemaname = 'public';

