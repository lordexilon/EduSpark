-- sql_scripts/155_process_payments_and_update_status.sql
-- Función RPC para procesar pagos desde Excel y actualizar estados automáticamente
-- Si pagó → activo, si no pagó → suspendido
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- FUNCIÓN PARA PROCESAR PAGOS Y ACTUALIZAR ESTADOS
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_payments_and_update_status(
  p_users JSONB -- Array de objetos: {identity_document, paid, payment_date, amount, is_active}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user JSONB;
  v_result JSONB;
  v_results JSONB[] := ARRAY[]::JSONB[];
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_total INTEGER;
  v_user_id UUID;
  v_current_status BOOLEAN;
  v_new_status BOOLEAN;
  v_paid_value TEXT;
  v_subscription_id INTEGER;
  v_payment_plan_id INTEGER;
  v_payment_amount DECIMAL(10, 2);
  v_payment_date DATE;
BEGIN
  -- Validar que p_users sea un array
  IF jsonb_typeof(p_users) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'p_users debe ser un array JSON'
    );
  END IF;

  v_total := jsonb_array_length(p_users);

  -- Procesar cada usuario
  FOR v_user IN SELECT * FROM jsonb_array_elements(p_users)
  LOOP
    BEGIN
      -- Validar datos requeridos
      IF v_user->>'identity_document' IS NULL OR v_user->>'identity_document' = '' THEN
        v_result := jsonb_build_object(
          'success', false,
          'identity_document', v_user->>'identity_document',
          'error', 'identity_document es requerido'
        );
        v_failed_count := v_failed_count + 1;
        v_results := array_append(v_results, v_result);
        CONTINUE;
      END IF;

      -- Buscar usuario por identity_document
      SELECT id, is_active INTO v_user_id, v_current_status
      FROM public.users
      WHERE identity_document = v_user->>'identity_document'
      LIMIT 1;

      IF v_user_id IS NULL THEN
        v_result := jsonb_build_object(
          'success', false,
          'identity_document', v_user->>'identity_document',
          'error', 'Usuario no encontrado con este documento de identidad'
        );
        v_failed_count := v_failed_count + 1;
        v_results := array_append(v_results, v_result);
        CONTINUE;
      END IF;

      -- Determinar nuevo estado basado en paid o is_active
      v_paid_value := COALESCE(v_user->>'paid', v_user->>'is_active', '');
      
      -- Si hay campo paid, usarlo para determinar estado
      IF v_user->>'paid' IS NOT NULL AND v_user->>'paid' != '' THEN
        v_paid_value := LOWER(v_user->>'paid');
        v_new_status := CASE
          WHEN v_paid_value IN ('true', '1', 'si', 'yes', 'pagado', 'paid', 'pago', 'sí') THEN true
          WHEN v_paid_value IN ('false', '0', 'no', 'no pagado', 'unpaid', 'sin pago', 'pendiente', 'pending') THEN false
          ELSE NULL
        END;
      -- Si no hay paid pero hay is_active, usarlo
      ELSIF v_user->>'is_active' IS NOT NULL AND v_user->>'is_active' != '' THEN
        v_paid_value := LOWER(v_user->>'is_active');
        v_new_status := CASE
          WHEN v_paid_value IN ('true', '1', 'activo', 'active', 'reactivar', 'reactivate') THEN true
          WHEN v_paid_value IN ('false', '0', 'suspendido', 'suspended', 'suspender', 'suspend') THEN false
          ELSE NULL
        END;
      ELSE
        v_result := jsonb_build_object(
          'success', false,
          'identity_document', v_user->>'identity_document',
          'error', 'Se requiere campo paid o is_active'
        );
        v_failed_count := v_failed_count + 1;
        v_results := array_append(v_results, v_result);
        CONTINUE;
      END IF;

      IF v_new_status IS NULL THEN
        v_result := jsonb_build_object(
          'success', false,
          'identity_document', v_user->>'identity_document',
          'error', 'Valor de paid/is_active no reconocido'
        );
        v_failed_count := v_failed_count + 1;
        v_results := array_append(v_results, v_result);
        CONTINUE;
      END IF;

      -- Si el usuario pagó (v_new_status = true), registrar el pago
      IF v_new_status = true THEN
        -- Buscar suscripción activa del usuario
        SELECT id, payment_plan_id INTO v_subscription_id, v_payment_plan_id
        FROM public.student_subscriptions
        WHERE student_id = v_user_id
          AND status IN ('active', 'suspended')
        ORDER BY created_at DESC
        LIMIT 1;

        -- Si tiene suscripción, registrar el pago
        IF v_subscription_id IS NOT NULL THEN
          -- Obtener monto del plan o usar el proporcionado
          IF v_user->>'amount' IS NOT NULL AND v_user->>'amount' != '' THEN
            v_payment_amount := (v_user->>'amount')::DECIMAL;
          ELSE
            SELECT amount INTO v_payment_amount
            FROM public.payment_plans
            WHERE id = v_payment_plan_id;
          END IF;

          -- Obtener fecha de pago
          IF v_user->>'payment_date' IS NOT NULL AND v_user->>'payment_date' != '' THEN
            v_payment_date := (v_user->>'payment_date')::DATE;
          ELSE
            v_payment_date := CURRENT_DATE;
          END IF;

          -- Registrar el pago
          INSERT INTO public.payments (
            subscription_id,
            student_id,
            amount,
            currency,
            status,
            payment_date,
            due_date,
            paid_at,
            payment_method
          ) VALUES (
            v_subscription_id,
            v_user_id,
            COALESCE(v_payment_amount, 50.00), -- Default si no hay monto
            'USD',
            'paid',
            v_payment_date,
            v_payment_date, -- due_date igual a payment_date si se paga a tiempo
            CURRENT_TIMESTAMP,
            'manual_import' -- Método de pago manual desde importación
          );

          -- Actualizar suscripción si estaba suspendida
          UPDATE public.student_subscriptions
          SET 
            status = 'active',
            suspension_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = v_subscription_id
            AND status = 'suspended';

          -- Calcular próxima fecha de pago
          DECLARE
            v_billing_cycle VARCHAR(20);
            v_next_payment DATE;
          BEGIN
            SELECT billing_cycle INTO v_billing_cycle
            FROM public.payment_plans
            WHERE id = v_payment_plan_id;

            v_next_payment := v_payment_date;
            CASE v_billing_cycle
              WHEN 'monthly' THEN
                v_next_payment := v_next_payment + INTERVAL '1 month';
              WHEN 'quarterly' THEN
                v_next_payment := v_next_payment + INTERVAL '3 months';
              WHEN 'yearly' THEN
                v_next_payment := v_next_payment + INTERVAL '1 year';
              ELSE
                v_next_payment := v_next_payment + INTERVAL '1 month';
            END CASE;

            UPDATE public.student_subscriptions
            SET next_payment_date = v_next_payment
            WHERE id = v_subscription_id;
          END;
        END IF;
      END IF;

      -- Actualizar estado del usuario
      UPDATE public.users
      SET 
        is_active = v_new_status,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;

      -- Construir mensaje
      DECLARE
        v_action TEXT;
        v_message TEXT;
      BEGIN
        IF v_new_status = true THEN
          v_action := 'reactivado';
          IF v_current_status = false THEN
            v_message := 'Usuario reactivado y pago registrado exitosamente';
          ELSE
            v_message := 'Pago registrado, usuario continúa activo';
          END IF;
        ELSE
          v_action := 'suspendido';
          IF v_current_status = true THEN
            v_message := 'Usuario suspendido por falta de pago';
          ELSE
            v_message := 'Usuario ya estaba suspendido';
          END IF;
        END IF;

        v_result := jsonb_build_object(
          'success', true,
          'user_id', v_user_id,
          'identity_document', v_user->>'identity_document',
          'previous_status', v_current_status,
          'new_status', v_new_status,
          'payment_registered', v_new_status = true AND v_subscription_id IS NOT NULL,
          'message', v_message
        );
      END;

      v_success_count := v_success_count + 1;
      v_results := array_append(v_results, v_result);

    EXCEPTION
      WHEN OTHERS THEN
        v_result := jsonb_build_object(
          'success', false,
          'identity_document', v_user->>'identity_document',
          'error', SQLERRM
        );
        v_failed_count := v_failed_count + 1;
        v_results := array_append(v_results, v_result);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'success_count', v_success_count,
    'failed_count', v_failed_count,
    'results', array_to_json(v_results)::JSONB
  );
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.process_payments_and_update_status(JSONB) TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION public.process_payments_and_update_status IS 
'Procesa pagos desde Excel/CSV y actualiza estados automáticamente.
Si paid = true/si/pagado → registra pago y activa usuario
Si paid = false/no/no pagado → suspende usuario
Formato: Array JSON con objetos {identity_document, paid, payment_date?, amount?}';

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Función process_payments_and_update_status creada exitosamente';
  RAISE NOTICE '   Procesa pagos y actualiza estados automáticamente';
  RAISE NOTICE '   Si pagó → activo, si no pagó → suspendido';
END $$;

