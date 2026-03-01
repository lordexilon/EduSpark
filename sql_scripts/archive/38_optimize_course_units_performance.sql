-- 38_optimize_course_units_performance.sql
-- Script para optimizar el rendimiento de course_units
-- Basado en diagnósticos comunes de timeouts intermitentes
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- CREAR/VERIFICAR ÍNDICES CRÍTICOS
-- =====================================================

-- Índice para optimizar las políticas RLS que usan course_id IN (SELECT id FROM courses WHERE teacher_id = ...)
CREATE INDEX IF NOT EXISTS idx_courses_id_teacher 
ON public.courses(id, teacher_id);

-- Índice para optimizar las consultas JOIN en las políticas RLS
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id 
ON public.courses(teacher_id) 
WHERE teacher_id IS NOT NULL;

-- Índice en course_units.course_id para las foreign keys y RLS
CREATE INDEX IF NOT EXISTS idx_course_units_course_id 
ON public.course_units(course_id);

-- Índice compuesto para optimizar las consultas de UPDATE con filtros comunes
CREATE INDEX IF NOT EXISTS idx_course_units_course_order 
ON public.course_units(course_id, order_index) 
WHERE order_index IS NOT NULL;

-- =====================================================
-- ACTUALIZAR ESTADÍSTICAS
-- =====================================================

-- Actualizar estadísticas del optimizador de consultas
ANALYZE public.courses;
ANALYZE public.course_units;

-- =====================================================
-- VERIFICAR ÍNDICES CREADOS
-- =====================================================

SELECT 
  indexname,
  indexdef,
  CASE 
    WHEN indexname LIKE 'idx_%' THEN '✅ Índice personalizado'
    ELSE 'Sistema'
  END as tipo
FROM pg_indexes
WHERE tablename IN ('course_units', 'courses')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- OPTIMIZACIÓN ADICIONAL: VERIFICAR CONFIGURACIÓN DE RLS
-- =====================================================

-- Verificar que RLS esté habilitado correctamente
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('course_units', 'courses');

-- =====================================================
-- RECOMENDACIONES FINALES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Optimización completada';
  RAISE NOTICE '';
  RAISE NOTICE 'Índices creados/verificados:';
  RAISE NOTICE '  - idx_courses_id_teacher: Para políticas RLS optimizadas';
  RAISE NOTICE '  - idx_courses_teacher_id: Para filtros por teacher_id';
  RAISE NOTICE '  - idx_course_units_course_id: Para foreign keys y JOINs';
  RAISE NOTICE '  - idx_course_units_course_order: Para ordenamiento eficiente';
  RAISE NOTICE '';
  RAISE NOTICE 'Estadísticas actualizadas para el optimizador de consultas.';
  RAISE NOTICE '';
  RAISE NOTICE 'Si los timeouts persisten, verifica:';
  RAISE NOTICE '  1. La pestaña Network en DevTools (estado HTTP de las peticiones)';
  RAISE NOTICE '  2. Los logs de Supabase Dashboard → Logs → API';
  RAISE NOTICE '  3. Si hay triggers en course_units que puedan estar causando lentitud';
END $$;

