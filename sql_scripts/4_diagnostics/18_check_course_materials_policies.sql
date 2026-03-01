-- 18_check_course_materials_policies.sql
-- Verificar políticas RLS de course_materials

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'course_materials'
ORDER BY policyname;

-- Verificar si existe función is_admin
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'is_admin'
) as has_is_admin_function;

