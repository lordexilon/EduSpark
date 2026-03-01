-- =====================================================
-- CONTROL DE PRESUPUESTO: MÁXIMO $50/MES PARA TUTOR
-- Complementa el límite de tiempo (180 min/día)
-- =====================================================

-- =====================================================
-- 1. TABLA: tutor_cost_tracking
-- Tracking diario y mensual de costos del tutor
-- =====================================================

CREATE TABLE IF NOT EXISTS tutor_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_cost NUMERIC(10, 6) DEFAULT 0,
    monthly_cost NUMERIC(10, 6) DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tracking_date)
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_tutor_cost_user_date ON tutor_cost_tracking(user_id, tracking_date);
CREATE INDEX IF NOT EXISTS idx_tutor_cost_institution_date ON tutor_cost_tracking(institution_id, tracking_date);
CREATE INDEX IF NOT EXISTS idx_tutor_cost_date ON tutor_cost_tracking(tracking_date);

-- =====================================================
-- 2. TABLA: tutor_cost_limits
-- Límites de costo configurables por usuario o institución
-- =====================================================

CREATE TABLE IF NOT EXISTS tutor_cost_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    daily_cost_limit NUMERIC(10, 2) DEFAULT 2.00, -- $2/día = ~$60/mes (más seguro que $50)
    monthly_cost_limit NUMERIC(10, 2) DEFAULT 50.00, -- $50/mes (objetivo)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices únicos parciales para garantizar solo un límite activo por usuario o institución
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_cost_limits_user_active 
    ON tutor_cost_limits(user_id) 
    WHERE is_active = true AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_cost_limits_institution_active 
    ON tutor_cost_limits(institution_id) 
    WHERE is_active = true AND institution_id IS NOT NULL;

-- Índices adicionales para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tutor_cost_limits_user ON tutor_cost_limits(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tutor_cost_limits_institution ON tutor_cost_limits(institution_id) WHERE is_active = true;

-- =====================================================
-- 3. FUNCIÓN: check_tutor_cost_limit
-- Verifica si un usuario puede realizar una interacción
-- basado en límites de costo mensual
-- =====================================================

CREATE OR REPLACE FUNCTION check_tutor_cost_limit(
    p_user_id UUID,
    p_estimated_cost NUMERIC
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_monthly_cost NUMERIC,
    remaining_budget NUMERIC,
    limit_exceeded BOOLEAN,
    monthly_limit NUMERIC,
    daily_cost_today NUMERIC,
    monthly_cost_projection NUMERIC
) AS $$
DECLARE
    v_monthly_limit NUMERIC;
    v_institution_id INTEGER;
    v_current_monthly_cost NUMERIC;
    v_daily_cost_today NUMERIC;
    v_remaining NUMERIC;
    v_days_in_month INTEGER;
    v_monthly_projection NUMERIC;
BEGIN
    -- Obtener institución del usuario
    SELECT ui.institution_id INTO v_institution_id
    FROM user_institutions ui
    WHERE ui.user_id = p_user_id AND ui.is_primary = true
    LIMIT 1;

    -- Obtener límite mensual (prioridad: usuario > institución > default)
    SELECT COALESCE(
        (SELECT monthly_cost_limit FROM tutor_cost_limits 
         WHERE user_id = p_user_id AND is_active = true LIMIT 1),
        (SELECT monthly_cost_limit FROM tutor_cost_limits 
         WHERE institution_id = v_institution_id AND is_active = true LIMIT 1),
        50.00 -- Default: $50/mes
    ) INTO v_monthly_limit;

    -- Calcular costo mensual actual (suma de todos los días del mes actual)
    SELECT COALESCE(SUM(daily_cost), 0)
    FROM tutor_cost_tracking
    WHERE user_id = p_user_id
      AND DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE)
    INTO v_current_monthly_cost;

    -- Calcular costo diario de hoy
    SELECT COALESCE(daily_cost, 0)
    FROM tutor_cost_tracking
    WHERE user_id = p_user_id
      AND tracking_date = CURRENT_DATE
    INTO v_daily_cost_today;

    -- Calcular proyección mensual basada en el promedio diario
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'));
    v_monthly_projection := CASE 
        WHEN CURRENT_DATE = DATE_TRUNC('month', CURRENT_DATE) THEN v_daily_cost_today * v_days_in_month
        ELSE (v_current_monthly_cost / EXTRACT(DAY FROM CURRENT_DATE)) * v_days_in_month
    END;

    v_remaining := v_monthly_limit - v_current_monthly_cost;
    
    RETURN QUERY SELECT
        (v_remaining >= p_estimated_cost) as allowed,
        v_current_monthly_cost,
        GREATEST(0, v_remaining) as remaining_budget,
        (v_remaining < p_estimated_cost) as limit_exceeded,
        v_monthly_limit,
        v_daily_cost_today,
        v_monthly_projection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCIÓN: track_tutor_interaction_cost
-- Registra el costo real de una interacción
-- =====================================================

