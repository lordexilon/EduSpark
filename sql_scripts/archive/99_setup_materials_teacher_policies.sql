-- 99_setup_materials_teacher_policies.sql
-- Permite que docentes/admins gestionen los registros en la tabla materials

-- Requiere funciones public.is_admin() y public.is_teacher() ya definidas

-- Política de lectura
DROP POLICY IF EXISTS "materials_teacher_select" ON public.materials;
CREATE POLICY "materials_teacher_select"
ON public.materials
FOR SELECT
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = materials.course_id
      AND c.teacher_id = auth.uid()
  )
);

-- Política de inserción
DROP POLICY IF EXISTS "materials_teacher_insert" ON public.materials;
CREATE POLICY "materials_teacher_insert"
ON public.materials
FOR INSERT
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = materials.course_id
      AND c.teacher_id = auth.uid()
  )
);

-- Política de actualización
DROP POLICY IF EXISTS "materials_teacher_update" ON public.materials;
CREATE POLICY "materials_teacher_update"
ON public.materials
FOR UPDATE
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = materials.course_id
      AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = materials.course_id
      AND c.teacher_id = auth.uid()
  )
);

-- Política de eliminación
DROP POLICY IF EXISTS "materials_teacher_delete" ON public.materials;
CREATE POLICY "materials_teacher_delete"
ON public.materials
FOR DELETE
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = materials.course_id
      AND c.teacher_id = auth.uid()
  )
);

