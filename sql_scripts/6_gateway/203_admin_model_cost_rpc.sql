-- =====================================================
-- CoreSpark — RPCs de administración (Modelos & Límites)
-- Acceso exclusivo del rol admin via SECURITY DEFINER.
-- Para la UI "Modelos & Límites IA".
-- =====================================================

-- =====================================================
-- 0. Tablas de presupuesto (autocontenido: se crean si no
--    existen, para tolerar arranque en frío. Espejo de
--    112_control_presupuesto_50usd_mensual.sql).
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tutor_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES public.institutions(id) ON DELETE SET NULL,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_cost NUMERIC(10, 6) DEFAULT 0,
    monthly_cost NUMERIC(10, 6) DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tracking_date)
);

CREATE TABLE IF NOT EXISTS public.tutor_cost_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES public.institutions(id) ON DELETE SET NULL,
    daily_cost_limit NUMERIC(10, 2) DEFAULT 2.00,
    monthly_cost_limit NUMERIC(10, 2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice único parcial para upsert por institución activa
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_cost_limits_institution_active
    ON public.tutor_cost_limits(institution_id)
    WHERE is_active = true AND institution_id IS NOT NULL;

-- Habilitar RLS (deny-by-default). Las políticas completas de estas
-- tablas viven en 112_control_presupuesto_50usd_mensual.sql; los accesos
-- admin usan RPCs SECURITY DEFINER que ignoran RLS.
ALTER TABLE public.tutor_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_cost_limits ENABLE ROW LEVEL SECURITY;

-- Helper: verifica que el usuario autenticado sea admin
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  );
$$;

-- =====================================================
-- 1. Listar modelos del registro (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_list_models()
RETURNS SETOF public.model_registry
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_safe() THEN
    RAISE EXCEPTION 'Solo administradores pueden ver modelos';
  END IF;
  RETURN QUERY SELECT * FROM public.model_registry ORDER BY tier, priority;
END;
$$;

-- =====================================================
-- 2. Actualizar un modelo del registro (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_update_model(
  p_model_key TEXT,
  p_enabled BOOLEAN DEFAULT NULL,
  p_tier TEXT DEFAULT NULL,
  p_input_cost_per_mtok NUMERIC DEFAULT NULL,
  p_output_cost_per_mtok NUMERIC DEFAULT NULL,
  p_supports_tools BOOLEAN DEFAULT NULL,
  p_supports_vision BOOLEAN DEFAULT NULL,
  p_context_window INTEGER DEFAULT NULL,
  p_max_output_tokens INTEGER DEFAULT NULL,
  p_priority INTEGER DEFAULT NULL
)
RETURNS public.model_registry
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.model_registry;
BEGIN
  IF NOT public.is_admin_safe() THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar modelos';
  END IF;

  UPDATE public.model_registry
  SET
    enabled = COALESCE(p_enabled, enabled),
    tier = COALESCE(p_tier, tier),
    input_cost_per_mtok = COALESCE(p_input_cost_per_mtok, input_cost_per_mtok),
    output_cost_per_mtok = COALESCE(p_output_cost_per_mtok, output_cost_per_mtok),
    supports_tools = COALESCE(p_supports_tools, supports_tools),
    supports_vision = COALESCE(p_supports_vision, supports_vision),
    context_window = COALESCE(p_context_window, context_window),
    max_output_tokens = COALESCE(p_max_output_tokens, max_output_tokens),
    priority = COALESCE(p_priority, priority),
    updated_at = now()
  WHERE model_key = p_model_key
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Modelo no encontrado: %', p_model_key;
  END IF;

  RETURN v_row;
END;
$$;

-- =====================================================
-- 3. Listar límites de costo por institución (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_list_cost_limits()
RETURNS TABLE (
  limit_id UUID,
  institution_id INTEGER,
  institution_name TEXT,
  user_id UUID,
  daily_cost_limit NUMERIC,
  monthly_cost_limit NUMERIC,
  is_active BOOLEAN,
  current_monthly_cost NUMERIC,
  current_daily_cost NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_safe() THEN
    RAISE EXCEPTION 'Solo administradores pueden ver límites de costo';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.institution_id,
    i.name::text,
    l.user_id,
    l.daily_cost_limit,
    l.monthly_cost_limit,
    l.is_active,
    COALESCE((
      SELECT SUM(t.daily_cost)
      FROM public.tutor_cost_tracking t
      WHERE t.institution_id = l.institution_id
        AND DATE_TRUNC('month', t.tracking_date) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) AS current_monthly_cost,
    COALESCE((
      SELECT SUM(t.daily_cost)
      FROM public.tutor_cost_tracking t
      WHERE t.institution_id = l.institution_id
        AND t.tracking_date = CURRENT_DATE
    ), 0) AS current_daily_cost
  FROM public.tutor_cost_limits l
  LEFT JOIN public.institutions i ON i.id = l.institution_id
  WHERE l.user_id IS NULL  -- solo límites a nivel institución
  ORDER BY i.name;
END;
$$;

-- =====================================================
-- 4. Upsert de límite de costo por institución (admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_upsert_cost_limit(
  p_institution_id INTEGER,
  p_daily_cost_limit NUMERIC DEFAULT NULL,
  p_monthly_cost_limit NUMERIC DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS public.tutor_cost_limits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.tutor_cost_limits;
  v_id UUID;
BEGIN
  IF NOT public.is_admin_safe() THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar límites de costo';
  END IF;

  -- Buscar límite activo existente a nivel institución
  SELECT id INTO v_id
  FROM public.tutor_cost_limits
  WHERE institution_id = p_institution_id
    AND user_id IS NULL
    AND is_active = true
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.tutor_cost_limits
    SET
      daily_cost_limit = COALESCE(p_daily_cost_limit, daily_cost_limit),
      monthly_cost_limit = COALESCE(p_monthly_cost_limit, monthly_cost_limit),
      is_active = p_is_active,
      updated_at = now()
    WHERE id = v_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.tutor_cost_limits (
      institution_id, user_id, daily_cost_limit, monthly_cost_limit, is_active
    )
    VALUES (
      p_institution_id, NULL,
      COALESCE(p_daily_cost_limit, 2.00),
      COALESCE(p_monthly_cost_limit, 50.00),
      p_is_active
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- =====================================================
-- 5. Grants para service_role (las Edge Functions usan RPC)
-- =====================================================
GRANT EXECUTE ON FUNCTION public.admin_list_models() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_model(TEXT, BOOLEAN, TEXT, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_cost_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_cost_limit(INTEGER, NUMERIC, NUMERIC, BOOLEAN) TO service_role;
