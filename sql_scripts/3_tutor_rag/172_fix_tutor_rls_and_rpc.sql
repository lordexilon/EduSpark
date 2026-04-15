-- 172_fix_tutor_rls_and_rpc.sql
-- Corrección de políticas RLS y optimización de funciones para control de presupuesto

-- 1. Corregir RLS para tutor_usage_limits
-- Permitir que los docentes gestionen los límites de sus propios cursos
DROP POLICY IF EXISTS "Admins can manage all limits" ON tutor_usage_limits;
DROP POLICY IF EXISTS "Teachers can manage limits for their courses" ON tutor_usage_limits;

-- 1. Políticas RLS para tutor_usage_limits (Gestión de Presupuesto)
-- Eliminar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "Admins can manage all limits" ON tutor_usage_limits;
DROP POLICY IF EXISTS "Admins and coordinators can manage all limits" ON tutor_usage_limits;
DROP POLICY IF EXISTS "Teachers can manage limits for their courses" ON tutor_usage_limits;
DROP POLICY IF EXISTS "Teachers can view limits in their courses" ON tutor_usage_limits;

-- Permitir a Administradores y Coordinadores gestionar todo
CREATE POLICY "Admins and coordinators manage all limits"
    ON tutor_usage_limits FOR ALL
    USING (public.is_admin_or_coordinator())
    WITH CHECK (public.is_admin_or_coordinator());

-- Permitir a Docentes gestionar límites de sus propios cursos
CREATE POLICY "Teachers manage limits for their courses"
    ON tutor_usage_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = tutor_usage_limits.course_id
            AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = tutor_usage_limits.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Permitir ver límites globales (ej. mensuales por defecto del sistema)
CREATE POLICY "Everyone can view global limits"
    ON tutor_usage_limits FOR SELECT
    USING (course_id IS NULL AND user_id IS NULL);

-- 2. Asegurar que las funciones de tracking tengan SECURITY DEFINER
-- Esto evita errores de RLS cuando el sistema registra costos automáticamente
ALTER FUNCTION track_tutor_interaction_cost(UUID, NUMERIC, INTEGER) SECURITY DEFINER;
ALTER FUNCTION check_tutor_cost_limit(UUID, NUMERIC) SECURITY DEFINER;
ALTER FUNCTION get_user_cost_stats(UUID) SECURITY DEFINER;

-- 3. Crear función agregada para obtener costos de un curso (Evita N+1 en el frontend)
CREATE OR REPLACE FUNCTION get_course_usage_stats(p_course_id INTEGER)
RETURNS TABLE (
    total_monthly_cost NUMERIC,
    total_daily_cost NUMERIC,
    total_interactions_month BIGINT,
    total_interactions_today BIGINT,
    total_tokens_month BIGINT,
    monthly_projection NUMERIC
) AS $$
DECLARE
    v_days_in_month INTEGER;
    v_current_day INTEGER;
BEGIN
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;
    v_current_day := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

    RETURN QUERY
    SELECT
        COALESCE(SUM(cost), 0)::NUMERIC as total_monthly_cost,
        COALESCE(SUM(CASE WHEN created_at::DATE = CURRENT_DATE THEN cost ELSE 0 END), 0)::NUMERIC as total_daily_cost,
        COUNT(*)::BIGINT as total_interactions_month,
        COUNT(CASE WHEN created_at::DATE = CURRENT_DATE THEN 1 END)::BIGINT as total_interactions_today,
        COALESCE(SUM(tokens_used), 0)::BIGINT as total_tokens_month,
        CASE 
            WHEN v_current_day > 0 THEN (COALESCE(SUM(cost), 0)::NUMERIC / v_current_day) * v_days_in_month
            ELSE 0
        END as monthly_projection
    FROM tutor_interactions
    WHERE course_id = p_course_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_course_usage_stats IS 'Obtiene estadísticas agregadas de uso y costo del tutor para un curso completo en el mes actual';
