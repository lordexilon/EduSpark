-- 34_disable_rls_temp_course_units.sql
-- Script TEMPORAL para deshabilitar RLS en course_units y verificar si ese es el problema
-- ⚠️ ADVERTENCIA: Esto deshabilita la seguridad RLS. Solo usar para diagnóstico.
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- DESHABILITAR RLS TEMPORALMENTE PARA DIAGNÓSTICO
-- =====================================================

-- Deshabilitar RLS en course_units
ALTER TABLE public.course_units DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'course_units';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ ====================================================';
  RAISE NOTICE '⚠️ RLS DESHABILITADO TEMPORALMENTE en course_units';
  RAISE NOTICE '⚠️ ====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '   1. Prueba actualizar una unidad desde la aplicación';
  RAISE NOTICE '   2. Si funciona, el problema ESTÁ en las políticas RLS';
  RAISE NOTICE '   3. Si NO funciona, el problema es otro (conexión, triggers, etc.)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Después de diagnosticar, vuelve a habilitar RLS';
  RAISE NOTICE '   Ejecuta: ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;';
END $$;

