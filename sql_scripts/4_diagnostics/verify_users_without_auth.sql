-- =====================================================
-- Script para verificar usuarios en public.users sin auth.users
-- Diagnóstico: Usuarios creados por importación masiva que no tienen auth.users
-- =====================================================

-- 1. Verificar usuarios en public.users que NO existen en auth.users
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.role_id,
    pu.identity_document,
    pu.identity_document_type,
    pu.is_active,
    pu.email_verified,
    pu.created_at as public_created_at,
    CASE 
        WHEN au.id IS NULL THEN '❌ NO EXISTE en auth.users'
        ELSE '✅ EXISTE en auth.users'
    END as estado_auth,
    CASE 
        WHEN au.id IS NULL THEN '⚠️ Usuario huérfano - No puede autenticarse'
        ELSE '✅ Usuario completo'
    END as problema
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL  -- Solo usuarios que NO están en auth.users
ORDER BY pu.created_at DESC;

-- 2. Contar cuántos usuarios tienen este problema
SELECT 
    COUNT(*) as usuarios_sin_auth,
    'Usuarios en public.users sin registro en auth.users' as descripcion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- 3. Verificar por rol cuántos usuarios tienen este problema
SELECT 
    r.name as role_name,
    COUNT(*) as cantidad_sin_auth,
    'Usuarios sin auth.users por rol' as descripcion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL
GROUP BY r.name
ORDER BY cantidad_sin_auth DESC;

-- 4. Verificar usuarios con documento de identidad (importación masiva)
SELECT 
    pu.id,
    pu.email,
    pu.identity_document,
    pu.identity_document_type,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.created_at,
    CASE 
        WHEN au.id IS NULL THEN '❌ Sin auth.users'
        ELSE '✅ Con auth.users'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE pu.identity_document IS NOT NULL  -- Usuarios importados masivamente
  AND au.id IS NULL  -- Que no tienen auth.users
ORDER BY pu.created_at DESC;

-- 5. Verificar si hay usuarios con el mismo email en ambos sistemas pero IDs diferentes
SELECT 
    pu.id as public_id,
    pu.email as public_email,
    au.id as auth_id,
    au.email as auth_email,
    '⚠️ Email duplicado con IDs diferentes' as problema
FROM public.users pu
INNER JOIN auth.users au ON pu.email = au.email
WHERE pu.id != au.id  -- IDs diferentes
  AND au.deleted_at IS NULL;  -- Solo usuarios activos en auth

-- 6. Resumen completo
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_public_users,
    (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as total_auth_users_activos,
    (SELECT COUNT(*) 
     FROM public.users pu
     LEFT JOIN auth.users au ON pu.id = au.id
     WHERE au.id IS NULL) as usuarios_sin_auth,
    (SELECT COUNT(*) 
     FROM public.users pu
     INNER JOIN auth.users au ON pu.id = au.id
     WHERE pu.id = au.id) as usuarios_completos,
    ROUND(
        (SELECT COUNT(*) 
         FROM public.users pu
         INNER JOIN auth.users au ON pu.id = au.id
         WHERE pu.id = au.id)::numeric / 
        NULLIF((SELECT COUNT(*) FROM public.users), 0)::numeric * 100, 
        2
    ) as porcentaje_completos;

-- 7. Verificar usuarios recientes (últimos 30 días) sin auth.users
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.created_at,
    NOW() - pu.created_at as tiempo_desde_creacion,
    '⚠️ Usuario reciente sin auth.users' as problema
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL
  AND pu.created_at > NOW() - INTERVAL '30 days'
ORDER BY pu.created_at DESC;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 
-- Si encuentras usuarios sin auth.users:
-- 
-- 1. Estos usuarios NO pueden autenticarse en el sistema
-- 2. Fueron probablemente creados por importación masiva sin Edge Function
-- 3. Para solucionarlo, necesitas:
--    a) Crearlos en auth.users usando Supabase Admin API
--    b) O usar la Edge Function createBulkUsers
--    c) O eliminarlos de public.users si no son necesarios
--
-- Ver: sql_scripts/5_fixes/sync_auth_users_to_public_users.sql
--      (Script inverso: crea public.users desde auth.users)
--
-- Para crear usuarios en auth.users, usar:
-- - Supabase Admin API (service_role_key)
-- - Edge Function createBulkUsers
-- - O manualmente desde Supabase Dashboard

