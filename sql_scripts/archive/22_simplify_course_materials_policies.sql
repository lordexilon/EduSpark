-- 22_simplify_course_materials_policies.sql
-- Simplificar las políticas de course_materials eliminando duplicadas

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Students can view course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can manage course materials" ON public.course_materials;
DROP POLICY IF EXISTS "cm_delete_auth" ON public.course_materials;
DROP POLICY IF EXISTS "cm_insert_auth" ON public.course_materials;
DROP POLICY IF EXISTS "cm_read_auth" ON public.course_materials;
DROP POLICY IF EXISTS "cm_update_auth" ON public.course_materials;
DROP POLICY IF EXISTS "cmat_del_roles" ON public.course_materials;
DROP POLICY IF EXISTS "cmat_ins_roles" ON public.course_materials;
DROP POLICY IF EXISTS "cmat_sel_auth" ON public.course_materials;
DROP POLICY IF EXISTS "cmat_upd_roles" ON public.course_materials;
DROP POLICY IF EXISTS "course_materials_admin_all" ON public.course_materials;

-- Crear políticas simplificadas y limpias
CREATE POLICY "course_materials_admin_all" ON public.course_materials
  FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "course_materials_teacher_all" ON public.course_materials
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_materials.course_id 
      AND c.teacher_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_materials.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Verificar que solo quedaron 2 políticas
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'course_materials'
ORDER BY policyname;

