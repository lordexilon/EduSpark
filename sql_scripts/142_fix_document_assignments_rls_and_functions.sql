-- =====================================================
-- Corregir RLS para document_course_assignments y verificar funciones
-- =====================================================

-- 1. Verificar y corregir políticas RLS para document_course_assignments
-- Asegurar que admin pueda insertar/actualizar/eliminar

-- Primero, eliminar todas las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "admin_full_access_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "view_institution_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "admins_manage_all_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "admin_campus_manage_institution_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "coordinators_manage_institution_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "teachers_view_course_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "allow_all_read_assignments" ON public.document_course_assignments;
DROP POLICY IF EXISTS "admin_all_access_assignments" ON public.document_course_assignments;

-- Crear política para admin con verificación directa del JWT (más confiable)
CREATE POLICY "admin_full_access_assignments"
ON public.document_course_assignments
FOR ALL
TO authenticated
USING (
    -- Admin puede ver/gestionar todas las asignaciones
    -- Verificamos directamente usando JWT o auth.uid()
    EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE u.id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
        AND r.name = 'admin'
        AND u.is_active = true
    )
    OR 
    -- Admin-campus y coordinator solo ven/gestionan asignaciones de documentos de su institución
    (
        EXISTS (
            SELECT 1 
            FROM public.users u 
            JOIN public.roles r ON u.role_id = r.id 
            WHERE u.id = COALESCE(
                NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
                auth.uid()
            )
            AND r.name IN ('admin-campus', 'coordinator')
            AND u.is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM processed_documents pd
            WHERE pd.id = document_course_assignments.document_id
            AND pd.institution_id = public.get_user_institution_id()
            AND public.get_user_institution_id() IS NOT NULL
        )
    )
)
WITH CHECK (
    -- Admin puede crear/actualizar todas las asignaciones
    EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE u.id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
        AND r.name = 'admin'
        AND u.is_active = true
    )
    OR 
    -- Admin-campus y coordinator solo pueden crear/actualizar asignaciones de documentos de su institución
    (
        EXISTS (
            SELECT 1 
            FROM public.users u 
            JOIN public.roles r ON u.role_id = r.id 
            WHERE u.id = COALESCE(
                NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
                auth.uid()
            )
            AND r.name IN ('admin-campus', 'coordinator')
            AND u.is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM processed_documents pd
            WHERE pd.id = document_course_assignments.document_id
            AND pd.institution_id = public.get_user_institution_id()
            AND public.get_user_institution_id() IS NOT NULL
        )
    )
);

-- 2. Verificar que las funciones get_document_units y get_document_sessions existan
-- Si no existen, crearlas

-- Función get_document_units
CREATE OR REPLACE FUNCTION public.get_document_units(p_document_id UUID)
RETURNS TABLE (
    unit_id UUID,
    unit_title TEXT,
    unit_number INT,
    course_id INTEGER,
    course_title TEXT,
    course_code TEXT,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID,
    notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cu.id::UUID as unit_id,
        cu.title::TEXT as unit_title,
        cu.number::INT as unit_number,
        c.id::INTEGER as course_id,
        c.title::TEXT as course_title,
        COALESCE(c.code, '')::TEXT as course_code,
        dua.assigned_at,
        dua.assigned_by,
        COALESCE(dua.notes, '')::TEXT as notes
    FROM public.document_unit_assignments dua
    JOIN public.course_units cu ON cu.id = dua.unit_id
    JOIN public.courses c ON c.id = cu.course_id
    WHERE dua.document_id = p_document_id
    ORDER BY c.title, cu.number;
END;
$$;

-- Función get_document_sessions
CREATE OR REPLACE FUNCTION public.get_document_sessions(p_document_id UUID)
RETURNS TABLE (
    session_id UUID,
    session_title TEXT,
    course_id INTEGER,
    course_title TEXT,
    course_code TEXT,
    unit_id UUID,
    unit_title TEXT,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID,
    notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::UUID as session_id,
        s.title::TEXT as session_title,
        c.id::INTEGER as course_id,
        c.title::TEXT as course_title,
        COALESCE(c.code, '')::TEXT as course_code,
        s.unit_id::UUID as unit_id,
        COALESCE(cu.title, '')::TEXT as unit_title,
        dsa.assigned_at,
        dsa.assigned_by,
        COALESCE(dsa.notes, '')::TEXT as notes
    FROM public.document_session_assignments dsa
    JOIN public.sessions s ON s.id = dsa.session_id
    JOIN public.courses c ON c.id = s.course_id
    LEFT JOIN public.course_units cu ON cu.id = s.unit_id
    WHERE dsa.document_id = p_document_id
    ORDER BY c.title, s.starts_at;
END;
$$;

-- 3. Verificar que las tablas document_unit_assignments y document_session_assignments existan
-- Si no existen, el script 141 debe ejecutarse primero

-- 4. Verificación final
SELECT 
    'Políticas document_course_assignments' as check_type,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'document_course_assignments'
UNION ALL
SELECT 
    'Función get_document_units' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_document_units' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 1 ELSE 0 END
UNION ALL
SELECT 
    'Función get_document_sessions' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_document_sessions' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 1 ELSE 0 END;

