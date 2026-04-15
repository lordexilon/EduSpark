-- 37_diagnose_performance_issues.sql
-- Script para diagnosticar problemas de rendimiento en course_units
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR TRIGGERS EN course_units
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'course_units'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- =====================================================
-- VERIFICAR ÍNDICES EN course_units
-- =====================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'course_units'
  AND schemaname = 'public'
ORDER BY indexname;

-- =====================================================
-- VERIFICAR ÍNDICES EN courses (para las políticas RLS)
-- =====================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'courses'
  AND schemaname = 'public'
ORDER BY indexname;

-- =====================================================
-- VERIFICAR ESTADÍSTICAS DE TABLAS
-- =====================================================

SELECT 
  schemaname,
  relname as tablename,
  n_live_tup as row_count,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('course_units', 'courses')
ORDER BY relname;

-- =====================================================
-- VERIFICAR POLÍTICAS RLS ACTUALES (RESUMEN)
-- =====================================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%IN%' THEN 'Usa IN (optimizado)'
    WHEN qual::text LIKE '%EXISTS%' THEN 'Usa EXISTS (puede ser lento)'
    ELSE 'Otra expresión'
  END as policy_type,
  LENGTH(qual::text) as expression_length
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'course_units'
ORDER BY policyname, cmd;

-- =====================================================
-- VERIFICAR SI HAY CONSTRAINTS QUE PUEDAN SER LENTAS
-- =====================================================

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.course_units'::regclass
ORDER BY contype, conname;

-- =====================================================
-- RECOMENDACIONES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Diagnóstico completado';
  RAISE NOTICE '';
  RAISE NOTICE 'Verifica:';
  RAISE NOTICE '1. Si hay triggers en course_units, pueden causar lentitud';
  RAISE NOTICE '2. Si falta el índice idx_courses_id_teacher, créalo con:';
  RAISE NOTICE '   CREATE INDEX IF NOT EXISTS idx_courses_id_teacher ON public.courses(id, teacher_id);';
  RAISE NOTICE '3. Si falta el índice idx_course_units_course_id, créalo con:';
  RAISE NOTICE '   CREATE INDEX IF NOT EXISTS idx_course_units_course_id ON public.course_units(course_id);';
  RAISE NOTICE '4. Si las tablas no se han analizado recientemente, ejecuta:';
  RAISE NOTICE '   ANALYZE public.courses;';
  RAISE NOTICE '   ANALYZE public.course_units;';
END $$;

