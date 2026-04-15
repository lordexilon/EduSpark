-- 12_disable_rls_course_modules_temporarily.sql
-- Deshabilitar temporalmente RLS en course_modules para testing

-- Deshabilitar RLS
ALTER TABLE public.course_modules DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_modules';

-- NOTA: Esto es temporal para testing. 
-- Debes volver a habilitar RLS cuando encuentres el problema.

