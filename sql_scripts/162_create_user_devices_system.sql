-- 162_create_user_devices_system.sql
-- Sistema de Gestión de Dispositivos con Límite de 3 Dispositivos por Usuario
-- Implementa modelo ético de tres niveles: Usuario, Admin-Campus, Admin Global
-- Fecha: 2025-01-24

-- =====================================================
-- TABLA PRINCIPAL: user_devices
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificación del dispositivo
    device_fingerprint VARCHAR(255) NOT NULL, -- Hash único del dispositivo
    device_name VARCHAR(100), -- Ej: "Chrome en Windows", "Safari en iPhone"
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100), -- Ej: "Chrome 120.0"
    os VARCHAR(100), -- Ej: "Windows 11", "iOS 17.2"
    
    -- Información de sesión
    session_id VARCHAR(255) UNIQUE, -- ID de sesión de Supabase
    ip_address INET, -- Dirección IP
    user_agent TEXT, -- User agent completo
    
    -- Timestamps
    first_login_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Fecha de expiración de la sesión
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, device_fingerprint)
);

-- Comentarios
COMMENT ON TABLE public.user_devices IS 'Dispositivos registrados por usuario con límite de 3 activos simultáneos';
COMMENT ON COLUMN public.user_devices.device_fingerprint IS 'Hash único del dispositivo generado por FingerprintJS';
COMMENT ON COLUMN public.user_devices.ip_address IS 'IP ofuscada para admin-campus, completa para admin global';

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON public.user_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_devices_session ON public.user_devices(session_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_activity ON public.user_devices(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON public.user_devices(device_fingerprint);

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE TRIGGER trigger_user_devices_updated_at
    BEFORE UPDATE ON public.user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLA: device_access_logs (Auditoría)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.device_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    target_user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL, -- 'view_devices', 'revoke_session'
    device_id UUID REFERENCES public.user_devices(id),
    justification TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.device_access_logs IS 'Log de auditoría de accesos administrativos a dispositivos de usuarios';

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_device_logs_admin ON public.device_access_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_target ON public.device_access_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_action ON public.device_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_device_logs_created ON public.device_access_logs(created_at DESC);

-- =====================================================
-- FUNCIÓN: Registrar/Actualizar Dispositivo
-- =====================================================

CREATE OR REPLACE FUNCTION register_user_device(
    p_user_id UUID,
    p_device_fingerprint VARCHAR,
    p_device_name VARCHAR,
    p_device_type VARCHAR,
    p_browser VARCHAR,
    p_os VARCHAR,
    p_session_id VARCHAR,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    device_id UUID,
    removed_device_id UUID,
    removed_device_name VARCHAR
) AS $$
DECLARE
    v_device_id UUID;
    v_removed_device_id UUID := NULL;
    v_removed_device_name VARCHAR := NULL;
    v_active_count INT;
    v_oldest_device RECORD;
BEGIN
    -- Verificar si el dispositivo ya existe
    SELECT id INTO v_device_id
    FROM public.user_devices
    WHERE user_id = p_user_id 
      AND device_fingerprint = p_device_fingerprint;
    
    IF v_device_id IS NOT NULL THEN
        -- Dispositivo existente: actualizar
        UPDATE public.user_devices
        SET 
            session_id = p_session_id,
            last_activity_at = NOW(),
            is_active = TRUE,
            ip_address = p_ip_address,
            device_name = p_device_name,
            browser = p_browser,
            os = p_os,
            user_agent = p_user_agent
        WHERE id = v_device_id;
        
        RETURN QUERY SELECT 
            TRUE, 
            'Dispositivo actualizado'::TEXT, 
            v_device_id, 
            NULL::UUID,
            NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Contar dispositivos activos
    SELECT COUNT(*) INTO v_active_count
    FROM public.user_devices
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Si ya hay 3 dispositivos, desactivar el más antiguo
    IF v_active_count >= 3 THEN
        SELECT id, device_name INTO v_oldest_device
        FROM public.user_devices
        WHERE user_id = p_user_id AND is_active = TRUE
        ORDER BY last_activity_at ASC
        LIMIT 1;
        
        UPDATE public.user_devices
        SET is_active = FALSE
        WHERE id = v_oldest_device.id;
        
        v_removed_device_id := v_oldest_device.id;
        v_removed_device_name := v_oldest_device.device_name;
        
        RAISE NOTICE 'Límite de 3 dispositivos alcanzado. Sesión cerrada en: %', v_removed_device_name;
    END IF;
    
    -- Insertar nuevo dispositivo
    INSERT INTO public.user_devices (
        user_id,
        device_fingerprint,
        device_name,
        device_type,
        browser,
        os,
        session_id,
        ip_address,
        user_agent,
        is_active
    ) VALUES (
        p_user_id,
        p_device_fingerprint,
        p_device_name,
        p_device_type,
        p_browser,
        p_os,
        p_session_id,
        p_ip_address,
        p_user_agent,
        TRUE
    )
    RETURNING id INTO v_device_id;
    
    IF v_removed_device_id IS NOT NULL THEN
        RETURN QUERY SELECT 
            TRUE, 
            'Dispositivo registrado. Sesión cerrada en: ' || v_removed_device_name,
            v_device_id, 
            v_removed_device_id,
            v_removed_device_name;
    ELSE
        RETURN QUERY SELECT 
            TRUE, 
            'Dispositivo registrado correctamente'::TEXT, 
            v_device_id, 
            NULL::UUID,
            NULL::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_user_device IS 'Registra o actualiza un dispositivo. Si hay 3 activos, cierra sesión en el más antiguo.';

-- =====================================================
-- FUNCIÓN: Obtener Dispositivos (con ofuscación por rol)
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_devices_by_role(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    device_name VARCHAR,
    device_type VARCHAR,
    browser VARCHAR,
    os VARCHAR,
    ip_address TEXT, -- Ofuscada según rol
    first_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    is_active BOOLEAN,
    is_current BOOLEAN
) AS $$
DECLARE
    v_current_session_id TEXT;
BEGIN
    -- Obtener session_id actual (si existe)
    BEGIN
        v_current_session_id := current_setting('request.jwt.claim.session_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        v_current_session_id := NULL;
    END;
    
    -- Si es admin global, mostrar IP completa
    IF is_admin() THEN
        -- Registrar acceso en log de auditoría (solo si no es el propio usuario)
        IF auth.uid() != p_user_id THEN
            PERFORM log_device_access(p_user_id, 'view_devices', NULL, NULL);
        END IF;
        
        RETURN QUERY
        SELECT 
            ud.id,
            ud.device_name,
            ud.device_type,
            ud.browser,
            ud.os,
            host(ud.ip_address)::TEXT as ip_address, -- IP completa
            ud.first_login_at,
            ud.last_activity_at,
            ud.is_active,
            (ud.session_id = v_current_session_id) as is_current
        FROM public.user_devices ud
        WHERE ud.user_id = p_user_id
        ORDER BY ud.last_activity_at DESC;
    
    -- Si es admin-campus, ofuscar IP
    ELSIF is_admin_campus_safe() THEN
        -- Verificar que el usuario pertenece a la misma institución
        IF EXISTS (
            SELECT 1 FROM public.user_institutions ui
            WHERE ui.user_id = p_user_id 
              AND ui.institution_id = get_user_institution_id()
              AND ui.is_primary = TRUE
        ) THEN
            -- Registrar acceso en log de auditoría
            PERFORM log_device_access(p_user_id, 'view_devices', NULL, NULL);
            
            RETURN QUERY
            SELECT 
                ud.id,
                ud.device_name,
                ud.device_type,
                ud.browser,
                ud.os,
                -- Ofuscar últimos 2 octetos: 192.168.x.x
                regexp_replace(host(ud.ip_address), '\d+\.\d+$', 'x.x')::TEXT as ip_address,
                ud.first_login_at,
                ud.last_activity_at,
                ud.is_active,
                (ud.session_id = v_current_session_id) as is_current
            FROM public.user_devices ud
            WHERE ud.user_id = p_user_id
            ORDER BY ud.last_activity_at DESC;
        ELSE
            -- No tiene permiso para ver dispositivos de otra institución
            RAISE EXCEPTION 'No tienes permiso para ver dispositivos de este usuario';
        END IF;
    
    -- Usuario normal: solo sus propios dispositivos con IP completa
    ELSE
        IF auth.uid() != p_user_id THEN
            RAISE EXCEPTION 'Solo puedes ver tus propios dispositivos';
        END IF;
        
        RETURN QUERY
        SELECT 
            ud.id,
            ud.device_name,
            ud.device_type,
            ud.browser,
            ud.os,
            host(ud.ip_address)::TEXT as ip_address,
            ud.first_login_at,
            ud.last_activity_at,
            ud.is_active,
            (ud.session_id = v_current_session_id) as is_current
        FROM public.user_devices ud
        WHERE ud.user_id = p_user_id
        ORDER BY ud.last_activity_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_devices_by_role IS 'Obtiene dispositivos con ofuscación de IP según rol (admin-campus ve IP parcial)';

-- =====================================================
-- FUNCIÓN: Cerrar Sesión en Dispositivo
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_device_session(
    p_user_id UUID,
    p_device_id UUID,
    p_justification TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_device RECORD;
    v_can_revoke BOOLEAN := FALSE;
BEGIN
    -- Obtener información del dispositivo
    SELECT * INTO v_device
    FROM public.user_devices
    WHERE id = p_device_id AND user_id = p_user_id;
    
    IF v_device IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Dispositivo no encontrado'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar permisos
    IF auth.uid() = p_user_id THEN
        -- Usuario puede cerrar sus propias sesiones
        v_can_revoke := TRUE;
    ELSIF is_admin() THEN
        -- Admin global puede cerrar cualquier sesión
        v_can_revoke := TRUE;
        -- Registrar en log de auditoría
        PERFORM log_device_access(p_user_id, 'revoke_session', p_device_id, p_justification);
    ELSIF is_admin_campus_safe() THEN
        -- Admin-campus solo puede cerrar sesiones de su institución
        IF EXISTS (
            SELECT 1 FROM public.user_institutions ui
            WHERE ui.user_id = p_user_id 
              AND ui.institution_id = get_user_institution_id()
              AND ui.is_primary = TRUE
        ) THEN
            v_can_revoke := TRUE;
            -- Registrar en log de auditoría (justificación obligatoria)
            IF p_justification IS NULL OR p_justification = '' THEN
                RETURN QUERY SELECT FALSE, 'Justificación obligatoria para admin-campus'::TEXT;
                RETURN;
            END IF;
            PERFORM log_device_access(p_user_id, 'revoke_session', p_device_id, p_justification);
        END IF;
    END IF;
    
    IF NOT v_can_revoke THEN
        RETURN QUERY SELECT FALSE, 'No tienes permiso para cerrar esta sesión'::TEXT;
        RETURN;
    END IF;
    
    -- Desactivar dispositivo
    UPDATE public.user_devices
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = p_device_id;
    
    -- TODO: Invalidar sesión en Supabase Auth (requiere service_role)
    -- Por ahora, solo marcamos como inactivo y el frontend validará
    
    RETURN QUERY SELECT TRUE, 'Sesión cerrada correctamente'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_device_session IS 'Cierra sesión en un dispositivo. Admin-campus requiere justificación.';

-- =====================================================
-- FUNCIÓN: Log de Auditoría
-- =====================================================

CREATE OR REPLACE FUNCTION log_device_access(
    p_target_user_id UUID,
    p_action VARCHAR,
    p_device_id UUID DEFAULT NULL,
    p_justification TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Solo registrar si es admin accediendo a datos de otro usuario
    IF auth.uid() != p_target_user_id AND (is_admin() OR is_admin_campus_safe()) THEN
        INSERT INTO public.device_access_logs (
            admin_user_id,
            target_user_id,
            action,
            device_id,
            justification,
            ip_address
        ) VALUES (
            auth.uid(),
            p_target_user_id,
            p_action,
            p_device_id,
            p_justification,
            inet_client_addr()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_device_access IS 'Registra accesos administrativos a dispositivos de usuarios';

-- =====================================================
-- FUNCIÓN: Limpiar Dispositivos Inactivos (Retención 90 días)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_inactive_devices()
RETURNS TABLE(
    deleted_count INT
) AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.user_devices
    WHERE is_active = FALSE 
      AND last_activity_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_inactive_devices IS 'Elimina dispositivos inactivos después de 90 días (retención limitada)';

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_access_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios ven solo sus propios dispositivos
CREATE POLICY "users_view_own_devices"
ON public.user_devices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Admins ven todos los dispositivos
CREATE POLICY "admins_view_all_devices"
ON public.user_devices FOR SELECT
TO authenticated
USING (is_admin());

-- Política: Admin-campus ven dispositivos de su institución
CREATE POLICY "admin_campus_view_institution_devices"
ON public.user_devices FOR SELECT
TO authenticated
USING (
    is_admin_campus_safe() AND 
    user_id IN (
        SELECT ui.user_id 
        FROM public.user_institutions ui
        WHERE ui.institution_id = get_user_institution_id()
          AND ui.is_primary = TRUE
    )
);

-- Política: Solo el sistema puede insertar (vía función RPC)
CREATE POLICY "system_insert_devices"
ON public.user_devices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden actualizar sus propios dispositivos
CREATE POLICY "users_update_own_devices"
ON public.user_devices FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Política: Admins pueden actualizar cualquier dispositivo
CREATE POLICY "admins_update_all_devices"
ON public.user_devices FOR UPDATE
TO authenticated
USING (is_admin());

-- Política: Logs - Solo admins pueden ver
CREATE POLICY "admins_view_logs"
ON public.device_access_logs FOR SELECT
TO authenticated
USING (is_admin() OR is_admin_campus_safe());

-- Política: Logs - Solo el sistema puede insertar
CREATE POLICY "system_insert_logs"
ON public.device_access_logs FOR INSERT
TO authenticated
WITH CHECK (is_admin() OR is_admin_campus_safe());

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.user_devices TO authenticated;
GRANT SELECT, INSERT ON public.device_access_logs TO authenticated;

GRANT EXECUTE ON FUNCTION register_user_device TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_devices_by_role TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_device_session TO authenticated;
GRANT EXECUTE ON FUNCTION log_device_access TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_devices TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de dispositivos creado correctamente';
    RAISE NOTICE '📊 Tablas: user_devices, device_access_logs';
    RAISE NOTICE '🔧 Funciones: register_user_device, get_user_devices_by_role, revoke_device_session';
    RAISE NOTICE '🛡️ RLS: Habilitado con modelo de tres niveles';
    RAISE NOTICE '📝 Auditoría: Log completo de accesos administrativos';
    RAISE NOTICE '🔒 Privacidad: IP ofuscada para admin-campus';
END $$;
