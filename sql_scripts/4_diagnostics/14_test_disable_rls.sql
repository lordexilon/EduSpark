-- 14_test_disable_rls.sql
-- Deshabilitar RLS temporalmente para testing

-- Deshabilitar RLS
ALTER TABLE public.course_modules DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_modules';

-- IMPORTANTE: Esto es SOLO para testing.
-- Debes probar el guardado ahora.
-- Si funciona, el problema está en las políticas RLS.

