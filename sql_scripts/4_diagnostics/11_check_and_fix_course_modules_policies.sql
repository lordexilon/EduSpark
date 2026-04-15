-- 11_check_and_fix_course_modules_policies.sql
-- Verificar y corregir políticas de course_modules

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

-- Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_modules';

