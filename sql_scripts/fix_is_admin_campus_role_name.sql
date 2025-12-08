-- =====================================================
-- Script: Corregir nombre de rol en is_admin_campus
-- Descripción: La función busca 'admin_campus' pero el rol se llama 'admin-campus'
-- ⚠️ IMPORTANTE: Este script NO modifica roles de usuarios
-- =====================================================

-- =====================================================
-- PASO 1: Verificar el nombre exacto del rol en la BD
-- =====================================================

SELECT 
  'Verificación de nombre de rol' as verificacion,
  id,
  name as role_name,
  description
FROM public.roles
WHERE name LIKE '%admin%campus%' OR name LIKE '%campus%'
ORDER BY id;

-- =====================================================
-- PASO 2: Corregir la función is_admin_campus
-- =====================================================

-- Recrear la función con el nombre correcto del rol
CREATE OR REPLACE FUNCTION public.is_admin_campus()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'admin-campus'  -- CORREGIDO: usar 'admin-campus' en lugar de 'admin_campus'
  );
$$;

-- =====================================================
-- PASO 3: Verificar que la función se corrigió
-- =====================================================

SELECT 
  '✅ Función corregida' as verificacion,
  routine_name,
  security_type,
  CASE 
    WHEN routine_definition LIKE '%admin-campus%' THEN '✅ Busca: admin-campus (correcto)'
    WHEN routine_definition LIKE '%admin_campus%' THEN '❌ Busca: admin_campus (incorrecto)'
    ELSE '⚠️ No se encontró patrón'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_campus';

-- =====================================================
-- PASO 4: Verificar que la función funciona
-- =====================================================

-- Esta consulta debería devolver true cuando se ejecuta como admin-campus
-- (Ejecutar como admin-campus para verificar)
SELECT 
  'Prueba de función corregida' as verificacion,
  public.is_admin_campus() as resultado_funcion,
  auth.uid() as usuario_actual,
  CASE 
    WHEN public.is_admin_campus() THEN '✅ Función funciona correctamente'
    ELSE '❌ Función NO funciona'
  END as estado;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Función is_admin_campus() corregida';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Cambio realizado:';
  RAISE NOTICE '   - Antes: buscaba r.name = ''admin_campus'' (con guión bajo)';
  RAISE NOTICE '   - Ahora: busca r.name = ''admin-campus'' (con guión)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos pasos:';
  RAISE NOTICE '   1. Recarga la página /teacher/students';
  RAISE NOTICE '   2. El admin-campus debería ver todos los usuarios de su institución';
  RAISE NOTICE '   3. Incluyendo estudiantes, teachers, etc.';
END $$;

