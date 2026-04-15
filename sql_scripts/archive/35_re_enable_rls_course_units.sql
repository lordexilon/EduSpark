-- 35_re_enable_rls_course_units.sql
-- Script para volver a habilitar RLS después del diagnóstico
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de diagnosticar

-- =====================================================
-- HABILITAR RLS NUEVAMENTE
-- =====================================================

-- Habilitar RLS en course_units
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;

-- Verificar que RLS está habilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'course_units';

-- Verificar que las políticas existen
SELECT 
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'course_units'
ORDER BY policyname, cmd;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ RLS habilitado nuevamente en course_units';
  RAISE NOTICE 'Las políticas deberían estar activas ahora';
END $$;

