-- =====================================================
-- VERIFICAR QUÉ ESTÁ BLOQUEANDO LAS OPERACIONES
-- =====================================================

-- 1. Ver políticas RLS en users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 2. Ver triggers en users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- 3. Intentar operación MÁS SIMPLE posible
-- Solo UPDATE del ID (sin INSERT ni DELETE)
BEGIN;

-- Crear UUID temporal único
UPDATE public.users 
SET id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE email = 'palomaruizdiaz96@gmail.com'; -- Este ya está sincronizado, lo usamos de prueba

-- Ver si funcionó
SELECT id, email FROM public.users WHERE email = 'palomaruizdiaz96@gmail.com';

ROLLBACK; -- NO guardar cambios, solo prueba

-- 4. Ver si el usuario actual tiene permisos
SELECT current_user, current_role;

-- 5. Ver constraint unique en users
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    array_agg(a.attname) AS columns
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace  
JOIN pg_class cl ON cl.oid = c.conrelid
LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE n.nspname = 'public'
  AND cl.relname = 'users'
  AND contype IN ('u', 'p') -- unique o primary key
GROUP BY conname, contype
ORDER BY conname;
