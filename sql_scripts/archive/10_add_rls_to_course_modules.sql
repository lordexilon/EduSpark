-- 10_add_rls_to_course_modules.sql
-- Agregar políticas RLS a course_modules

-- Habilitar RLS en course_modules si no está habilitado
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "modules_admin_all" ON public.course_modules;
DROP POLICY IF EXISTS "modules_owner_rw" ON public.course_modules;

-- Política para admin: acceso total
CREATE POLICY "modules_admin_all" ON public.course_modules
  FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Política para docentes: pueden leer y escribir módulos de sus cursos
CREATE POLICY "modules_owner_rw" ON public.course_modules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_modules.course_id 
      AND c.teacher_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_modules.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'course_modules'
ORDER BY policyname;

