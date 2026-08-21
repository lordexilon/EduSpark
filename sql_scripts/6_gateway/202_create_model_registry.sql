-- =====================================================
-- CoreSpark — MODEL REGISTRY
-- Tabla de modelos configurables para el Model Router
-- (Bedrock + Ollama + Qwen). Data-driven: se rebalancea
-- sin tocar código. Consumida por las especializaciones.
-- =====================================================

-- =====================================================
-- 1. TABLA: model_registry
-- =====================================================
CREATE TABLE IF NOT EXISTS public.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_key TEXT NOT NULL UNIQUE,          -- clave estable: 'bedrock.claude-sonnet'
    provider TEXT NOT NULL,                  -- 'bedrock' | 'ollama' | 'qwen'
    model_id TEXT NOT NULL,                  -- id del proveedor (ver abajo)
    display_name TEXT,
    tier TEXT NOT NULL,                      -- 'local' | 'economy' | 'premium' | 'fallback'
    input_cost_per_mtok NUMERIC(10, 6) NOT NULL DEFAULT 0,   -- USD por 1M tokens
    output_cost_per_mtok NUMERIC(10, 6) NOT NULL DEFAULT 0,  -- USD por 1M tokens
    supports_tools BOOLEAN NOT NULL DEFAULT false,
    supports_vision BOOLEAN NOT NULL DEFAULT false,
    context_window INTEGER NOT NULL DEFAULT 8000,
    max_output_tokens INTEGER NOT NULL DEFAULT 2048,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 100,   -- menor = preferido dentro del tier
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para selección rápida por tier + capacidad
CREATE INDEX IF NOT EXISTS idx_model_registry_tier ON public.model_registry(tier) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_model_registry_provider ON public.model_registry(provider) WHERE enabled = true;

-- =====================================================
-- 2. SEED: modelos disponibles
-- =====================================================

-- --- TIER premium (Bedrock Claude Sonnet) ---
-- NOTA: enabled=false hasta configurar credenciales AWS en edge_runtime.env.
-- Cuando estén listas, ejecutar: UPDATE model_registry SET enabled=true WHERE provider='bedrock';
INSERT INTO public.model_registry
    (model_key, provider, model_id, display_name, tier, input_cost_per_mtok, output_cost_per_mtok, supports_tools, supports_vision, context_window, max_output_tokens, priority, enabled)
VALUES
    ('bedrock.claude-sonnet', 'bedrock', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', 'Claude 3.5 Sonnet', 'premium', 3.00, 15.00, true, true, 200000, 4096, 10, false)
ON CONFLICT (model_key) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    tier = EXCLUDED.tier,
    input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
    output_cost_per_mtok = EXCLUDED.output_cost_per_mtok,
    supports_tools = EXCLUDED.supports_tools,
    supports_vision = EXCLUDED.supports_vision,
    context_window = EXCLUDED.context_window,
    max_output_tokens = EXCLUDED.max_output_tokens,
    priority = EXCLUDED.priority,
    updated_at = now();

-- --- TIER economy (Bedrock Claude Haiku) ---
INSERT INTO public.model_registry
    (model_key, provider, model_id, display_name, tier, input_cost_per_mtok, output_cost_per_mtok, supports_tools, supports_vision, context_window, max_output_tokens, priority, enabled)
VALUES
    ('bedrock.claude-haiku', 'bedrock', 'us.anthropic.claude-3-5-haiku-20241022-v1:0', 'Claude 3.5 Haiku', 'economy', 0.80, 4.00, false, false, 200000, 4096, 20, false)
ON CONFLICT (model_key) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    tier = EXCLUDED.tier,
    input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
    output_cost_per_mtok = EXCLUDED.output_cost_per_mtok,
    supports_tools = EXCLUDED.supports_tools,
    supports_vision = EXCLUDED.supports_vision,
    context_window = EXCLUDED.context_window,
    max_output_tokens = EXCLUDED.max_output_tokens,
    priority = EXCLUDED.priority,
    updated_at = now();

-- --- TIER fallback (Qwen DashScope, ya integrado) ---
INSERT INTO public.model_registry
    (model_key, provider, model_id, display_name, tier, input_cost_per_mtok, output_cost_per_mtok, supports_tools, supports_vision, context_window, max_output_tokens, priority)
VALUES
    ('qwen.plus', 'qwen', 'qwen-plus', 'Qwen Plus (DashScope)', 'fallback', 0.80, 2.00, true, false, 131072, 2048, 30)
ON CONFLICT (model_key) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    tier = EXCLUDED.tier,
    input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
    output_cost_per_mtok = EXCLUDED.output_cost_per_mtok,
    supports_tools = EXCLUDED.supports_tools,
    supports_vision = EXCLUDED.supports_vision,
    context_window = EXCLUDED.context_window,
    max_output_tokens = EXCLUDED.max_output_tokens,
    priority = EXCLUDED.priority,
    updated_at = now();

-- --- TIER local (Ollama) ---
INSERT INTO public.model_registry
    (model_key, provider, model_id, display_name, tier, input_cost_per_mtok, output_cost_per_mtok, supports_tools, supports_vision, context_window, max_output_tokens, priority)
VALUES
    ('ollama.qwen3.5', 'ollama', 'qwen3.5:4b', 'Qwen 3.5 4B (local)', 'local', 0, 0, false, false, 8192, 2048, 40),
    ('ollama.llama3.2', 'ollama', 'llama3.2:3b', 'Llama 3.2 3B (local)', 'local', 0, 0, false, false, 4096, 1024, 50)
ON CONFLICT (model_key) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    tier = EXCLUDED.tier,
    input_cost_per_mtok = EXCLUDED.input_cost_per_mtok,
    output_cost_per_mtok = EXCLUDED.output_cost_per_mtok,
    supports_tools = EXCLUDED.supports_tools,
    supports_vision = EXCLUDED.supports_vision,
    context_window = EXCLUDED.context_window,
    max_output_tokens = EXCLUDED.max_output_tokens,
    priority = EXCLUDED.priority,
    updated_at = now();

-- =====================================================
-- 3. RLS: solo service_role y admin editan; los demás leen
-- =====================================================
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "model_registry_read" ON public.model_registry;
CREATE POLICY "model_registry_read"
    ON public.model_registry FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "model_registry_write" ON public.model_registry;
CREATE POLICY "model_registry_write"
    ON public.model_registry FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.model_registry IS 'Registro de modelos disponibles para el Model Router de CoreSpark (Bedrock/Ollama/Qwen) con precios y capacidades.';
