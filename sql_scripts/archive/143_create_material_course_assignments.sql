-- Script para crear tabla de asignaciones de materiales a múltiples cursos
-- Permite que un material pueda estar asignado a varios cursos del profesor

-- Crear tabla material_course_assignments
CREATE TABLE IF NOT EXISTS public.material_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(material_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_material_course_assignments_material ON public.material_course_assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_material_course_assignments_course ON public.material_course_assignments(course_id);

-- RLS Policy para material_course_assignments
ALTER TABLE public.material_course_assignments ENABLE ROW LEVEL SECURITY;

-- Admin puede hacer todo
DROP POLICY IF EXISTS "admin_full_access_material_assignments" ON public.material_course_assignments;
CREATE POLICY "admin_full_access_material_assignments"
ON public.material_course_assignments
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
) WITH CHECK (
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
DROP POLICY IF EXISTS "institution_access_material_assignments" ON public.material_course_assignments;
CREATE POLICY "institution_access_material_assignments"
ON public.material_course_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    JOIN public.user_institutions ui ON ui.user_id = u.id
    JOIN public.courses c ON c.id = material_course_assignments.course_id
    WHERE u.id = COALESCE(
      NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
      auth.uid()
    )
      AND r.name IN ('admin-campus', 'coordinator')
      AND u.is_active = true
      AND ui.institution_id = c.institution_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    JOIN public.user_institutions ui ON ui.user_id = u.id
    JOIN public.courses c ON c.id = material_course_assignments.course_id
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
DROP POLICY IF EXISTS "teachers_manage_material_assignments" ON public.material_course_assignments;
CREATE POLICY "teachers_manage_material_assignments"
ON public.material_course_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = material_course_assignments.course_id
      AND c.teacher_id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = material_course_assignments.course_id
      AND c.teacher_id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
  )
);

-- Students pueden leer asignaciones de cursos en los que están inscritos
DROP POLICY IF EXISTS "students_read_material_assignments" ON public.material_course_assignments;
CREATE POLICY "students_read_material_assignments"
ON public.material_course_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    WHERE ce.student_id = COALESCE(
      NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
      auth.uid()
    )
    AND ce.course_id = material_course_assignments.course_id
  )
);

-- Función RPC para obtener cursos asignados a un material
CREATE OR REPLACE FUNCTION public.get_material_courses(p_material_id UUID)
RETURNS TABLE (
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
        c.id as course_id,
        c.title::TEXT as course_title,
        c.code::TEXT as course_code,
        mca.assigned_at,
        mca.assigned_by,
        mca.notes
    FROM public.material_course_assignments mca
    JOIN public.courses c ON c.id = mca.course_id
    WHERE mca.material_id = p_material_id
    ORDER BY c.title;
END;
$$;

-- Función RPC para asignar material a múltiples cursos
CREATE OR REPLACE FUNCTION public.assign_material_to_courses(
    p_material_id UUID,
    p_course_ids INTEGER[],
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    course_id INTEGER,
    course_title TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course_id INTEGER;
    v_course_title TEXT;
BEGIN
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        BEGIN
            -- Verificar que el curso existe
            SELECT c.title INTO v_course_title
            FROM public.courses c
            WHERE c.id = v_course_id;
            
            IF v_course_title IS NULL THEN
                RETURN QUERY SELECT false, v_course_id, NULL::TEXT, 'Curso no encontrado'::TEXT;
                CONTINUE;
            END IF;
            
            -- Insertar asignación (ignorar si ya existe por UNIQUE constraint)
            INSERT INTO public.material_course_assignments (material_id, course_id, assigned_by, notes)
            VALUES (p_material_id, v_course_id, p_assigned_by, p_notes)
            ON CONFLICT (material_id, course_id) DO NOTHING;
            
            RETURN QUERY SELECT true, v_course_id, v_course_title, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT false, v_course_id, NULL::TEXT, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$;

-- Función RPC para desasignar material de un curso
CREATE OR REPLACE FUNCTION public.unassign_material_from_course(
    p_material_id UUID,
    p_course_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.material_course_assignments
    WHERE material_id = p_material_id
      AND course_id = p_course_id;
    
    RETURN FOUND;
END;
$$;

COMMENT ON TABLE public.material_course_assignments IS 'Tabla de asignaciones de materiales a múltiples cursos';
COMMENT ON FUNCTION public.get_material_courses(UUID) IS 'Obtiene todos los cursos asignados a un material';
COMMENT ON FUNCTION public.assign_material_to_courses(UUID, INTEGER[], UUID, TEXT) IS 'Asigna un material a múltiples cursos';
COMMENT ON FUNCTION public.unassign_material_from_course(UUID, INTEGER) IS 'Desasigna un material de un curso';

