-- =====================================================
-- Script: Corregir rol de administrador rápidamente
-- Descripción: Corrige el rol del usuario administrador
-- Fecha: 2025-12-01
-- =====================================================

-- PASO 1: Verificar los IDs de los roles
SELECT 
  'Paso 1: IDs de Roles' as paso,
  id,
  name,
  description
FROM public.roles
ORDER BY id;

-- PASO 2: Ver tu usuario actual y su rol
-- Reemplaza 'TU_EMAIL_AQUI' con tu email de administrador
SELECT 
  'Paso 2: Tu usuario actual' as paso,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id as current_role_id,
  r_current.name as current_role_name,
  (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1) as admin_role_id,
  (SELECT name FROM public.roles WHERE name = 'admin' LIMIT 1) as admin_role_name
FROM public.users u
LEFT JOIN public.roles r_current ON u.role_id = r_current.id
WHERE u.email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIA ESTO POR TU EMAIL
LIMIT 1;

-- PASO 3: Corregir el rol del administrador
-- Reemplaza 'TU_EMAIL_AQUI' con tu email de administrador
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIA ESTO POR TU EMAIL
RETURNING 
  id,
  email,
  first_name,
  last_name,
  role_id,
  (SELECT name FROM public.roles WHERE id = role_id) as new_role_name;

-- PASO 4: Verificar que se corrigió correctamente
SELECT 
  'Paso 4: Verificación' as paso,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIA ESTO POR TU EMAIL
LIMIT 1;

-- =====================================================
-- INSTRUCCIONES RÁPIDAS
-- =====================================================

/*
1. Ejecuta el PASO 1 para ver qué IDs tienen los roles.

2. Ejecuta el PASO 2 reemplazando 'TU_EMAIL_AQUI' con tu email de administrador
   para ver tu rol actual.

3. Ejecuta el PASO 3 reemplazando 'TU_EMAIL_AQUI' con tu email de administrador
   para corregir tu rol a 'admin'.

4. Ejecuta el PASO 4 para verificar que se corrigió correctamente.

5. Si quieres corregir múltiples usuarios a la vez, puedes usar:
   
   UPDATE public.users
   SET role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
   WHERE email IN (
     'admin1@ejemplo.com',
     'admin2@ejemplo.com',
     'admin3@ejemplo.com'
   );
*/

