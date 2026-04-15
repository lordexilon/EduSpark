-- 26_enable_rls_with_simple_policies.sql
-- Rehabilitar RLS con políticas simples

-- Habilitar RLS
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Limpiar todas las políticas
DROP POLICY IF EXISTS "course_materials_admin_all" ON public.course_materials;
DROP POLICY IF EXISTS "course_materials_teacher_all" ON public.course_materials;

-- Crear una sola política simple para admin
CREATE POLICY "course_materials_admin_all" ON public.course_materials
  FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Verificar
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_materials';

SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'course_materials'
ORDER BY policyname;

