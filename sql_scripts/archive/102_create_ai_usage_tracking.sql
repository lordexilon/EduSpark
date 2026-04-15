-- =====================================================
-- TABLA DE SEGUIMIENTO DE USO DE IA (TOKENS Y COSTOS)
-- =====================================================
-- Tabla para rastrear el consumo de tokens y costos de Gemini API por usuario

CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Información de la consulta
  model VARCHAR(100) NOT NULL DEFAULT 'gemini-2.5-flash',
  request_type VARCHAR(50) DEFAULT 'chat', -- chat, embedding, transcription, etc.
  conversation_id VARCHAR(255), -- ID de conversación si aplica
  
  -- Tokens utilizados
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Costos calculados
  input_cost DECIMAL(10, 8) NOT NULL DEFAULT 0, -- Costo de tokens de entrada
  output_cost DECIMAL(10, 8) NOT NULL DEFAULT 0, -- Costo de tokens de salida
  total_cost DECIMAL(10, 8) NOT NULL DEFAULT 0, -- Costo total
  
  -- Metadatos adicionales
  request_id VARCHAR(255), -- ID único de la solicitud
  metadata JSONB DEFAULT '{}'::jsonb, -- Metadatos adicionales (prompt length, response length, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_course_id ON public.ai_usage_tracking(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_tracking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON public.ai_usage_tracking(model);

-- Índice compuesto para reportes por usuario y fecha
-- Nota: Usamos created_at directamente en lugar de DATE() porque DATE() no es IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date_model 
ON public.ai_usage_tracking(user_id, created_at DESC, model);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_ai_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_ai_usage_updated_at ON public.ai_usage_tracking;
CREATE TRIGGER trigger_update_ai_usage_updated_at
BEFORE UPDATE ON public.ai_usage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_ai_usage_updated_at();

-- Vista para estadísticas diarias por usuario
CREATE OR REPLACE VIEW public.ai_usage_daily_stats AS
SELECT 
  user_id,
  DATE(created_at) as usage_date,
  model,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(input_cost) as total_input_cost,
  SUM(output_cost) as total_output_cost,
  SUM(total_cost) as total_cost
FROM public.ai_usage_tracking
GROUP BY user_id, DATE(created_at), model;

-- Vista para estadísticas mensuales por usuario
CREATE OR REPLACE VIEW public.ai_usage_monthly_stats AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at)::DATE as usage_month,
  model,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(input_cost) as total_input_cost,
  SUM(output_cost) as total_output_cost,
  SUM(total_cost) as total_cost
FROM public.ai_usage_tracking
GROUP BY user_id, DATE_TRUNC('month', created_at), model;

-- Vista para estadísticas totales por usuario
CREATE OR REPLACE VIEW public.ai_usage_user_totals AS
SELECT 
  user_id,
  COUNT(*) as total_requests,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(input_cost) as total_input_cost,
  SUM(output_cost) as total_output_cost,
  SUM(total_cost) as total_cost,
  MIN(created_at) as first_usage,
  MAX(created_at) as last_usage
FROM public.ai_usage_tracking
GROUP BY user_id;

-- Comentarios
COMMENT ON TABLE public.ai_usage_tracking IS 'Tracking de consumo de tokens y costos de Gemini API por usuario';
COMMENT ON COLUMN public.ai_usage_tracking.input_tokens IS 'Número de tokens de entrada (prompt)';
COMMENT ON COLUMN public.ai_usage_tracking.output_tokens IS 'Número de tokens de salida (respuesta)';
COMMENT ON COLUMN public.ai_usage_tracking.total_tokens IS 'Total de tokens (input + output)';
COMMENT ON COLUMN public.ai_usage_tracking.input_cost IS 'Costo de tokens de entrada en USD';
COMMENT ON COLUMN public.ai_usage_tracking.output_cost IS 'Costo de tokens de salida en USD';
COMMENT ON COLUMN public.ai_usage_tracking.total_cost IS 'Costo total en USD';
COMMENT ON COLUMN public.ai_usage_tracking.model IS 'Modelo de Gemini utilizado (ej: gemini-2.5-flash, gemini-2.5-pro)';
COMMENT ON COLUMN public.ai_usage_tracking.request_type IS 'Tipo de solicitud: chat, embedding, transcription, etc.';

-- RLS Policies (solo admin puede ver todos los datos)
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver solo sus propios registros
CREATE POLICY "users_view_own_ai_usage"
ON public.ai_usage_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Los administradores pueden ver todos los registros
CREATE POLICY "admins_view_all_ai_usage"
ON public.ai_usage_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  )
);

-- Policy: El sistema puede insertar registros (desde el frontend con service_role)
-- Nota: Esto requiere que el frontend use service_role key para insertar
-- O podemos permitir que los usuarios inserten sus propios registros
CREATE POLICY "users_insert_own_ai_usage"
ON public.ai_usage_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id);

