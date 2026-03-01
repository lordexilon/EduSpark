-- =====================================================
-- Crear tablas de asignaciones de documentos a unidades y sesiones
-- =====================================================
-- Similar a document_course_assignments pero para unidades y sesiones

-- 1. Crear tabla document_unit_assignments
CREATE TABLE IF NOT EXISTS public.document_unit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.processed_documents(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, unit_id)
);

-- 2. Crear tabla document_session_assignments
CREATE TABLE IF NOT EXISTS public.document_session_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.processed_documents(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, session_id)
);

-- 3. Crear índices para document_unit_assignments
CREATE INDEX IF NOT EXISTS idx_document_unit_assignments_document ON public.document_unit_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_unit_assignments_unit ON public.document_unit_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_document_unit_assignments_assigned_by ON public.document_unit_assignments(assigned_by);

-- 4. Crear índices para document_session_assignments
CREATE INDEX IF NOT EXISTS idx_document_session_assignments_document ON public.document_session_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_session_assignments_session ON public.document_session_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_document_session_assignments_assigned_by ON public.document_session_assignments(assigned_by);

-- 5. Habilitar RLS
ALTER TABLE public.document_unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_session_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para document_unit_assignments
-- Admin puede ver y gestionar todas las asignaciones
DROP POLICY IF EXISTS "admin_full_access_unit_assignments" ON public.document_unit_assignments;
CREATE POLICY "admin_full_access_unit_assignments"
ON public.document_unit_assignments
FOR ALL
TO authenticated
USING (
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
)
WITH CHECK (
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
);

-- Admin-campus y coordinator pueden ver y gestionar asignaciones de su institución
DROP POLICY IF EXISTS "institution_access_unit_assignments" ON public.document_unit_assignments;
CREATE POLICY "institution_access_unit_assignments"
ON public.document_unit_assignments
FOR ALL
TO authenticated
USING (
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
        SELECT 1 
        FROM public.processed_documents pd
        JOIN public.course_units cu ON cu.course_id = (
            SELECT c.id FROM public.courses c 
            WHERE c.institution_id = public.get_user_institution_id()
            LIMIT 1
        )
        WHERE pd.id = document_unit_assignments.document_id
        AND cu.id = document_unit_assignments.unit_id
        AND pd.institution_id = public.get_user_institution_id()
    )
)
WITH CHECK (
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
        SELECT 1 
        FROM public.processed_documents pd
        JOIN public.course_units cu ON cu.course_id = (
            SELECT c.id FROM public.courses c 
            WHERE c.institution_id = public.get_user_institution_id()
            LIMIT 1
        )
        WHERE pd.id = document_unit_assignments.document_id
        AND cu.id = document_unit_assignments.unit_id
        AND pd.institution_id = public.get_user_institution_id()
    )
);

-- Teachers pueden leer asignaciones de sus cursos
DROP POLICY IF EXISTS "teachers_read_unit_assignments" ON public.document_unit_assignments;
CREATE POLICY "teachers_read_unit_assignments"
ON public.document_unit_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.course_units cu
        JOIN public.courses c ON c.id = cu.course_id
        WHERE cu.id = document_unit_assignments.unit_id
        AND c.teacher_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
);

-- 7. Políticas RLS para document_session_assignments
-- Admin puede ver y gestionar todas las asignaciones
DROP POLICY IF EXISTS "admin_full_access_session_assignments" ON public.document_session_assignments;
CREATE POLICY "admin_full_access_session_assignments"
ON public.document_session_assignments
FOR ALL
TO authenticated
USING (
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
)
WITH CHECK (
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
);

-- Admin-campus y coordinator pueden ver y gestionar asignaciones de su institución
DROP POLICY IF EXISTS "institution_access_session_assignments" ON public.document_session_assignments;
CREATE POLICY "institution_access_session_assignments"
ON public.document_session_assignments
FOR ALL
TO authenticated
USING (
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
        SELECT 1 
        FROM public.processed_documents pd
        JOIN public.sessions s ON s.course_id = (
            SELECT c.id FROM public.courses c 
            WHERE c.institution_id = public.get_user_institution_id()
            LIMIT 1
        )
        WHERE pd.id = document_session_assignments.document_id
        AND s.id = document_session_assignments.session_id
        AND pd.institution_id = public.get_user_institution_id()
    )
)
WITH CHECK (
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
        SELECT 1 
        FROM public.processed_documents pd
        JOIN public.sessions s ON s.course_id = (
            SELECT c.id FROM public.courses c 
            WHERE c.institution_id = public.get_user_institution_id()
            LIMIT 1
        )
        WHERE pd.id = document_session_assignments.document_id
        AND s.id = document_session_assignments.session_id
        AND pd.institution_id = public.get_user_institution_id()
    )
);

-- Teachers pueden leer asignaciones de sus cursos
DROP POLICY IF EXISTS "teachers_read_session_assignments" ON public.document_session_assignments;
CREATE POLICY "teachers_read_session_assignments"
ON public.document_session_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.sessions s
        JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = document_session_assignments.session_id
        AND c.teacher_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
);

-- 8. Función para obtener unidades asignadas a un documento
CREATE OR REPLACE FUNCTION get_document_units(p_document_id UUID)
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
    FROM document_unit_assignments dua
    JOIN course_units cu ON cu.id = dua.unit_id
    JOIN courses c ON c.id = cu.course_id
    WHERE dua.document_id = p_document_id
    ORDER BY c.title, cu.number;
END;
$$;

-- 9. Función para obtener sesiones asignadas a un documento
CREATE OR REPLACE FUNCTION get_document_sessions(p_document_id UUID)
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
    FROM document_session_assignments dsa
    JOIN sessions s ON s.id = dsa.session_id
    JOIN courses c ON c.id = s.course_id
    LEFT JOIN course_units cu ON cu.id = s.unit_id
    WHERE dsa.document_id = p_document_id
    ORDER BY c.title, s.starts_at;
END;
$$;

-- 10. Verificación
SELECT 
    'Tabla document_unit_assignments creada' as check_type,
    COUNT(*) as total_unit_assignments
FROM document_unit_assignments
UNION ALL
SELECT 
    'Tabla document_session_assignments creada' as check_type,
    COUNT(*) as total_session_assignments
FROM document_session_assignments;

