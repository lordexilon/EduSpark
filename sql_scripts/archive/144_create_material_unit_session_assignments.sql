-- =====================================================
-- Crear tablas de asignaciones de materiales a unidades y sesiones
-- =====================================================
-- Similar a document_unit_assignments y document_session_assignments pero para materials
-- Permite asignación múltiple de materiales a unidades y sesiones

-- 1. Crear tabla material_unit_assignments
CREATE TABLE IF NOT EXISTS public.material_unit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(material_id, unit_id)
);

-- 2. Crear tabla material_session_assignments
CREATE TABLE IF NOT EXISTS public.material_session_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(material_id, session_id)
);

-- 3. Crear índices para material_unit_assignments
CREATE INDEX IF NOT EXISTS idx_material_unit_assignments_material ON public.material_unit_assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_material_unit_assignments_unit ON public.material_unit_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_material_unit_assignments_assigned_by ON public.material_unit_assignments(assigned_by);

-- 4. Crear índices para material_session_assignments
CREATE INDEX IF NOT EXISTS idx_material_session_assignments_material ON public.material_session_assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_material_session_assignments_session ON public.material_session_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_material_session_assignments_assigned_by ON public.material_session_assignments(assigned_by);

-- 5. Habilitar RLS
ALTER TABLE public.material_unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_session_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para material_unit_assignments
-- Admin puede ver y gestionar todas las asignaciones
DROP POLICY IF EXISTS "admin_full_access_material_unit_assignments" ON public.material_unit_assignments;
CREATE POLICY "admin_full_access_material_unit_assignments"
ON public.material_unit_assignments
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

-- Admin-campus/Coordinator pueden gestionar asignaciones dentro de su institución
DROP POLICY IF EXISTS "institution_access_material_unit_assignments" ON public.material_unit_assignments;
CREATE POLICY "institution_access_material_unit_assignments"
ON public.material_unit_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        JOIN public.user_institutions ui ON ui.user_id = u.id
        JOIN public.course_units cu ON cu.id = material_unit_assignments.unit_id
        JOIN public.courses c ON c.id = cu.course_id
        WHERE u.id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
        AND ui.institution_id = c.institution_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        JOIN public.user_institutions ui ON ui.user_id = u.id
        JOIN public.course_units cu ON cu.id = material_unit_assignments.unit_id
        JOIN public.courses c ON c.id = cu.course_id
        WHERE u.id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
        AND ui.institution_id = c.institution_id
    )
);

-- Teachers pueden gestionar asignaciones de sus propios cursos
DROP POLICY IF EXISTS "teachers_manage_material_unit_assignments" ON public.material_unit_assignments;
CREATE POLICY "teachers_manage_material_unit_assignments"
ON public.material_unit_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.course_units cu
        JOIN public.courses c ON c.id = cu.course_id
        WHERE cu.id = material_unit_assignments.unit_id
        AND c.teacher_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.course_units cu
        JOIN public.courses c ON c.id = cu.course_id
        WHERE cu.id = material_unit_assignments.unit_id
        AND c.teacher_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
);

-- Students pueden leer asignaciones de unidades de cursos en los que están inscritos
DROP POLICY IF EXISTS "students_read_material_unit_assignments" ON public.material_unit_assignments;
CREATE POLICY "students_read_material_unit_assignments"
ON public.material_unit_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.course_units cu
        JOIN public.course_enrollments ce ON ce.course_id = cu.course_id
        WHERE cu.id = material_unit_assignments.unit_id
        AND ce.student_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
);

-- 7. Políticas RLS para material_session_assignments
-- Admin puede ver y gestionar todas las asignaciones
DROP POLICY IF EXISTS "admin_full_access_material_session_assignments" ON public.material_session_assignments;
CREATE POLICY "admin_full_access_material_session_assignments"
ON public.material_session_assignments
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

-- Admin-campus/Coordinator pueden gestionar asignaciones dentro de su institución
DROP POLICY IF EXISTS "institution_access_material_session_assignments" ON public.material_session_assignments;
CREATE POLICY "institution_access_material_session_assignments"
ON public.material_session_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        JOIN public.user_institutions ui ON ui.user_id = u.id
        JOIN public.sessions s ON s.id = material_session_assignments.session_id
        JOIN public.courses c ON c.id = s.course_id
        WHERE u.id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
        AND ui.institution_id = c.institution_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        JOIN public.user_institutions ui ON ui.user_id = u.id
        JOIN public.sessions s ON s.id = material_session_assignments.session_id
        JOIN public.courses c ON c.id = s.course_id
        WHERE u.id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
        AND ui.institution_id = c.institution_id
    )
);

-- Teachers pueden gestionar asignaciones de sus propios cursos
DROP POLICY IF EXISTS "teachers_manage_material_session_assignments" ON public.material_session_assignments;
CREATE POLICY "teachers_manage_material_session_assignments"
ON public.material_session_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.sessions s
        JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = material_session_assignments.session_id
        AND c.teacher_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.sessions s
        JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = material_session_assignments.session_id
        AND c.teacher_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
);

-- Students pueden leer asignaciones de sesiones de cursos en los que están inscritos
DROP POLICY IF EXISTS "students_read_material_session_assignments" ON public.material_session_assignments;
CREATE POLICY "students_read_material_session_assignments"
ON public.material_session_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.sessions s
        JOIN public.course_enrollments ce ON ce.course_id = s.course_id
        WHERE s.id = material_session_assignments.session_id
        AND ce.student_id = COALESCE(
            NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
            auth.uid()
        )
    )
);

