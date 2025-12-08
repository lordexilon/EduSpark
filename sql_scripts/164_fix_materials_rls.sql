-- 164_fix_materials_rls.sql
-- Corregir y mejorar las políticas RLS para la tabla materials
-- Asegura que admin-campus y docentes puedan ver sus materiales

-- Habilitar RLS por si acaso
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar acceso (más limpia que poner todo en la política)
CREATE OR REPLACE FUNCTION public.can_access_material(material_course_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Admin global siempre tiene acceso
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- 2. El docente del curso tiene acceso
  IF EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = material_course_id
    AND c.teacher_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Admin Campus / Coordinador tiene acceso si el curso es de su institución
  -- (Verificamos si hay coincidencia de institución entre el usuario actual y el teacher del curso)
  IF EXISTS (
    SELECT 1 
    FROM public.courses c
    JOIN public.user_institutions ui_teacher ON c.teacher_id = ui_teacher.user_id
    JOIN public.user_institutions ui_user ON ui_teacher.institution_id = ui_user.institution_id
    WHERE c.id = material_course_id
    AND ui_user.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('admin-campus', 'coordinator')
    )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Recrear políticas usando la función helper
DROP POLICY IF EXISTS "materials_select_policy" ON public.materials;
DROP POLICY IF EXISTS "materials_teacher_select" ON public.materials;

CREATE POLICY "materials_select_policy"
ON public.materials
FOR SELECT
USING (
  public.can_access_material(course_id)
);

DROP POLICY IF EXISTS "materials_insert_policy" ON public.materials;
DROP POLICY IF EXISTS "materials_teacher_insert" ON public.materials;

CREATE POLICY "materials_insert_policy"
ON public.materials
FOR INSERT
WITH CHECK (
  public.can_access_material(course_id)
);

DROP POLICY IF EXISTS "materials_update_policy" ON public.materials;
DROP POLICY IF EXISTS "materials_teacher_update" ON public.materials;

CREATE POLICY "materials_update_policy"
ON public.materials
FOR UPDATE
USING (
  public.can_access_material(course_id)
);

DROP POLICY IF EXISTS "materials_delete_policy" ON public.materials;
DROP POLICY IF EXISTS "materials_teacher_delete" ON public.materials;

CREATE POLICY "materials_delete_policy"
ON public.materials
FOR DELETE
USING (
  public.can_access_material(course_id)
);

-- Verificar
SELECT count(*) as policies_count 
FROM pg_policies 
WHERE tablename = 'materials';
