-- reactivate_device.sql
-- Función para reactivar un dispositivo inactivo
-- Si ya hay 3 dispositivos activos, desactiva el más antiguo

CREATE OR REPLACE FUNCTION reactivate_device(
    p_user_id UUID,
    p_device_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    removed_device_name VARCHAR
) AS $$
DECLARE
    v_device RECORD;
    v_active_count INT;
    v_oldest_device RECORD;
    v_removed_device_name VARCHAR := NULL;
BEGIN
    -- Verificar que el usuario solo puede reactivar sus propios dispositivos
    IF auth.uid() != p_user_id AND NOT is_admin() THEN
        RETURN QUERY SELECT FALSE, 'No tienes permiso para reactivar este dispositivo'::TEXT, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Verificar que el dispositivo existe y pertenece al usuario
    SELECT * INTO v_device
    FROM public.user_devices
    WHERE id = p_device_id AND user_id = p_user_id;

    IF v_device IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Dispositivo no encontrado'::TEXT, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Si ya está activo, no hacer nada
    IF v_device.is_active THEN
        RETURN QUERY SELECT TRUE, 'El dispositivo ya está activo'::TEXT, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Contar dispositivos activos actuales
    SELECT COUNT(*) INTO v_active_count
    FROM public.user_devices
    WHERE user_id = p_user_id AND is_active = TRUE;

    -- Si ya hay 3 dispositivos activos, desactivar el más antiguo (no el actual)
    IF v_active_count >= 3 THEN
        SELECT id, device_name INTO v_oldest_device
        FROM public.user_devices
        WHERE user_id = p_user_id 
          AND is_active = TRUE
          -- No desactivar el dispositivo actual del usuario
          AND session_id != COALESCE(current_setting('request.jwt.claim.session_id', TRUE), '')
        ORDER BY last_activity_at ASC
        LIMIT 1;

        IF v_oldest_device.id IS NOT NULL THEN
            UPDATE public.user_devices
            SET is_active = FALSE
            WHERE id = v_oldest_device.id;

            v_removed_device_name := v_oldest_device.device_name;
        END IF;
    END IF;

    -- Activar el dispositivo solicitado
    UPDATE public.user_devices
    SET is_active = TRUE, last_activity_at = NOW()
    WHERE id = p_device_id;

    IF v_removed_device_name IS NOT NULL THEN
        RETURN QUERY SELECT 
            TRUE, 
            'Dispositivo reactivado. Se desactivó: ' || v_removed_device_name,
            v_removed_device_name;
    ELSE
        RETURN QUERY SELECT TRUE, 'Dispositivo reactivado correctamente'::TEXT, NULL::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reactivate_device IS 'Reactiva un dispositivo inactivo. Si hay 3 activos, desactiva el más antiguo.';

-- Permisos
GRANT EXECUTE ON FUNCTION reactivate_device TO authenticated;
