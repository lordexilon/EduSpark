-- 147_fix_ambiguous_unit_id.sql
-- Fix "column reference unit_id is ambiguous" error in assign_material_to_units

-- 1. Drop existing policies on material_unit_assignments to ensure clean slate
DROP POLICY IF EXISTS "admin_full_access_material_unit_assignments" ON public.material_unit_assignments;
DROP POLICY IF EXISTS "institution_access_material_unit_assignments" ON public.material_unit_assignments;
DROP POLICY IF EXISTS "teachers_manage_material_unit_assignments" ON public.material_unit_assignments;
DROP POLICY IF EXISTS "students_read_material_unit_assignments" ON public.material_unit_assignments;

-- 2. Recreate policies with extra care to avoid ambiguity
-- Use fully qualified names and ensure no implicit column references

-- Admin full access
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

-- Institution access (Admin-campus/Coordinator)
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

-- Teachers manage their own courses
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

-- Students read access
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

-- 3. Recreate assign_material_to_units function
-- Ensure no ambiguity in variables or queries
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
    v_target_unit_id UUID;
    v_unit_title TEXT;
BEGIN
    FOREACH v_target_unit_id IN ARRAY p_unit_ids
    LOOP
        BEGIN
            -- Verificar que la unidad existe
            -- Use explicit table alias and column qualification
            SELECT cu.title INTO v_unit_title
            FROM public.course_units cu
            WHERE cu.id = v_target_unit_id;
            
            IF v_unit_title IS NULL THEN
                RETURN QUERY SELECT false, v_target_unit_id, NULL::TEXT, 'Unidad no encontrada'::TEXT;
                CONTINUE;
            END IF;
            
            -- Insertar asignación (ignorar si ya existe por UNIQUE constraint)
            -- Explicitly qualify columns in INSERT (though standard SQL doesn't allow alias in INSERT target)
            INSERT INTO public.material_unit_assignments (material_id, unit_id, assigned_by, notes)
            VALUES (p_material_id, v_target_unit_id, p_assigned_by, p_notes)
            ON CONFLICT (material_id, unit_id) DO NOTHING;
            
            RETURN QUERY SELECT true, v_target_unit_id, v_unit_title, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT false, v_target_unit_id, NULL::TEXT, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$;