CREATE OR REPLACE FUNCTION track_tutor_interaction_cost(
    p_user_id UUID,
    p_cost NUMERIC,
    p_tokens_used INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_institution_id INTEGER;
    v_month_start DATE;
BEGIN
    -- Obtener institución del usuario
    SELECT ui.institution_id INTO v_institution_id
    FROM user_institutions ui
    WHERE ui.user_id = p_user_id AND ui.is_primary = true
    LIMIT 1;

    v_month_start := DATE_TRUNC('month', CURRENT_DATE);

    -- Insertar o actualizar tracking diario
    INSERT INTO tutor_cost_tracking (
        user_id,
        institution_id,
        tracking_date,
        daily_cost,
        monthly_cost,
        total_interactions,
        total_tokens_used
    )
    VALUES (
        p_user_id,
        v_institution_id,
        v_today,
        p_cost,
        p_cost, -- Se actualizará después
        1,
        p_tokens_used
    )
    ON CONFLICT (user_id, tracking_date) DO UPDATE SET
        daily_cost = tutor_cost_tracking.daily_cost + p_cost,
        total_interactions = tutor_cost_tracking.total_interactions + 1,
        total_tokens_used = tutor_cost_tracking.total_tokens_used + p_tokens_used,
        updated_at = CURRENT_TIMESTAMP;

    -- Actualizar costo mensual acumulado (suma de todos los días del mes)
    UPDATE tutor_cost_tracking
    SET monthly_cost = (
        SELECT COALESCE(SUM(daily_cost), 0)
        FROM tutor_cost_tracking
        WHERE user_id = p_user_id
          AND DATE_TRUNC('month', tracking_date) = v_month_start
    )
    WHERE user_id = p_user_id
      AND DATE_TRUNC('month', tracking_date) = v_month_start;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCIÓN: get_user_cost_stats
-- Obtiene estadísticas de costo para un usuario
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_cost_stats(p_user_id UUID)
RETURNS TABLE (
    daily_cost NUMERIC,
    monthly_cost NUMERIC,
    daily_limit NUMERIC,
    monthly_limit NUMERIC,
    remaining_budget NUMERIC,
    total_interactions_today INTEGER,
    total_interactions_month INTEGER,
    monthly_projection NUMERIC
) AS $$
DECLARE
    v_institution_id INTEGER;
    v_monthly_limit NUMERIC;
    v_daily_limit NUMERIC;
BEGIN
    -- Obtener institución
    SELECT ui.institution_id INTO v_institution_id
    FROM user_institutions ui
    WHERE ui.user_id = p_user_id AND ui.is_primary = true
    LIMIT 1;

    -- Obtener límites
    SELECT COALESCE(
        (SELECT daily_cost_limit FROM tutor_cost_limits 
         WHERE user_id = p_user_id AND is_active = true LIMIT 1),
        (SELECT daily_cost_limit FROM tutor_cost_limits 
         WHERE institution_id = v_institution_id AND is_active = true LIMIT 1),
        2.00 -- Default: $2/día
    ) INTO v_daily_limit;

    SELECT COALESCE(
        (SELECT monthly_cost_limit FROM tutor_cost_limits 
         WHERE user_id = p_user_id AND is_active = true LIMIT 1),
        (SELECT monthly_cost_limit FROM tutor_cost_limits 
         WHERE institution_id = v_institution_id AND is_active = true LIMIT 1),
        50.00 -- Default: $50/mes
    ) INTO v_monthly_limit;

    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN tracking_date = CURRENT_DATE THEN daily_cost ELSE 0 END), 0) as daily_cost,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN daily_cost ELSE 0 END), 0) as monthly_cost,
        v_daily_limit as daily_limit,
        v_monthly_limit as monthly_limit,
        GREATEST(0, v_monthly_limit - COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN daily_cost ELSE 0 END), 0)) as remaining_budget,
        COALESCE(SUM(CASE WHEN tracking_date = CURRENT_DATE THEN total_interactions ELSE 0 END), 0)::INTEGER as total_interactions_today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN total_interactions ELSE 0 END), 0)::INTEGER as total_interactions_month,
        CASE 
            WHEN EXTRACT(DAY FROM CURRENT_DATE) > 0 THEN
                (COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN daily_cost ELSE 0 END), 0) / EXTRACT(DAY FROM CURRENT_DATE)) * 
                EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))
            ELSE 0
        END as monthly_projection
    FROM tutor_cost_tracking
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE tutor_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_cost_limits ENABLE ROW LEVEL SECURITY;

-- Políticas para tutor_cost_tracking
CREATE POLICY "Users can view their own cost tracking"
    ON tutor_cost_tracking FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can insert cost tracking"
    ON tutor_cost_tracking FOR INSERT
    WITH CHECK (true); -- Permitido para funciones SECURITY DEFINER

CREATE POLICY "System can update cost tracking"
    ON tutor_cost_tracking FOR UPDATE
    USING (true); -- Permitido para funciones SECURITY DEFINER

-- Políticas para tutor_cost_limits
CREATE POLICY "Users can view their own cost limits"
    ON tutor_cost_limits FOR SELECT
    USING (
        user_id = auth.uid() OR
        institution_id IN (
            SELECT ui.institution_id FROM user_institutions ui
            WHERE ui.user_id = auth.uid() AND ui.is_primary = true
        )
    );

CREATE POLICY "Admins can manage all cost limits"
    ON tutor_cost_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'admin_campus')
        )
    );

-- =====================================================
-- 7. COMENTARIOS
-- =====================================================

COMMENT ON TABLE tutor_cost_tracking IS 'Tracking diario y mensual de costos del tutor por usuario';
COMMENT ON TABLE tutor_cost_limits IS 'Límites de costo configurables por usuario o institución (default: $50/mes)';
COMMENT ON FUNCTION check_tutor_cost_limit IS 'Verifica si un usuario puede realizar una interacción basado en límites de costo mensual';
COMMENT ON FUNCTION track_tutor_interaction_cost IS 'Registra el costo real de una interacción del tutor';
COMMENT ON FUNCTION get_user_cost_stats IS 'Obtiene estadísticas de costo para un usuario (diario, mensual, proyección)';
