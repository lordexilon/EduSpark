-- 13_check_full_policies.sql
-- Ver la definición completa de las políticas

-- Ver la definición completa de las políticas existentes
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
WHERE tablename = 'course_modules'
ORDER BY policyname;

