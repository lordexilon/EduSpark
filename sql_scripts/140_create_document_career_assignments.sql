-- =====================================================
-- Crear tabla de asignaciones de documentos a carreras
-- =====================================================
-- Similar a document_course_assignments pero para carreras

-- 1. Crear tabla document_career_assignments
CREATE TABLE IF NOT EXISTS public.document_career_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.processed_documents(id) ON DELETE CASCADE,
    career_id INTEGER NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, career_id)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_document_career_assignments_document ON public.document_career_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_career_assignments_career ON public.document_career_assignments(career_id);
CREATE INDEX IF NOT EXISTS idx_document_career_assignments_assigned_by ON public.document_career_assignments(assigned_by);

-- 3. Habilitar RLS
ALTER TABLE public.document_career_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para document_career_assignments
-- Admin puede ver y gestionar todas las asignaciones
DROP POLICY IF EXISTS "admin_full_access_career_assignments" ON public.document_career_assignments;
CREATE POLICY "admin_full_access_career_assignments"
ON public.document_career_assignments
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
DROP POLICY IF EXISTS "institution_access_career_assignments" ON public.document_career_assignments;
CREATE POLICY "institution_access_career_assignments"
ON public.document_career_assignments
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
        WHERE pd.id = document_career_assignments.document_id
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
        WHERE pd.id = document_career_assignments.document_id
        AND pd.institution_id = public.get_user_institution_id()
    )
);

-- 5. Función para obtener carreras asignadas a un documento
CREATE OR REPLACE FUNCTION get_document_careers(p_document_id UUID)
RETURNS TABLE (
    career_id INTEGER,
    career_name VARCHAR,
    career_code VARCHAR,
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
        c.id as career_id,
        c.name as career_name,
        c.code as career_code,
        dca.assigned_at,
        dca.assigned_by,
        dca.notes
    FROM document_career_assignments dca
    JOIN careers c ON c.id = dca.career_id
    WHERE dca.document_id = p_document_id
    ORDER BY c.name;
END;
$$;

-- 6. Función para obtener documentos asignados a una carrera
CREATE OR REPLACE FUNCTION get_career_documents(p_career_id INTEGER)
RETURNS TABLE (
    document_id UUID,
    document_title VARCHAR,
    institution_id INTEGER,
    total_chunks INTEGER,
    assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id as document_id,
        pd.title as document_title,
        pd.institution_id,
        pd.total_chunks,
        dca.assigned_at
    FROM document_career_assignments dca
    JOIN processed_documents pd ON pd.id = dca.document_id
    WHERE dca.career_id = p_career_id
    ORDER BY pd.title;
END;
$$;

-- 7. Verificación
SELECT 
    'Tabla document_career_assignments creada' as check_type,
    COUNT(*) as total_assignments
FROM document_career_assignments;

