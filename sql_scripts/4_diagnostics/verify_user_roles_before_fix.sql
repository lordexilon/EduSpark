-- =====================================================
-- Script: VERIFICAR ROLES DE USUARIOS ANTES DE EJECUTAR FIX
-- Descripción: Este script verifica los roles actuales de todos los usuarios
--              para asegurar que NO se modifiquen al ejecutar otros scripts
-- Fecha: 2025-12-01
-- =====================================================
-- 
-- ⚠️ IMPORTANTE: Ejecuta este script ANTES de ejecutar cualquier otro script
--                para tener un registro de los roles actuales
--

-- 1. Verificar todos los usuarios y sus roles actuales
SELECT 
  'VERIFICACIÓN DE ROLES - ANTES' as verificacion,
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

-- 4. Exportar resultados para comparación (copia estos resultados)
-- Este resultado debe ser IDÉNTICO antes y después de ejecutar fix_admin_campus_user_institutions_rls.sql
SELECT 
  u.id,
  u.email,
  u.role_id,
  r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;

