-- 68_verify_courses_schema.sql
-- Verifica las columnas reales de la tabla courses
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR COLUMNAS DE LA TABLA courses
-- =====================================================

SELECT 
  '=== COLUMNAS DE LA TABLA courses ===' as verificacion,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- =====================================================
-- VERIFICAR SI EXISTEN COLUMNAS DE IMAGENES
-- =====================================================

SELECT 
  '=== COLUMNAS DE IMÁGENES EN courses ===' as verificacion,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
  AND (
    column_name LIKE '%thumbnail%' OR
    column_name LIKE '%image%' OR
    column_name LIKE '%cover%' OR
    column_name LIKE '%banner%'
  )
ORDER BY column_name;

-- =====================================================
-- VERIFICAR COLUMNAS DE courses EN USO
-- =====================================================

SELECT 
  '=== MUESTRA DE DATOS DE courses ===' as verificacion,
  id,
  title,
  code,
  description,
  status,
  teacher_id,
  subject_id,
  career_id,
  academic_period,
  start_date,
  end_date,
  max_students,
  created_at,
  updated_at
FROM public.courses
ORDER BY id DESC
LIMIT 3;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE SCHEMA DE courses';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script lista todas las columnas de la tabla courses';
  RAISE NOTICE 'para verificar qué columnas existen realmente.';
  RAISE NOTICE '';
  RAISE NOTICE 'Si thumbnail_url no existe, se debe remover del script';
  RAISE NOTICE 'de análisis o agregarlo a la tabla si es necesario.';
  RAISE NOTICE '';
END $$;

