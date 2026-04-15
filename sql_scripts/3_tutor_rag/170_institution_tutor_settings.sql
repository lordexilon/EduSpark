-- 170_institution_tutor_settings.sql
-- Configuración de límites de tiempo y TTS por institución y usuario
-- Permite controlar costos y tiempo de uso del tutor AI

-- ============================================================
-- 1. TABLA: institution_tutor_settings
-- Configuración default para todos los usuarios de una institución
-- ============================================================

CREATE TABLE IF NOT EXISTS institution_tutor_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    tts_enabled BOOLEAN DEFAULT false,              -- Por defecto: solo texto (más económico)
    daily_time_limit_minutes INTEGER DEFAULT 180,   -- 3 horas por defecto
    plan_type TEXT DEFAULT 'text_only' 
        CHECK (plan_type IN ('text_only', 'with_voice', 'hybrid')),
    max_interactions_per_day INTEGER DEFAULT 100,   -- Límite de interacciones opcicional
    custom_system_prompt TEXT,                      -- Prompt personalizado para la institución
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_institution_tutor_settings_institution 
    ON institution_tutor_settings(institution_id);

-- ============================================================
-- 2. MODIFICAR: tutor_usage_limits
-- Agregar soporte para límites de tiempo y por institución
-- ============================================================

-- Agregar columna institution_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tutor_usage_limits' 
        AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE tutor_usage_limits 
        ADD COLUMN institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Recrear constraint con nuevos tipos de límite
DO $$
BEGIN
    -- Intentar eliminar constraint existente
    ALTER TABLE tutor_usage_limits 
    DROP CONSTRAINT IF EXISTS tutor_usage_limits_limit_type_check;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignorar si no existe
END $$;

ALTER TABLE tutor_usage_limits 
ADD CONSTRAINT tutor_usage_limits_limit_type_check 
CHECK (limit_type IN (
    'daily_cost', 
    'monthly_cost', 
    'tokens_per_day', 
    'tokens_per_month',
    'daily_time_minutes',     -- NUEVO: límite de tiempo diario
    'daily_tts_minutes'       -- NUEVO: límite de TTS diario
));

-- Índice para búsquedas por institución
CREATE INDEX IF NOT EXISTS idx_tutor_limits_institution 
    ON tutor_usage_limits(institution_id);

-- ============================================================
-- 3. TABLA: user_daily_tutor_usage
-- Tracking del tiempo de uso diario por usuario
-- ============================================================

CREATE TABLE IF NOT EXISTS user_daily_tutor_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_time_minutes NUMERIC(10,2) DEFAULT 0,
    total_tts_minutes NUMERIC(10,2) DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Índices para tracking eficiente
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_user_date 
    ON user_daily_tutor_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_date 
    ON user_daily_tutor_usage(usage_date);

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Habilitar RLS
ALTER TABLE institution_tutor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_tutor_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para institution_tutor_settings
-- Usuarios de la institución pueden ver su configuración
CREATE POLICY "Users can view their institution settings"
    ON institution_tutor_settings FOR SELECT
    USING (
        institution_id = public.get_user_institution_id()
    );

-- Admins pueden gestionar todas las configuraciones
CREATE POLICY "Admins can manage all institution settings"
    ON institution_tutor_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'admin_campus')
        )
    );

-- Políticas para user_daily_tutor_usage
-- Usuarios pueden ver su propio uso
CREATE POLICY "Users can view their own usage"
    ON user_daily_tutor_usage FOR SELECT
    USING (user_id = auth.uid());

-- Usuarios pueden insertar/actualizar su propio uso
CREATE POLICY "Users can track their own usage"
    ON user_daily_tutor_usage FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own usage"
    ON user_daily_tutor_usage FOR UPDATE
    USING (user_id = auth.uid());

-- Admins y docentes pueden ver uso de su institución
CREATE POLICY "Admins can view all usage in institution"
    ON user_daily_tutor_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            JOIN user_institutions ui ON ui.user_id = u.id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'admin_campus', 'coordinator', 'teacher')
            AND ui.institution_id = (
                SELECT ui2.institution_id 
                FROM user_institutions ui2 
                WHERE ui2.user_id = user_daily_tutor_usage.user_id
                AND ui2.is_primary = true
                LIMIT 1
            )
        )
    );

-- ============================================================
-- 5. FUNCIÓN: get_user_tutor_limits
-- Obtiene límites efectivos para un usuario
-- Prioridad: usuario específico > institución > defaults
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_tutor_limits(p_user_id UUID)
RETURNS TABLE (
    tts_enabled BOOLEAN,
    daily_time_limit_minutes INTEGER,
    remaining_time_today NUMERIC,
    plan_type TEXT,
    max_interactions_per_day INTEGER,
    used_time_today NUMERIC,
    used_interactions_today INTEGER
) AS $$
DECLARE
    v_institution_id INTEGER;
    v_tts_enabled BOOLEAN := false;
    v_daily_limit INTEGER := 180;        -- Default: 3 horas
    v_plan_type TEXT := 'text_only';
    v_max_interactions INTEGER := 100;
    v_used_time NUMERIC := 0;
    v_used_interactions INTEGER := 0;
    v_user_limit RECORD;
