-- 173_fix_get_user_cost_stats.sql
-- Fixes type mismatch in get_user_cost_stats function

CREATE OR REPLACE FUNCTION public.get_user_cost_stats(p_user_id UUID)
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
    v_days_in_month INTEGER;
    v_current_day INTEGER;
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

    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;
    v_current_day := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;

    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN tracking_date = CURRENT_DATE THEN tct.daily_cost ELSE 0 END), 0)::NUMERIC as daily_cost,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN tct.daily_cost ELSE 0 END), 0)::NUMERIC as monthly_cost,
        v_daily_limit::NUMERIC as daily_limit,
        v_monthly_limit::NUMERIC as monthly_limit,
        GREATEST(0, v_monthly_limit - COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN tct.daily_cost ELSE 0 END), 0))::NUMERIC as remaining_budget,
        COALESCE(SUM(CASE WHEN tracking_date = CURRENT_DATE THEN total_interactions ELSE 0 END), 0)::INTEGER as total_interactions_today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN total_interactions ELSE 0 END), 0)::INTEGER as total_interactions_month,
        (CASE 
            WHEN v_current_day > 0 THEN
                (COALESCE(SUM(CASE WHEN DATE_TRUNC('month', tracking_date) = DATE_TRUNC('month', CURRENT_DATE) THEN tct.daily_cost ELSE 0 END), 0) / v_current_day) * v_days_in_month
            ELSE 0
        END)::NUMERIC as monthly_projection
    FROM tutor_cost_tracking tct
    WHERE tct.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
