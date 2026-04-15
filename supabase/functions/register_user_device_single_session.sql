-- =====================================================
-- FUNCIÓN: Registrar Dispositivo con Control de Sesión Única
-- =====================================================
-- Esta función registra un nuevo dispositivo y garantiza que:
-- 1. Solo haya MÁXIMO 3 dispositivos registrados por usuario
-- 2. Solo haya 1 SESIÓN ACTIVA a la vez

-- PASO 1: Eliminar TODAS las versiones de la función existente
-- Esto es necesario porque puede haber múltiples sobrecargas
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE proname = 'register_user_device' 
        AND pg_namespace.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.register_user_device(' || r.argtypes || ') CASCADE';
        RAISE NOTICE 'Eliminada función: register_user_device(%)', r.argtypes;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION register_user_device(
    p_user_id UUID,
    p_device_fingerprint TEXT,
    p_device_name TEXT,
    p_device_type TEXT,
    p_browser TEXT,
    p_os TEXT,
    p_session_id TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    device_id UUID,
    removed_device_id UUID,
    removed_device_name TEXT,
    closed_sessions INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_device_id UUID;
    v_device_count INT;
    v_oldest_device_id UUID;
    v_oldest_device_name TEXT;
    v_closed_count INT := 0;
BEGIN
    -- 1. CERRAR TODAS LAS SESIONES ACTIVAS EN OTROS DISPOSITIVOS
    -- Solo puede haber 1 sesión activa a la vez
    UPDATE user_devices
    SET 
        is_active = FALSE,
        session_id = NULL,
        updated_at = NOW()
    WHERE 
        user_id = p_user_id 
        AND is_active = TRUE;
    
    GET DIAGNOSTICS v_closed_count = ROW_COUNT;
    
    RAISE NOTICE 'Sesiones cerradas: %', v_closed_count;

    -- 2. VERIFICAR SI EL DISPOSITIVO YA EXISTE (por fingerprint)
    SELECT id INTO v_existing_device_id
    FROM user_devices
    WHERE user_id = p_user_id 
      AND device_fingerprint = p_device_fingerprint
    LIMIT 1;

    IF v_existing_device_id IS NOT NULL THEN
        -- El dispositivo ya existe, actualizar y activar
        RAISE NOTICE 'Dispositivo existente encontrado: %', v_existing_device_id;
        
        UPDATE user_devices
        SET 
            last_activity_at = NOW(),
            is_active = TRUE,
            session_id = p_session_id,
            ip_address = p_ip_address::inet,
            updated_at = NOW()
        WHERE id = v_existing_device_id;

        RETURN QUERY SELECT 
            TRUE as success,
            'Sesión iniciada en dispositivo existente' as message,
            v_existing_device_id as device_id,
            NULL::UUID as removed_device_id,
            NULL::TEXT as removed_device_name,
            v_closed_count as closed_sessions;
        RETURN;
    END IF;

    -- 3. VERIFICAR LÍMITE DE DISPOSITIVOS (máximo 3)
    SELECT COUNT(*) INTO v_device_count
    FROM user_devices
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Dispositivos registrados: %', v_device_count;

    -- 4. SI YA HAY 3 DISPOSITIVOS, ELIMINAR EL MÁS ANTIGUO
    IF v_device_count >= 3 THEN
        RAISE NOTICE 'Límite alcanzado, eliminando dispositivo más antiguo';
        
        SELECT id, device_name INTO v_oldest_device_id, v_oldest_device_name
        FROM user_devices
        WHERE user_id = p_user_id
        ORDER BY first_login_at ASC
        LIMIT 1;

       RAISE NOTICE 'Dispositivo a eliminar: % (%)', v_oldest_device_id, v_oldest_device_name;

        DELETE FROM user_devices
        WHERE id = v_oldest_device_id;
    END IF;

    -- 5. REGISTRAR NUEVO DISPOSITIVO
    INSERT INTO user_devices (
        user_id,
        device_fingerprint,
        device_name,
        device_type,
        browser,
        os,
        session_id,
        ip_address,
        user_agent,
        first_login_at,
        last_activity_at,
        is_active
    ) VALUES (
        p_user_id,
        p_device_fingerprint,
        p_device_name,
        p_device_type,
        p_browser,
        p_os,
        p_session_id,
        p_ip_address::inet,
        p_user_agent,
        NOW(),
        NOW(),
        TRUE  -- Este es el ÚNICO dispositivo activo
    )
    RETURNING id INTO v_existing_device_id;

    RAISE NOTICE 'Nuevo dispositivo registrado: %', v_existing_device_id;

    -- 6. RETORNAR RESULTADO
    RETURN QUERY SELECT 
        TRUE as success,
        CASE 
            WHEN v_oldest_device_id IS NOT NULL THEN 
                'Dispositivo registrado. Se eliminó: ' || v_oldest_device_name
            ELSE 
                'Dispositivo registrado correctamente'
        END as message,
        v_existing_device_id as device_id,
        v_oldest_device_id as removed_device_id,
        v_oldest_device_name as removed_device_name,
        v_closed_count as closed_sessions;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error registrando dispositivo: %', SQLERRM;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================
GRANT EXECUTE ON FUNCTION register_user_device TO authenticated;
GRANT EXECUTE ON FUNCTION register_user_device TO anon;

-- =====================================================
-- COMENTARIO
-- =====================================================
COMMENT ON FUNCTION register_user_device IS 
'Registra un dispositivo y garantiza:
1. Máximo 3 dispositivos por usuario
2. Solo 1 sesión activa a la vez (cierra todas las demás automáticamente)';
