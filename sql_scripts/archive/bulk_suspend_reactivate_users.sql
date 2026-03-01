-- sql_scripts/bulk_suspend_reactivate_users.sql
-- Función RPC para suspender/reactivar usuarios masivamente mediante documento de identidad
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. FUNCIÓN PARA SUSPENDER/REACTIVAR USUARIOS MASIVAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.bulk_suspend_reactivate_users(
  p_users JSONB -- Array de objetos: {identity_document, is_active}
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

      -- Obtener is_active (puede ser boolean o string)
      v_new_status := COALESCE(
        (v_user->>'is_active')::BOOLEAN,
        CASE 
          WHEN LOWER(v_user->>'is_active') = 'true' THEN true
          WHEN LOWER(v_user->>'is_active') = 'false' THEN false
          WHEN LOWER(v_user->>'is_active') = '1' THEN true
          WHEN LOWER(v_user->>'is_active') = '0' THEN false
          WHEN LOWER(v_user->>'is_active') = 'suspender' THEN false
          WHEN LOWER(v_user->>'is_active') = 'reactivar' THEN true
          WHEN LOWER(v_user->>'is_active') = 'suspend' THEN false
          WHEN LOWER(v_user->>'is_active') = 'reactivate' THEN true
          ELSE NULL
        END
      );

      IF v_new_status IS NULL THEN
        v_result := jsonb_build_object(
          'success', false,
          'identity_document', v_user->>'identity_document',
          'error', 'is_active debe ser true/false, 1/0, suspender/reactivar'
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

      -- Actualizar estado
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
        ELSE
          v_action := 'suspendido';
        END IF;

        IF v_current_status = v_new_status THEN
          v_message := format('Usuario ya estaba %s', v_action);
        ELSE
          v_message := format('Usuario %s exitosamente', v_action);
        END IF;

        v_result := jsonb_build_object(
          'success', true,
          'user_id', v_user_id,
          'identity_document', v_user->>'identity_document',
          'previous_status', v_current_status,
          'new_status', v_new_status,
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
-- 2. PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.bulk_suspend_reactivate_users TO authenticated;

-- =====================================================
-- 3. COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION public.bulk_suspend_reactivate_users IS 
'Suspende o reactiva usuarios masivamente mediante documento de identidad.
Formato de entrada: Array JSON con objetos {identity_document, is_active}.
is_active puede ser: true/false, 1/0, "suspender"/"reactivar", "suspend"/"reactivate".';

-- =====================================================
-- 4. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Función bulk_suspend_reactivate_users creada exitosamente';
  RAISE NOTICE '   Permite suspender/reactivar usuarios mediante documento de identidad';
END $$;
