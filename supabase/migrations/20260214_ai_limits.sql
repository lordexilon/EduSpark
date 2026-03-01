-- Tabla para el Grifo de Tokens (AI Limits)
-- Permite definir límites globales, por institución y por usuario.

-- 1. Tabla Principal
CREATE TABLE IF NOT EXISTS public.ai_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'institution', 'user')),
    scope_id UUID, -- NULL para global, institution_id o user_id
    
    -- Límites definidos (NULL = sin límite específico, usa el default superior)
    limit_tokens_daily BIGINT DEFAULT 10000000, -- Default: 10M tokens (~$3/day aprox en Flash)
    limit_messages_daily INTEGER DEFAULT 100, -- Default: 100 msgs/usuario
    limit_cost_daily_usd NUMERIC(10, 4) DEFAULT 5.0000, -- Default: $5 USD global
    
    -- Consumo Actual (se resetea cada día)
    used_tokens_daily BIGINT DEFAULT 0,
    used_messages_daily INTEGER DEFAULT 0,
    used_cost_daily_usd NUMERIC(10, 6) DEFAULT 0,
    
    -- Control
    is_active BOOLEAN DEFAULT true, -- "Cerrar el grifo" manualmente
    reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_limits_scope ON public.ai_limits(scope, scope_id);
ALTER TABLE public.ai_limits ADD CONSTRAINT ai_limits_scope_unique UNIQUE NULLS NOT DISTINCT (scope, scope_id);

-- RLS
ALTER TABLE public.ai_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON public.ai_limits FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.users WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('admin', 'admin-campus'))));

CREATE POLICY "Users view own limit" ON public.ai_limits FOR SELECT
    USING (scope = 'user' AND scope_id = auth.uid());

-- Insertar Límite Global Inicial
INSERT INTO public.ai_limits (scope, scope_id, limit_cost_daily_usd, limit_tokens_daily)
VALUES ('global', NULL, 2.0000, 20000000) -- $2.00 USD tope diario
ON CONFLICT DO NOTHING;


-- 2. Función para verificar elegibilidad (Grifo)
CREATE OR REPLACE FUNCTION check_ai_request_eligibility(
    p_user_id UUID,
    p_institution_id UUID DEFAULT NULL,
    p_estimated_cost NUMERIC DEFAULT 0
)
RETURNS TABLE (allowed BOOLEAN, reason TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_global_limit RECORD;
    v_inst_limit RECORD;
    v_user_limit RECORD;
BEGIN
    -- 1. Verificar Límite Global (Hard Stop)
    SELECT * INTO v_global_limit FROM ai_limits WHERE scope = 'global' LIMIT 1;
    
    IF v_global_limit.is_active = false THEN
        RETURN QUERY SELECT false, 'Global AI service disabled';
        RETURN;
    END IF;

    IF (v_global_limit.used_cost_daily_usd + p_estimated_cost) > v_global_limit.limit_cost_daily_usd THEN
        RETURN QUERY SELECT false, 'Global daily cost limit reached';
        RETURN;
    END IF;

    -- 2. Verificar Límite Institución (si aplica)
    IF p_institution_id IS NOT NULL THEN
        SELECT * INTO v_inst_limit FROM ai_limits WHERE scope = 'institution' AND scope_id = p_institution_id;
        
        IF FOUND AND v_inst_limit.is_active = false THEN
            RETURN QUERY SELECT false, 'Institution AI service disabled';
            RETURN;
        END IF;

        IF FOUND AND (v_inst_limit.used_cost_daily_usd + p_estimated_cost) > v_inst_limit.limit_cost_daily_usd THEN
            RETURN QUERY SELECT false, 'Institution daily cost limit reached';
            RETURN;
        END IF;
    END IF;

    -- 3. Verificar Límite Usuario
    SELECT * INTO v_user_limit FROM ai_limits WHERE scope = 'user' AND scope_id = p_user_id;
    
    -- Si no existe límite personal, crear uno default (soft limit 30 msgs)
    IF NOT FOUND THEN
        INSERT INTO ai_limits (scope, scope_id, limit_messages_daily, limit_cost_daily_usd)
        VALUES ('user', p_user_id, 30, 0.5000) -- Default soft limit
        RETURNING * INTO v_user_limit;
    END IF;

    IF v_user_limit.is_active = false THEN
        RETURN QUERY SELECT false, 'User AI service disabled';
        RETURN;
    END IF;

    IF v_user_limit.used_messages_daily >= v_user_limit.limit_messages_daily THEN
        RETURN QUERY SELECT false, 'User daily message limit reached';
        RETURN;
    END IF;

    RETURN QUERY SELECT true, 'OK';
END;
$$;


-- 3. Función para registrar consumo (Post-Action)
CREATE OR REPLACE FUNCTION log_ai_usage(
    p_user_id UUID,
    p_institution_id UUID,
    p_tokens_input INTEGER,
    p_tokens_output INTEGER,
    p_cost_usd NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar Global
    UPDATE ai_limits 
    SET used_tokens_daily = used_tokens_daily + p_tokens_input + p_tokens_output,
        used_cost_daily_usd = used_cost_daily_usd + p_cost_usd,
        used_messages_daily = used_messages_daily + 1,
        updated_at = NOW()
    WHERE scope = 'global';

    -- Actualizar Institución
    IF p_institution_id IS NOT NULL THEN
        UPDATE ai_limits 
        SET used_tokens_daily = used_tokens_daily + p_tokens_input + p_tokens_output,
            used_cost_daily_usd = used_cost_daily_usd + p_cost_usd,
            used_messages_daily = used_messages_daily + 1,
            updated_at = NOW()
        WHERE scope = 'institution' AND scope_id = p_institution_id;
    END IF;

    -- Actualizar Usuario
    UPDATE ai_limits 
    SET used_tokens_daily = used_tokens_daily + p_tokens_input + p_tokens_output,
        used_cost_daily_usd = used_cost_daily_usd + p_cost_usd,
        used_messages_daily = used_messages_daily + 1,
        updated_at = NOW()
    WHERE scope = 'user' AND scope_id = p_user_id;
END;
$$;
