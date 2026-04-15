-- =====================================================
-- Script para eliminar usuario de auth.users
-- ID: ce8bc214-c91b-44f4-9bc4-ca31790f7272
-- =====================================================

-- 1. Verificar si el usuario existe en public.users
SELECT
    id,
    email,
    first_name,
    last_name,
    role_id,
    created_at
FROM public.users
WHERE id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- 2. Verificar si el usuario existe en auth.users
SELECT
    id,
    email,
    created_at,
    deleted_at
FROM auth.users
WHERE id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- 3. Verificar relaciones del usuario antes de eliminar
-- Verificar user_institutions
SELECT
    ui.id,
    ui.user_id,
    ui.institution_id,
    i.name as institution_name,
    u.email as user_email
FROM public.user_institutions ui
LEFT JOIN public.institutions i ON ui.institution_id = i.id
LEFT JOIN public.users u ON ui.user_id = u.id
WHERE ui.user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- Verificar user_devices
SELECT
    ud.id,
    ud.user_id,
    ud.device_name,
    ud.is_active,
    u.email as user_email
FROM public.user_devices ud
LEFT JOIN public.users u ON ud.user_id = u.id
WHERE ud.user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- Verificar otros registros relacionados (ajustar según tus tablas)
-- SELECT * FROM public.user_sessions
-- WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';
-- SELECT * FROM public.conversations
-- WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';
-- SELECT * FROM public.messages
-- WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- =====================================================
-- ELIMINACIÓN DEL USUARIO
-- =====================================================
-- IMPORTANTE: Ejecutar primero las consultas de verificación arriba
-- para asegurarse de que es el usuario correcto antes de eliminar

BEGIN;

-- 4. Eliminar relaciones primero (si existen)
-- Eliminar de user_institutions
DELETE FROM public.user_institutions
WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- Eliminar de user_devices
DELETE FROM public.user_devices
WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- Eliminar de otras tablas relacionadas si es necesario
-- DELETE FROM public.user_sessions
-- WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';
-- DELETE FROM public.conversations
-- WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';
-- DELETE FROM public.messages
-- WHERE user_id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- 5. Eliminar de public.users
DELETE FROM public.users
WHERE id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- 6. Eliminar de auth.users (requiere permisos de admin/service_role)
-- NOTA: Esto debe ejecutarse con permisos de service_role
-- Si no tienes permisos, usa la API de Supabase Admin o el dashboard
DELETE FROM auth.users
WHERE id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- Verificar que se eliminó correctamente
SELECT
    'public.users' as tabla,
    COUNT(*) as registros_restantes
FROM public.users
WHERE id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272'

UNION ALL

SELECT
    'auth.users' as tabla,
    COUNT(*) as registros_restantes
FROM auth.users
WHERE id = 'ce8bc214-c91b-44f4-9bc4-ca31790f7272';

-- Si todo está correcto, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
COMMIT;
-- ROLLBACK; -- Descomentar si necesitas revertir los cambios

