-- =====================================================
-- Script: Verificar discrepancia en nombre de rol
-- Descripción: Verifica si el nombre del rol en la BD coincide con lo que busca la función
-- =====================================================

-- 1. Verificar todos los roles en la base de datos
SELECT 
  'Roles en la base de datos' as verificacion,
  id,
  name as role_name,
  description
FROM public.roles
ORDER BY id;

-- 2. Verificar qué nombre busca la función is_admin_campus
SELECT 
  'Definición de is_admin_campus' as verificacion,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_campus';

-- 3. Verificar el rol del usuario admin-campus
SELECT 
  'Rol del usuario admin-campus' as verificacion,
  u.id,
  u.email,
  u.role_id,
  r.id as role_table_id,
  r.name as role_name_in_table,
  CASE 
    WHEN r.name = 'admin_campus' THEN '✅ Coincide con admin_campus'
    WHEN r.name = 'admin-campus' THEN '✅ Coincide con admin-campus'
    ELSE '❌ NO coincide'
  END as estado
FROM public.users u
INNER JOIN public.roles r ON r.id = u.role_id
WHERE u.email = 'enzihummer@gmail.com';

-- 4. Probar la función is_admin_campus directamente
-- (Ejecutar como admin-campus para verificar)
SELECT 
  'Prueba de is_admin_campus' as verificacion,
  public.is_admin_campus() as resultado_funcion,
  auth.uid() as usuario_actual;

-- 5. Verificar qué nombre de rol está en la función
-- Extraer el nombre del rol de la definición de la función
SELECT 
  'Análisis de función' as verificacion,
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%admin_campus%' THEN 'Busca: admin_campus (con guión bajo)'
    WHEN routine_definition LIKE '%admin-campus%' THEN 'Busca: admin-campus (con guión)'
    ELSE 'No se encontró patrón'
  END as nombre_buscado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_campus';

