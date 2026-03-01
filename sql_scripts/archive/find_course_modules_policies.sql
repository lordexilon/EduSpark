-- Consulta para encontrar todas las políticas RLS de course_modules
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'course_modules'
ORDER BY policyname;

