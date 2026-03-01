-- 40_test_frontend_array_issue.sql
-- Script para diagnosticar problemas de serialización de arrays desde el frontend
-- Ejecutar después de intentar guardar desde la aplicación

-- =====================================================
-- VERIFICAR EL ESTADO ACTUAL DE learning_objectives
-- =====================================================

SELECT 
  id,
  title,
  learning_objectives,
  array_length(learning_objectives, 1) as objectives_count,
  pg_typeof(learning_objectives) as array_type
FROM public.course_units
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'::uuid;

-- =====================================================
-- VERIFICAR SI HAY TRIGGERS QUE PUEDAN CAUSAR PROBLEMAS
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'course_units'
  AND event_object_schema = 'public';

-- =====================================================
-- PROBAR ACTUALIZACIÓN CON DIFERENTES FORMATOS DE ARRAY
-- =====================================================

-- Formato 1: Array directo (lo que Supabase JS debería enviar)
UPDATE public.course_units
SET learning_objectives = ARRAY['Objetivo 1', 'Objetivo 2', 'Objetivo 3']
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'::uuid
RETURNING id, learning_objectives;

-- Formato 2: Verificar si el problema es con caracteres especiales
UPDATE public.course_units
SET learning_objectives = ARRAY[
  'Definir qué es un monomio y distinguirlo de otras expresiones algebraicas.',
  'Identificar los componentes de un monomio: coeficiente y parte literal.',
  'Realizar operaciones básicas con monomios: suma, resta y multiplicación.'
]
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'::uuid
RETURNING id, learning_objectives;

-- =====================================================
-- VERIFICAR POLÍTICAS RLS QUE PODRÍAN ESTAR BLOQUEANDO
-- =====================================================

SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'course_units'
  AND cmd = 'UPDATE';

-- =====================================================
-- DIAGNÓSTICO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Script de diagnóstico ejecutado';
  RAISE NOTICE '';
  RAISE NOTICE 'Si los UPDATEs directos funcionan pero el frontend falla:';
  RAISE NOTICE '  - El problema está en Supabase JS client';
  RAISE NOTICE '  - Posible serialización incorrecta del array TEXT[]';
  RAISE NOTICE '  - Verifica los headers HTTP en la pestaña Network';
  RAISE NOTICE '  - Verifica el Content-Type (debe ser application/json)';
  RAISE NOTICE '';
  RAISE NOTICE 'Posibles soluciones:';
  RAISE NOTICE '  1. Enviar learning_objectives como JSON string y convertirlo en un trigger';
  RAISE NOTICE '  2. Dividir la actualización en dos pasos';
  RAISE NOTICE '  3. Usar una función RPC para manejar el array';
END $$;