BEGIN
    -- 1. Obtener institución del usuario
    SELECT ui.institution_id INTO v_institution_id
    FROM user_institutions ui
    WHERE ui.user_id = p_user_id AND ui.is_primary = true
    LIMIT 1;
    
    -- 2. Obtener configuración de la institución (si existe)
    IF v_institution_id IS NOT NULL THEN
        SELECT its.tts_enabled, its.daily_time_limit_minutes, its.plan_type, its.max_interactions_per_day
        INTO v_tts_enabled, v_daily_limit, v_plan_type, v_max_interactions
        FROM institution_tutor_settings its
        WHERE its.institution_id = v_institution_id;
    END IF;
    
    -- 3. Verificar si hay límites específicos del usuario
    SELECT tul.limit_value INTO v_user_limit
    FROM tutor_usage_limits tul
    WHERE tul.user_id = p_user_id
    AND tul.limit_type = 'daily_time_minutes'
    AND tul.is_active = true
    LIMIT 1;
    
    IF v_user_limit IS NOT NULL THEN
        v_daily_limit := v_user_limit.limit_value::INTEGER;
    END IF;
    
    -- 4. Obtener uso del día actual
    SELECT COALESCE(udu.total_time_minutes, 0), COALESCE(udu.total_interactions, 0)
    INTO v_used_time, v_used_interactions
    FROM user_daily_tutor_usage udu
    WHERE udu.user_id = p_user_id AND udu.usage_date = CURRENT_DATE;
    
    -- 5. Retornar resultados
    RETURN QUERY SELECT 
        v_tts_enabled,
        v_daily_limit,
        GREATEST(0, v_daily_limit - v_used_time),  -- remaining time
        v_plan_type,
        v_max_interactions,
        v_used_time,
        v_used_interactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCIÓN: track_tutor_usage
-- Registra tiempo de uso del tutor
-- ============================================================

CREATE OR REPLACE FUNCTION track_tutor_usage(
    p_user_id UUID,
    p_time_minutes NUMERIC,
    p_is_tts BOOLEAN DEFAULT false
)
RETURNS TABLE (
    success BOOLEAN,
    remaining_time NUMERIC,
    limit_exceeded BOOLEAN
) AS $$
DECLARE
    v_usage_record RECORD;
    v_limits RECORD;
BEGIN
    -- 1. Obtener límites del usuario
    SELECT * INTO v_limits FROM get_user_tutor_limits(p_user_id);
    
    -- 2. Insertar o actualizar uso diario
    INSERT INTO user_daily_tutor_usage (user_id, usage_date, total_time_minutes, total_tts_minutes, total_interactions, last_activity_at)
    VALUES (p_user_id, CURRENT_DATE, p_time_minutes, CASE WHEN p_is_tts THEN p_time_minutes ELSE 0 END, 1, NOW())
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
        total_time_minutes = user_daily_tutor_usage.total_time_minutes + EXCLUDED.total_time_minutes,
        total_tts_minutes = user_daily_tutor_usage.total_tts_minutes + CASE WHEN p_is_tts THEN EXCLUDED.total_tts_minutes ELSE 0 END,
        total_interactions = user_daily_tutor_usage.total_interactions + 1,
        last_activity_at = NOW();
    
    -- 3. Obtener nuevo tiempo restante
    SELECT * INTO v_limits FROM get_user_tutor_limits(p_user_id);
    
    -- 4. Retornar resultado
    RETURN QUERY SELECT 
        true,
        v_limits.remaining_time_today,
        v_limits.remaining_time_today <= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. DATOS INICIALES (Opcional)
-- Insertar configuración default para instituciones existentes
-- ============================================================

-- Comentado para no afectar instituciones existentes
-- INSERT INTO institution_tutor_settings (institution_id, tts_enabled, daily_time_limit_minutes, plan_type)
-- SELECT id, false, 180, 'text_only'
-- FROM institutions
-- WHERE NOT EXISTS (
--     SELECT 1 FROM institution_tutor_settings its WHERE its.institution_id = institutions.id
-- );

-- Comentarios
COMMENT ON TABLE institution_tutor_settings IS 'Configuración del Tutor AI por institución (TTS, límites de tiempo)';
COMMENT ON TABLE user_daily_tutor_usage IS 'Tracking diario del uso del Tutor AI por usuario';
COMMENT ON FUNCTION get_user_tutor_limits IS 'Obtiene límites efectivos del tutor para un usuario (prioridad: usuario > institución > default)';
COMMENT ON FUNCTION track_tutor_usage IS 'Registra tiempo de uso del tutor y verifica límites';