-- 8. Función RPC para obtener unidades asignadas a un material
CREATE OR REPLACE FUNCTION public.get_material_units(p_material_id UUID)
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
        cu.id as unit_id,
        cu.title::TEXT as unit_title,
        cu.number as unit_number,
        c.id as course_id,
        c.title::TEXT as course_title,
        c.code::TEXT as course_code,
        mua.assigned_at,
        mua.assigned_by,
        mua.notes
    FROM public.material_unit_assignments mua
    JOIN public.course_units cu ON cu.id = mua.unit_id
    JOIN public.courses c ON c.id = cu.course_id
    WHERE mua.material_id = p_material_id
    ORDER BY c.title, cu.number;
END;
$$;

-- 9. Función RPC para obtener sesiones asignadas a un material
CREATE OR REPLACE FUNCTION public.get_material_sessions(p_material_id UUID)
RETURNS TABLE (
    session_id UUID,
    session_title TEXT,
    course_id INTEGER,
    course_title TEXT,
    course_code TEXT,
    unit_id UUID,
    unit_title TEXT,
    unit_number INT,
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
        s.id as session_id,
        s.title::TEXT as session_title,
        c.id as course_id,
        c.title::TEXT as course_title,
        c.code::TEXT as course_code,
        s.unit_id,
        cu.title::TEXT as unit_title,
        cu.number as unit_number,
        msa.assigned_at,
        msa.assigned_by,
        msa.notes
    FROM public.material_session_assignments msa
    JOIN public.sessions s ON s.id = msa.session_id
    JOIN public.courses c ON c.id = s.course_id
    LEFT JOIN public.course_units cu ON cu.id = s.unit_id
    WHERE msa.material_id = p_material_id
    ORDER BY c.title, cu.number, s.title;
END;
$$;

-- 10. Función RPC para asignar material a múltiples unidades
CREATE OR REPLACE FUNCTION public.assign_material_to_units(
    p_material_id UUID,
    p_unit_ids UUID[],
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    unit_id UUID,
    unit_title TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unit_id UUID;
    v_unit_title TEXT;
BEGIN
    FOREACH v_unit_id IN ARRAY p_unit_ids
    LOOP
        BEGIN
            -- Verificar que la unidad existe
            SELECT cu.title INTO v_unit_title
            FROM public.course_units cu
            WHERE cu.id = v_unit_id;
            
            IF v_unit_title IS NULL THEN
                RETURN QUERY SELECT false, v_unit_id, NULL::TEXT, 'Unidad no encontrada'::TEXT;
                CONTINUE;
            END IF;
            
            -- Insertar asignación (ignorar si ya existe por UNIQUE constraint)
            INSERT INTO public.material_unit_assignments (material_id, unit_id, assigned_by, notes)
            VALUES (p_material_id, v_unit_id, p_assigned_by, p_notes)
            ON CONFLICT (material_id, unit_id) DO NOTHING;
            
            RETURN QUERY SELECT true, v_unit_id, v_unit_title, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT false, v_unit_id, NULL::TEXT, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$;

-- 11. Función RPC para asignar material a múltiples sesiones
CREATE OR REPLACE FUNCTION public.assign_material_to_sessions(
    p_material_id UUID,
    p_session_ids UUID[],
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    session_id UUID,
    session_title TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_session_title TEXT;
BEGIN
    FOREACH v_session_id IN ARRAY p_session_ids
    LOOP
        BEGIN
            -- Verificar que la sesión existe
            SELECT s.title INTO v_session_title
            FROM public.sessions s
            WHERE s.id = v_session_id;
            
            IF v_session_title IS NULL THEN
                RETURN QUERY SELECT false, v_session_id, NULL::TEXT, 'Sesión no encontrada'::TEXT;
                CONTINUE;
            END IF;
            
            -- Insertar asignación (ignorar si ya existe por UNIQUE constraint)
            INSERT INTO public.material_session_assignments (material_id, session_id, assigned_by, notes)
            VALUES (p_material_id, v_session_id, p_assigned_by, p_notes)
            ON CONFLICT (material_id, session_id) DO NOTHING;
            
            RETURN QUERY SELECT true, v_session_id, v_session_title, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT false, v_session_id, NULL::TEXT, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$;

-- 12. Función RPC para desasignar material de una unidad
CREATE OR REPLACE FUNCTION public.unassign_material_from_unit(
    p_material_id UUID,
    p_unit_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.material_unit_assignments
    WHERE material_id = p_material_id
      AND unit_id = p_unit_id;
    
    RETURN FOUND;
END;
$$;

-- 13. Función RPC para desasignar material de una sesión
CREATE OR REPLACE FUNCTION public.unassign_material_from_session(
    p_material_id UUID,
    p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.material_session_assignments
    WHERE material_id = p_material_id
      AND session_id = p_session_id;
    
    RETURN FOUND;
END;
$$;

COMMENT ON TABLE public.material_unit_assignments IS 'Tabla de asignaciones de materiales a múltiples unidades';
COMMENT ON TABLE public.material_session_assignments IS 'Tabla de asignaciones de materiales a múltiples sesiones';
COMMENT ON FUNCTION public.get_material_units(UUID) IS 'Obtiene todas las unidades asignadas a un material';
COMMENT ON FUNCTION public.get_material_sessions(UUID) IS 'Obtiene todas las sesiones asignadas a un material';
COMMENT ON FUNCTION public.assign_material_to_units(UUID, UUID[], UUID, TEXT) IS 'Asigna un material a múltiples unidades';
COMMENT ON FUNCTION public.assign_material_to_sessions(UUID, UUID[], UUID, TEXT) IS 'Asigna un material a múltiples sesiones';
COMMENT ON FUNCTION public.unassign_material_from_unit(UUID, UUID) IS 'Desasigna un material de una unidad';
COMMENT ON FUNCTION public.unassign_material_from_session(UUID, UUID) IS 'Desasigna un material de una sesión';

