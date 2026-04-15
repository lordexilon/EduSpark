-- sql_scripts/154_create_payments_structure.sql
-- Estructura de base de datos para sistema de pagos y suscripciones
-- Vinculado con suspensión/reactivación de estudiantes
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- TABLA DE PLANES DE PAGO / SUSCRIPCIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- Ej: "Mensual", "Trimestral", "Anual"
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL, -- Monto de la cuota
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'one-time'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT payment_plans_billing_cycle_check 
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one-time'))
);

-- =====================================================
-- TABLA DE SUSCRIPCIONES DE ESTUDIANTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_plan_id INTEGER NOT NULL REFERENCES public.payment_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'cancelled', 'expired'
  start_date DATE NOT NULL,
  end_date DATE,
  next_payment_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  suspension_reason TEXT, -- Razón de suspensión (ej: "Pago pendiente")
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT student_subscriptions_status_check 
    CHECK (status IN ('active', 'suspended', 'cancelled', 'expired'))
);

-- =====================================================
-- TABLA DE PAGOS / CUOTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded', 'cancelled'
  payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', 'cash', 'other'
  payment_date DATE,
  due_date DATE NOT NULL, -- Fecha de vencimiento
  paid_at TIMESTAMP,
  transaction_id VARCHAR(255), -- ID de transacción del procesador de pagos
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT payments_status_check 
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'))
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON public.student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON public.student_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_next_payment ON public.student_subscriptions(next_payment_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date) WHERE status = 'pending';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_subscriptions_updated_at
  BEFORE UPDATE ON public.student_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN: Obtener estado de pago de un estudiante
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_student_payment_status(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_subscription JSONB;
  v_unpaid_count INTEGER;
  v_total_paid DECIMAL(10, 2);
  v_next_payment_date DATE;
BEGIN
  -- Obtener suscripción activa
  SELECT jsonb_build_object(
    'id', id,
    'plan_id', payment_plan_id,
    'status', status,
    'start_date', start_date,
    'end_date', end_date,
    'next_payment_date', next_payment_date,
    'auto_renew', auto_renew
  ) INTO v_subscription
  FROM public.student_subscriptions
  WHERE student_id = p_student_id
    AND status IN ('active', 'suspended')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Contar pagos pendientes vencidos
  SELECT COUNT(*) INTO v_unpaid_count
  FROM public.payments p
  JOIN public.student_subscriptions ss ON p.subscription_id = ss.id
  WHERE ss.student_id = p_student_id
    AND p.status = 'pending'
    AND p.due_date < CURRENT_DATE;
  
  -- Sumar total pagado
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE student_id = p_student_id
    AND status = 'paid';
  
  -- Obtener próxima fecha de pago
  SELECT next_payment_date INTO v_next_payment_date
  FROM public.student_subscriptions
  WHERE student_id = p_student_id
    AND status = 'active'
  LIMIT 1;
  
  v_result := jsonb_build_object(
    'has_subscription', v_subscription IS NOT NULL,
    'subscription', v_subscription,
    'unpaid_payments_count', v_unpaid_count,
    'has_unpaid_payments', v_unpaid_count > 0,
    'total_paid', v_total_paid,
    'next_payment_date', v_next_payment_date,
    'is_payment_overdue', v_unpaid_count > 0 AND (v_next_payment_date IS NULL OR v_next_payment_date < CURRENT_DATE)
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- FUNCIÓN: Obtener estado de pago por documento de identidad
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_payment_status_by_identity_document(p_identity_document VARCHAR(50))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar estudiante por documento de identidad
  SELECT id INTO v_student_id
  FROM public.users
  WHERE identity_document = p_identity_document
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Usuario no encontrado',
      'identity_document', p_identity_document
    );
  END IF;
  
  -- Obtener estado de pago
  SELECT public.get_student_payment_status(v_student_id) INTO v_result;
  v_result := v_result || jsonb_build_object('student_id', v_student_id);
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- FUNCIÓN: Vincular suspensión con estado de pago
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_payment_status_before_suspend()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_unpaid_payments BOOLEAN;
  v_subscription_status VARCHAR(20);
  v_subscription_id INTEGER;
BEGIN
  -- Si se está suspendiendo un usuario (is_active = false)
  IF NEW.is_active = false AND OLD.is_active = true THEN
    -- Verificar si tiene pagos pendientes vencidos
    SELECT EXISTS(
      SELECT 1 FROM public.payments p
      JOIN public.student_subscriptions ss ON p.subscription_id = ss.id
      WHERE ss.student_id = NEW.id
        AND p.status = 'pending'
        AND p.due_date < CURRENT_DATE
    ) INTO v_has_unpaid_payments;
    
    -- Verificar estado de suscripción
    SELECT id, status INTO v_subscription_id, v_subscription_status
    FROM public.student_subscriptions
    WHERE student_id = NEW.id
      AND status = 'active'
    LIMIT 1;
    
    -- Si tiene pagos vencidos y suscripción activa, actualizar suscripción
    IF v_has_unpaid_payments AND v_subscription_id IS NOT NULL THEN
      UPDATE public.student_subscriptions
      SET 
        status = 'suspended',
        suspension_reason = 'Pago pendiente vencido',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_subscription_id;
      
      RAISE NOTICE 'Usuario % suspendido por pago pendiente. Suscripción % actualizada.', NEW.id, v_subscription_id;
    END IF;
  END IF;
  
  -- Si se está reactivando un usuario (is_active = true)
  IF NEW.is_active = true AND OLD.is_active = false THEN
    -- Verificar si tiene suscripción suspendida
    SELECT id INTO v_subscription_id
    FROM public.student_subscriptions
    WHERE student_id = NEW.id
      AND status = 'suspended'
    LIMIT 1;
    
    -- Si tiene suscripción suspendida, reactivarla
    IF v_subscription_id IS NOT NULL THEN
      UPDATE public.student_subscriptions
      SET 
        status = 'active',
        suspension_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_subscription_id;
      
      RAISE NOTICE 'Usuario % reactivado. Suscripción % reactivada.', NEW.id, v_subscription_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para vincular suspensión con pagos
DROP TRIGGER IF EXISTS trigger_check_payment_before_suspend ON public.users;
CREATE TRIGGER trigger_check_payment_before_suspend
  BEFORE UPDATE OF is_active ON public.users
  FOR EACH ROW
  WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
  EXECUTE FUNCTION public.check_payment_status_before_suspend();

-- =====================================================
-- DATOS INICIALES: Planes de pago
-- =====================================================
INSERT INTO public.payment_plans (name, description, amount, billing_cycle) VALUES
  ('Mensual', 'Pago mensual recurrente', 50.00, 'monthly'),
  ('Trimestral', 'Pago trimestral (3 meses) - 10% descuento', 135.00, 'quarterly'),
  ('Anual', 'Pago anual (12 meses) - 20% descuento', 500.00, 'yearly')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE public.payment_plans IS 
'Planes de pago disponibles para estudiantes. Define montos y ciclos de facturación.';

COMMENT ON TABLE public.student_subscriptions IS 
'Suscripciones activas de estudiantes a planes de pago. Vinculado con suspensión automática por falta de pago.';

COMMENT ON TABLE public.payments IS 
'Registro de pagos/cuotas realizados por estudiantes. Compatible con integración de pasarelas de pago.';

COMMENT ON FUNCTION public.get_student_payment_status(UUID) IS 
'Obtiene el estado completo de pagos de un estudiante: suscripción, pagos pendientes, total pagado.';

COMMENT ON FUNCTION public.get_payment_status_by_identity_document(VARCHAR) IS 
'Obtiene el estado de pago de un estudiante usando su documento de identidad. Útil para operaciones masivas.';

-- =====================================================
-- PERMISOS RLS (básicos - ajustar según necesidades)
-- =====================================================
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden ver planes activos
CREATE POLICY "Anyone can view active payment plans" ON public.payment_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Política: Estudiantes pueden ver su propia suscripción
CREATE POLICY "Students can view own subscription" ON public.student_subscriptions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Política: Estudiantes pueden ver sus propios pagos
CREATE POLICY "Students can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Política: Admins pueden ver todo (se puede mejorar con funciones is_admin())
-- Por ahora, permitir lectura a authenticated (ajustar según necesidades de seguridad)

-- =====================================================
-- PERMISOS DE EJECUCIÓN
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_student_payment_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_status_by_identity_document(VARCHAR) TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Estructura de pagos creada exitosamente';
  RAISE NOTICE '   - Tabla payment_plans';
  RAISE NOTICE '   - Tabla student_subscriptions';
  RAISE NOTICE '   - Tabla payments';
  RAISE NOTICE '   - Funciones de consulta y triggers creados';
  RAISE NOTICE '   - Planes de pago iniciales insertados';
END $$;

