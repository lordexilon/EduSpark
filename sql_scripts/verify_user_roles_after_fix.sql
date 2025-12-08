-- =====================================================
-- Script: VERIFICAR ROLES DE USUARIOS DESPUÉS DE EJECUTAR FIX
-- Descripción: Este script verifica que los roles NO hayan cambiado
--              después de ejecutar fix_admin_campus_user_institutions_rls.sql
-- Fecha: 2025-12-01
-- =====================================================
-- 
-- ⚠️ IMPORTANTE: Ejecuta este script DESPUÉS de ejecutar fix_admin_campus_user_institutions_rls.sql
--                y compara los resultados con verify_user_roles_before_fix.sql
--                Los resultados deben ser IDÉNTICOS
--

-- 1. Verificar todos los usuarios y sus roles actuales
SELECT 
  'VERIFICACIÓN DE ROLES - DESPUÉS' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name,
  r.id as role_table_id,
  u.is_active,
  u.created_at
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;

-- 2. Contar usuarios por rol
SELECT 
  'CONTEO DE USUARIOS POR ROL' as verificacion,
  r.name as role_name,
  r.id as role_id,
  COUNT(u.id) as total_usuarios
FROM public.roles r
LEFT JOIN public.users u ON u.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.id;

-- 3. Verificar usuarios admin específicamente
SELECT 
  'USUARIOS ADMIN' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name
FROM public.users u
INNER JOIN public.roles r ON u.role_id = r.id
WHERE r.name = 'admin'
ORDER BY u.email;

-- 4. Comparar resultados (copia estos resultados y compáralos con los de verify_user_roles_before_fix.sql)
-- Este resultado debe ser IDÉNTICO al resultado del script "before"
SELECT 
  u.id,
  u.email,
  u.role_id,
  r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;

-- 5. Si los resultados son diferentes, ejecuta este script para restaurar roles:
--    (NO ejecutar a menos que sea necesario)
/*
-- Script de restauración (solo si es necesario)
-- Reemplaza los valores según tus datos originales

UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
WHERE email = 'tu-email-admin@ejemplo.com';

UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'student' LIMIT 1)
WHERE email = 'tu-email-student@ejemplo.com';
*/

