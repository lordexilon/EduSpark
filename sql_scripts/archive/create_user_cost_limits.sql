-- =====================================================
-- SISTEMA DE CONTROL DE COSTOS POR USUARIO
-- Limita consultas y costos para mantener presupuesto
-- =====================================================

-- 1. Crear tabla de límites por usuario
CREATE TABLE IF NOT EXISTS user_query_limits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_queries INTEGER DEFAULT 50,
  monthly_queries INTEGER DEFAULT 1000,
  daily_cost_limit NUMERIC(10,4) DEFAULT 0.05,
  monthly_cost_limit NUMERIC(10,4) DEFAULT 1.00,
  current_daily_queries INTEGER DEFAULT 0,
  current_monthly_queries INTEGER DEFAULT 0,
  current_daily_cost NUMERIC(10,4) DEFAULT 0,
  current_monthly_cost NUMERIC(10,4) DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_query_limits_reset_date 
ON user_query_limits(last_reset_date);

-- 2. Función para verificar límites antes de procesar consulta
CREATE OR REPLACE FUNCTION check_user_query_limits(
  p_user_id UUID,
  p_estimated_cost NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_limits user_query_limits%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_can_proceed BOOLEAN := true;
  v_message TEXT := '';
BEGIN
  -- Obtener o crear límites del usuario
  SELECT * INTO v_limits 
  FROM user_query_limits 
  WHERE user_id = p_user_id;
  
  -- Si no existe, crear con valores por defecto
  IF NOT FOUND THEN
    INSERT INTO user_query_limits (user_id) 
    VALUES (p_user_id)
    RETURNING * INTO v_limits;
  END IF;
  
  -- Resetear contadores diarios si es nuevo día
  IF v_limits.last_reset_date < v_today THEN
    UPDATE user_query_limits
    SET current_daily_queries = 0,
        current_daily_cost = 0,
        last_reset_date = v_today,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    v_limits.current_daily_queries := 0;
    v_limits.current_daily_cost := 0;
  END IF;
  
  -- Verificar límites diarios
  IF v_limits.current_daily_queries >= v_limits.daily_queries THEN
    v_can_proceed := false;
    v_message := format('Límite diario de consultas alcanzado (%s/%s). Intenta mañana.', 
      v_limits.current_daily_queries, v_limits.daily_queries);
  ELSIF (v_limits.current_daily_cost + p_estimated_cost) > v_limits.daily_cost_limit THEN
    v_can_proceed := false;
    v_message := format('Límite diario de costo alcanzado ($%.4f/$%.4f). Intenta mañana.', 
      v_limits.current_daily_cost + p_estimated_cost, v_limits.daily_cost_limit);
  END IF;
  
  -- Verificar límites mensuales (solo si pasó el día 1)
  IF v_can_proceed AND EXTRACT(DAY FROM CURRENT_DATE) > 1 THEN
    IF v_limits.current_monthly_queries >= v_limits.monthly_queries THEN
      v_can_proceed := false;
      v_message := format('Límite mensual de consultas alcanzado (%s/%s).', 
        v_limits.current_monthly_queries, v_limits.monthly_queries);
    ELSIF (v_limits.current_monthly_cost + p_estimated_cost) > v_limits.monthly_cost_limit THEN
      v_can_proceed := false;
      v_message := format('Límite mensual de costo alcanzado ($%.4f/$%.4f).', 
        v_limits.current_monthly_cost + p_estimated_cost, v_limits.monthly_cost_limit);
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'can_proceed', v_can_proceed,
    'message', v_message,
    'daily_queries_used', v_limits.current_daily_queries,
    'daily_queries_limit', v_limits.daily_queries,
    'daily_cost_used', v_limits.current_daily_cost,
    'daily_cost_limit', v_limits.daily_cost_limit,
    'monthly_queries_used', v_limits.current_monthly_queries,
    'monthly_queries_limit', v_limits.monthly_queries,
    'monthly_cost_used', v_limits.current_monthly_cost,
    'monthly_cost_limit', v_limits.monthly_cost_limit
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Función para actualizar contadores después de consulta
CREATE OR REPLACE FUNCTION update_user_query_usage(
  p_user_id UUID,
  p_actual_cost NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Asegurar que existe el registro
  INSERT INTO user_query_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Resetear contadores diarios si es nuevo día
  UPDATE user_query_limits
  SET current_daily_queries = 0,
      current_daily_cost = 0,
      last_reset_date = v_today
  WHERE user_id = p_user_id 
    AND last_reset_date < v_today;
  
  -- Actualizar contadores
  UPDATE user_query_limits
  SET current_daily_queries = current_daily_queries + 1,
      current_daily_cost = current_daily_cost + p_actual_cost,
      current_monthly_queries = current_monthly_queries + 1,
      current_monthly_cost = current_monthly_cost + p_actual_cost,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para resetear límites mensuales (ejecutar el día 1 de cada mes)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS INTEGER AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  UPDATE user_query_limits
  SET current_monthly_queries = 0,
      current_monthly_cost = 0,
      updated_at = CURRENT_TIMESTAMP
  WHERE EXTRACT(DAY FROM CURRENT_DATE) = 1;
  
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Vista para monitoreo de uso
CREATE OR REPLACE VIEW v_user_usage_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name || ' ' || u.last_name as user_name,
  COALESCE(ul.daily_queries, 0) as daily_queries_limit,
  COALESCE(ul.current_daily_queries, 0) as daily_queries_used,
  COALESCE(ul.daily_cost_limit, 0.05) as daily_cost_limit,
  COALESCE(ul.current_daily_cost, 0) as daily_cost_used,
  COALESCE(ul.monthly_queries, 1000) as monthly_queries_limit,
  COALESCE(ul.current_monthly_queries, 0) as monthly_queries_used,
  COALESCE(ul.monthly_cost_limit, 1.00) as monthly_cost_limit,
  COALESCE(ul.current_monthly_cost, 0) as monthly_cost_used,
  CASE 
    WHEN COALESCE(ul.current_daily_queries, 0) >= COALESCE(ul.daily_queries, 50) THEN 'daily_limit_reached'
    WHEN COALESCE(ul.current_daily_cost, 0) >= COALESCE(ul.daily_cost_limit, 0.05) THEN 'daily_cost_reached'
    WHEN COALESCE(ul.current_monthly_queries, 0) >= COALESCE(ul.monthly_queries, 1000) THEN 'monthly_limit_reached'
    WHEN COALESCE(ul.current_monthly_cost, 0) >= COALESCE(ul.monthly_cost_limit, 1.00) THEN 'monthly_cost_reached'
    ELSE 'ok'
  END as status
FROM users u
LEFT JOIN user_query_limits ul ON ul.user_id = u.id;

-- 6. Comentarios
COMMENT ON TABLE user_query_limits IS 'Límites de consultas y costos por usuario para control de presupuesto';
COMMENT ON FUNCTION check_user_query_limits IS 'Verifica si un usuario puede realizar una consulta basado en límites diarios y mensuales';
COMMENT ON FUNCTION update_user_query_usage IS 'Actualiza contadores de uso después de una consulta';
COMMENT ON FUNCTION reset_monthly_limits IS 'Resetea límites mensuales el día 1 de cada mes';

