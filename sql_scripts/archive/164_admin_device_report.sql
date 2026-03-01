// 164_admin_device_report.sql
-- ------------------------------------------------------------
-- Reporte de dispositivos para administradores
-- ------------------------------------------------------------

-- Elimina versiones anteriores para evitar conflicto de tipos de retorno
DROP FUNCTION IF EXISTS public.get_devices_report_admin();
DROP FUNCTION IF EXISTS public.get_devices_report_campus();

-- Función para Admin Global (ver todos los usuarios y dispositivos)
CREATE OR REPLACE FUNCTION public.get_devices_report_admin()
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    institution_name TEXT,
    active_devices_count INTEGER,
    total_devices_count INTEGER,
    last_access TIMESTAMPTZ,
    devices JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.first_name || ' ' || u.last_name               AS user_name,
        u.email::text                                    AS user_email,
        i.name::text                                     AS institution_name,
        COUNT(CASE WHEN ud.is_active THEN 1 END)::INTEGER AS active_devices_count,
        COUNT(ud.id)::INTEGER                            AS total_devices_count,
        MAX(ud.last_activity_at)                        AS last_access,
        jsonb_agg(
            jsonb_build_object(
                'id', ud.id,
                'device_name', ud.device_name,
                'device_type', ud.device_type,
                'browser', ud.browser,
                'os', ud.os,
                'ip_address', ud.ip_address,
                'is_active', ud.is_active,
                'last_activity_at', ud.last_activity_at,
                'session_id', ud.session_id
            )
        )                                               AS devices
    FROM public.users u
    LEFT JOIN public.user_devices ud ON u.id = ud.user_id
    LEFT JOIN public.user_institutions ui ON u.id = ui.user_id AND ui.is_primary = TRUE
    LEFT JOIN public.institutions i ON ui.institution_id = i.id

    GROUP BY u.id, u.first_name, u.last_name, u.email, i.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para Admin‑Campus (solo usuarios de su institución, IP ofuscada)
CREATE OR REPLACE FUNCTION public.get_devices_report_campus()
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    institution_name TEXT,
    active_devices_count INTEGER,
    total_devices_count INTEGER,
    last_access TIMESTAMPTZ,
    devices JSONB
) AS $$
DECLARE
    v_institution_id INTEGER;
BEGIN
    -- Obtener la institución del admin‑campus mediante la función helper
    v_institution_id := get_user_institution_id();

    RETURN QUERY
    SELECT
        u.id,
        u.first_name || ' ' || u.last_name               AS user_name,
        u.email::text                                    AS user_email,
        i.name::text                                     AS institution_name,
        COUNT(CASE WHEN ud.is_active THEN 1 END)::INTEGER AS active_devices_count,
        COUNT(ud.id)::INTEGER                            AS total_devices_count,
        MAX(ud.last_activity_at)                        AS last_access,
        jsonb_agg(
            jsonb_build_object(
                'id', ud.id,
                'device_name', ud.device_name,
                'device_type', ud.device_type,
                'browser', ud.browser,
                'os', ud.os,
                'ip_address', CASE WHEN ud.ip_address IS NOT NULL THEN
                    split_part(ud.ip_address::TEXT, '.', 1) || '.' ||
                    split_part(ud.ip_address::TEXT, '.', 2) || '.xxx.xxx'
                ELSE NULL END,
                'is_active', ud.is_active,
                'last_activity_at', ud.last_activity_at,
                'session_id', ud.session_id
            )
        )                                               AS devices
    FROM public.users u
    LEFT JOIN public.user_devices ud ON u.id = ud.user_id
    INNER JOIN public.user_institutions ui ON u.id = ui.user_id
        AND ui.institution_id = v_institution_id
        AND ui.is_primary = TRUE
    LEFT JOIN public.institutions i ON ui.institution_id = i.id
    WHERE auth.role() = 'admin-campus'
    GROUP BY u.id, u.first_name, u.last_name, u.email, i.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos: permitir a los roles ejecutar sus funciones
GRANT EXECUTE ON FUNCTION public.get_devices_report_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_devices_report_campus() TO anon, authenticated;

-- Comentario: estas funciones devuelven JSON con los dispositivos y ofuscan IP para admin‑campus.
