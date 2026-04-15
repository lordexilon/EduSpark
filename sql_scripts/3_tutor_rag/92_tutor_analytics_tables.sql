-- 92_tutor_analytics_tables.sql
-- Script para crear tablas de analytics y tracking del Tutor IA
-- Permite a docentes y administradores evaluar el desempeño del curso y por estudiante

-- Tabla para tracking de interacciones del tutor
CREATE TABLE IF NOT EXISTS tutor_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    tokens_used INTEGER,
    cost DECIMAL(10, 6),
    model TEXT DEFAULT 'gemini-1.5-flash',
    response_time_ms INTEGER,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5), -- 1-5 (opcional, futuro)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para métricas de desempeño del estudiante
CREATE TABLE IF NOT EXISTS student_tutor_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,
    average_response_time_ms INTEGER,
    topics_covered TEXT[],
    performance_improvement DECIMAL(5, 2), -- % de mejora
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, period_start)
);

-- Tabla para configuración de límites
CREATE TABLE IF NOT EXISTS tutor_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = límite global
    limit_type TEXT NOT NULL CHECK (limit_type IN ('daily_cost', 'monthly_cost', 'tokens_per_day', 'tokens_per_month')),
    limit_value DECIMAL(10, 6) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_student ON tutor_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_course ON tutor_interactions(course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_created ON tutor_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_conversation ON tutor_interactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_lookup ON student_tutor_performance(student_id, course_id, period_start);
CREATE INDEX IF NOT EXISTS idx_student_performance_course ON student_tutor_performance(course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_limits_course ON tutor_usage_limits(course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_limits_user ON tutor_usage_limits(user_id);

-- Habilitar RLS
ALTER TABLE tutor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tutor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_usage_limits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tutor_interactions
-- Estudiantes pueden ver sus propias interacciones
CREATE POLICY "Students can view their own tutor interactions"
    ON tutor_interactions FOR SELECT
    USING (auth.uid() = student_id);

-- Docentes pueden ver interacciones de sus cursos
CREATE POLICY "Teachers can view interactions in their courses"
    ON tutor_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = tutor_interactions.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Administradores pueden ver todas las interacciones
CREATE POLICY "Admins can view all tutor interactions"
    ON tutor_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Sistema puede insertar interacciones (se hará desde el backend con service role)
CREATE POLICY "System can insert tutor interactions"
    ON tutor_interactions FOR INSERT
    WITH CHECK (true);

-- Políticas RLS para student_tutor_performance
-- Docentes pueden ver métricas de sus cursos
CREATE POLICY "Teachers can view performance metrics in their courses"
    ON student_tutor_performance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = student_tutor_performance.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Administradores pueden ver todas las métricas
CREATE POLICY "Admins can view all performance metrics"
    ON student_tutor_performance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Políticas RLS para tutor_usage_limits
-- Docentes pueden ver límites de sus cursos
CREATE POLICY "Teachers can view limits in their courses"
    ON tutor_usage_limits FOR SELECT
    USING (
        course_id IS NULL OR EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = tutor_usage_limits.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Administradores pueden gestionar todos los límites
CREATE POLICY "Admins can manage all limits"
    ON tutor_usage_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- Función para actualizar métricas de desempeño automáticamente
CREATE OR REPLACE FUNCTION update_student_tutor_performance()
RETURNS TRIGGER AS $$
DECLARE
    period_start_date DATE;
    period_end_date DATE;
BEGIN
    -- Calcular período mensual
    period_start_date := DATE_TRUNC('month', NEW.created_at)::DATE;
    period_end_date := (DATE_TRUNC('month', NEW.created_at) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Insertar o actualizar métricas
    INSERT INTO student_tutor_performance (
        student_id,
        course_id,
        period_start,
        period_end,
        total_interactions,
        total_tokens_used,
        total_cost,
        average_response_time_ms,
        updated_at
    )
    VALUES (
        NEW.student_id,
        NEW.course_id,
        period_start_date,
        period_end_date,
        1,
        COALESCE(NEW.tokens_used, 0),
        COALESCE(NEW.cost, 0),
        COALESCE(NEW.response_time_ms, 0),
        NOW()
    )
    ON CONFLICT (student_id, course_id, period_start)
    DO UPDATE SET
        total_interactions = student_tutor_performance.total_interactions + 1,
        total_tokens_used = student_tutor_performance.total_tokens_used + COALESCE(NEW.tokens_used, 0),
        total_cost = student_tutor_performance.total_cost + COALESCE(NEW.cost, 0),
        average_response_time_ms = (
            (student_tutor_performance.average_response_time_ms * (student_tutor_performance.total_interactions - 1) + 
             COALESCE(NEW.response_time_ms, 0)) / student_tutor_performance.total_interactions
        ),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar métricas automáticamente
DROP TRIGGER IF EXISTS trigger_update_student_performance ON tutor_interactions;
CREATE TRIGGER trigger_update_student_performance
    AFTER INSERT ON tutor_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_student_tutor_performance();

-- Comentarios
COMMENT ON TABLE tutor_interactions IS 'Registro detallado de todas las interacciones con el Tutor IA';
COMMENT ON TABLE student_tutor_performance IS 'Métricas agregadas de desempeño de estudiantes con el Tutor IA por período';
COMMENT ON TABLE tutor_usage_limits IS 'Configuración de límites de uso del Tutor IA por curso o usuario';

