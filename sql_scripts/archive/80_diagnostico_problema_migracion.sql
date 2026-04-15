-- 80_diagnostico_problema_migracion.sql
-- Script para diagnosticar por qué la migración no funcionó

-- 1. Verificar si existe alguna transacción activa
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY state_change DESC;

-- 2. Verificar política RLS de course_units
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'course_units'
ORDER BY policyname;

-- 3. Verificar permisos del usuario actual en course_units
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'course_units'
ORDER BY grantee, privilege_type;

-- 4. Intentar INSERT manual simple para verificar permisos
INSERT INTO course_units (course_id, number, title, order_index)
VALUES (9, 1, 'TEST', 0)
RETURNING id, course_id, number, title, order_index;

-- 5. Si el INSERT anterior funcionó, eliminarlo inmediatamente
DELETE FROM course_units WHERE course_id = 9 AND title = 'TEST';

