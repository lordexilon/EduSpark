-- 20_check_course_materials_full_policies.sql
-- Ver la definición completa de las políticas

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'course_materials'
ORDER BY policyname;

