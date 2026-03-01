-- 171_fix_tutor_limits_defaults.sql
-- Corrige el bug donde usuarios sin configuración de institución 
-- obtienen 0 como tiempo restante

-- Recrear la función con mejor manejo de valores NULL
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
    v_tts_enabled BOOLEAN;
    v_daily_limit INTEGER;
    v_plan_type TEXT;
    v_max_interactions INTEGER;
    v_used_time NUMERIC;
    v_used_interactions INTEGER;
    v_inst_settings RECORD;
BEGIN
    -- Valores por defecto
    v_tts_enabled := false;
    v_daily_limit := 180;        -- Default: 3 horas
    v_plan_type := 'text_only';
    v_max_interactions := 100;
    v_used_time := 0;
    v_used_interactions := 0;
    
    -- 1. Obtener institución del usuario
    SELECT ui.institution_id INTO v_institution_id
    FROM user_institutions ui
    WHERE ui.user_id = p_user_id AND ui.is_primary = true
    LIMIT 1;
    
    -- 2. Obtener configuración de la institución (si existe)
    IF v_institution_id IS NOT NULL THEN
        SELECT * INTO v_inst_settings
        FROM institution_tutor_settings its
        WHERE its.institution_id = v_institution_id;
        
        -- Solo sobrescribir si encontramos configuración
        IF v_inst_settings IS NOT NULL AND v_inst_settings.id IS NOT NULL THEN
            v_tts_enabled := COALESCE(v_inst_settings.tts_enabled, false);
            v_daily_limit := COALESCE(v_inst_settings.daily_time_limit_minutes, 180);
            v_plan_type := COALESCE(v_inst_settings.plan_type, 'text_only');
            v_max_interactions := COALESCE(v_inst_settings.max_interactions_per_day, 100);
        END IF;
    END IF;
    
    -- 3. Verificar si hay límites específicos del usuario (sobrescribe institución)
    SELECT tul.limit_value INTO v_daily_limit
    FROM tutor_usage_limits tul
    WHERE tul.user_id = p_user_id
    AND tul.limit_type = 'daily_time_minutes'
    AND tul.is_active = true
    LIMIT 1;
    
    -- Si no se encontró límite específico, mantener el de institución/default
    IF v_daily_limit IS NULL THEN
        v_daily_limit := 180;
    END IF;
    
    -- 4. Obtener uso del día actual
    SELECT COALESCE(udu.total_time_minutes, 0), COALESCE(udu.total_interactions, 0)
    INTO v_used_time, v_used_interactions
    FROM user_daily_tutor_usage udu
    WHERE udu.user_id = p_user_id AND udu.usage_date = CURRENT_DATE;
    
    -- Si no hay registro de uso hoy, usar 0
    IF v_used_time IS NULL THEN
        v_used_time := 0;
    END IF;
    IF v_used_interactions IS NULL THEN
        v_used_interactions := 0;
    END IF;
    
    -- 5. Retornar resultados
    RETURN QUERY SELECT 
        v_tts_enabled,
        v_daily_limit,
        GREATEST(0::NUMERIC, v_daily_limit::NUMERIC - v_used_time),  -- remaining time
        v_plan_type,
        v_max_interactions,
        v_used_time,
        v_used_interactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función funciona correctamente
-- SELECT * FROM get_user_tutor_limits('<tu-user-id-aqui>');

COMMENT ON FUNCTION get_user_tutor_limits IS 'Obtiene límites efectivos del tutor para un usuario. Default: 3 horas/día, TTS deshabilitado.';
