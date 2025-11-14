-- 33_test_course_units_rls.sql
-- Script de prueba para verificar que las políticas RLS funcionan correctamente
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de ejecutar 32_fix_course_units_rls.sql

-- =====================================================
-- PRUEBAS DE POLÍTICAS RLS
-- =====================================================

-- 1. Verificar usuario actual
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin,
  public.is_teacher() as is_teacher;

-- 2. Intentar leer una unidad específica (prueba SELECT)
SELECT 
  id,
  title,
  course_id
FROM public.course_units 
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'
LIMIT 1;

-- 3. Verificar que puedes leer el curso asociado
SELECT 
  c.id as course_id,
  c.title as course_title,
  c.teacher_id,
  CASE 
    WHEN c.teacher_id = auth.uid() THEN 'Eres el teacher de este curso'
    WHEN public.is_admin() THEN 'Eres admin'
    ELSE 'NO tienes acceso a este curso'
  END as access_status
FROM public.courses c
WHERE c.id IN (
  SELECT course_id 
  FROM public.course_units 
  WHERE id = '93cd6110-d031-43d4-8909-20b687830356'
)
LIMIT 1;

-- 4. Prueba de UPDATE directa (esto debería fallar si las políticas están mal)
-- NOTA: Comenta esta línea si quieres solo verificar sin modificar datos
UPDATE public.course_units 
SET title = title || ' [TEST]'
WHERE id = '93cd6110-d031-43d4-8909-20b687830356'
RETURNING id, title;

-- Si llegaste aquí sin errores, las políticas funcionan correctamente
DO $$
BEGIN
  RAISE NOTICE '✅ PRUEBAS COMPLETADAS';
  RAISE NOTICE 'Si todas las consultas funcionaron, las políticas RLS están correctas';
  RAISE NOTICE 'Si alguna se colgó o falló, revisa los mensajes de error arriba';
END $$;

