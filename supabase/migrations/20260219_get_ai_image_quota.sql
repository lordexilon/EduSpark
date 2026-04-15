-- FUNCTION: get_ai_image_quota
-- OBJECTIVE: Calculate how many images a user can generate today based on their remaining budget.
-- LOGIC: Returns the minimum of (Global Remaining / Cost) and (User/Institution Remaining / Cost).
-- COST PER IMAGE: Fixed at $0.04 USD.

CREATE OR REPLACE FUNCTION get_ai_image_quota(
    p_user_id UUID,
    p_institution_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_per_image NUMERIC := 0.04;
    v_global_remaining NUMERIC;
    v_inst_remaining NUMERIC;
    v_user_remaining NUMERIC;
    v_min_quota INTEGER;
    
    v_limit_record RECORD;
BEGIN
    -- 1. Get Global Remaining Budget
    SELECT (limit_cost_daily_usd - used_cost_daily_usd) INTO v_global_remaining
    FROM ai_limits WHERE scope = 'global' AND is_active = true;
    
    -- If global is missing or disabled, quota is 0
    IF v_global_remaining IS NULL OR v_global_remaining <= 0 THEN
        RETURN 0;
    END IF;

    v_min_quota := FLOOR(v_global_remaining / v_cost_per_image)::INTEGER;

    -- 2. Check Institution Limit (if provided)
    IF p_institution_id IS NOT NULL THEN
        SELECT (limit_cost_daily_usd - used_cost_daily_usd) INTO v_inst_remaining
        FROM ai_limits WHERE scope = 'institution' AND scope_id = p_institution_id AND is_active = true;

        IF v_inst_remaining IS NOT NULL THEN
            IF v_inst_remaining <= 0 THEN
                RETURN 0;
            END IF;
            -- Take the smaller of the two quotas
            v_min_quota := LEAST(v_min_quota, FLOOR(v_inst_remaining / v_cost_per_image)::INTEGER);
        END IF;
    END IF;

    -- 3. Check User Limit
    SELECT (limit_cost_daily_usd - used_cost_daily_usd) INTO v_user_remaining
    FROM ai_limits WHERE scope = 'user' AND scope_id = p_user_id AND is_active = true;

    -- If user limit exists, verify it
    IF v_user_remaining IS NOT NULL THEN
        IF v_user_remaining <= 0 THEN
            RETURN 0;
        END IF;
        v_min_quota := LEAST(v_min_quota, FLOOR(v_user_remaining / v_cost_per_image)::INTEGER);
    ELSE
        -- If user has no specific limit record, we assume they are only bound by global/institution
        -- OR we could create a default one here, but strict checking usually happens at 'check_eligibility'
        -- For quota display, we'll just respect the upper bounds if no user record exists.
        -- (Optional: You could return a default 'soft limit' here if you want)
        NULL; 
    END IF;

    RETURN v_min_quota;
END;
$$;
