-- 39_test_learning_objectives_update.sql
-- Script para probar directamente la actualización de learning_objectives con múltiples valores
-- Ejecutar en el SQL Editor de Supabase después de intentar guardar una unidad con múltiples objetivos

-- =====================================================
-- VERIFICAR ESTRUCTURA DE learning_objectives
-- =====================================================

SELECT 
  column_name,
  data_type,
  udt_name,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'course_units'
  AND column_name = 'learning_objectives';

-- =====================================================
-- VERIFICAR DATOS ACTUALES EN course_units
-- =====================================================

SELECT 
  id,
  title,
  learning_objectives,
  array_length(learning_objectives, 1) as objectives_count
FROM public.course_units
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'::uuid
LIMIT 1;

-- =====================================================
-- PRUEBA DIRECTA DE ACTUALIZACIÓN CON MÚLTIPLES OBJETIVOS
-- =====================================================
-- Esta prueba intenta actualizar learning_objectives con un array de 2 elementos
-- Ejecuta esto como el mismo usuario que está intentando guardar desde la aplicación

UPDATE public.course_units
SET learning_objectives = ARRAY['Objetivo de prueba 1', 'Objetivo de prueba 2']
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'::uuid
RETURNING id, title, learning_objectives, array_length(learning_objectives, 1) as objectives_count;

-- =====================================================
-- VERIFICAR SI LA ACTUALIZACIÓN FUNCIONÓ
-- =====================================================

SELECT 
  id,
  title,
  learning_objectives,
  array_length(learning_objectives, 1) as objectives_count
FROM public.course_units
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'::uuid;

-- =====================================================
-- DIAGNÓSTICO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Script de prueba ejecutado';
  RAISE NOTICE '';
  RAISE NOTICE 'Si el UPDATE directo funciona en SQL pero falla desde la aplicación:';
  RAISE NOTICE '  - El problema está en el cliente (frontend/Supabase JS)';
  RAISE NOTICE '  - Revisa la pestaña Network para ver el estado HTTP de la petición';
  RAISE NOTICE '';
  RAISE NOTICE 'Si el UPDATE directo también falla en SQL:';
  RAISE NOTICE '  - El problema está en las políticas RLS o en la estructura de datos';
  RAISE NOTICE '  - Verifica que learning_objectives sea TEXT[] y no otro tipo';
END $$;

