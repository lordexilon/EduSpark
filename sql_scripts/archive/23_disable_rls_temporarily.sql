-- 23_disable_rls_temporarily.sql
-- Deshabilitar RLS temporalmente para testing

ALTER TABLE public.course_materials DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_materials';

-- NOTA: Esto es solo para diagnosticar el problema.
-- Si funciona sin RLS, el problema está en las políticas.

