-- 19_add_rls_to_course_materials.sql
-- Agregar políticas RLS a course_materials

-- Habilitar RLS si no está habilitado
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Students can view course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers can manage course materials" ON public.course_materials;
DROP POLICY IF EXISTS "course_materials_admin_all" ON public.course_materials;

-- Política para admin: acceso total
CREATE POLICY "course_materials_admin_all" ON public.course_materials
  FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Política para docentes: pueden gestionar materiales de sus cursos
CREATE POLICY "Teachers can manage course materials" ON public.course_materials
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

-- Política para estudiantes: pueden ver materiales activos
CREATE POLICY "Students can view course materials" ON public.course_materials
  FOR SELECT 
  USING (is_active = true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'course_materials'
ORDER BY policyname;

