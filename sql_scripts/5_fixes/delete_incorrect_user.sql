-- =====================================================
-- Script para eliminar usuario creado incorrectamente
-- ID: fa7c543e-b22a-4f91-9eb0-7acdcd891e9d
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
WHERE id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- 2. Verificar si el usuario existe en auth.users
SELECT 
    id,
    email,
    created_at,
    deleted_at
FROM auth.users
WHERE id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

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
WHERE ui.user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- Verificar otros registros relacionados (ajustar según tus tablas)
-- SELECT * FROM public.user_sessions 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';
-- SELECT * FROM public.devices 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';
-- SELECT * FROM public.conversations 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';
-- SELECT * FROM public.messages 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- =====================================================
-- ELIMINACIÓN DEL USUARIO
-- =====================================================
-- IMPORTANTE: Ejecutar primero las consultas de verificación arriba
-- para asegurarse de que es el usuario correcto antes de eliminar

BEGIN;

-- 4. Eliminar relaciones primero (si existen)
-- Eliminar de user_institutions
DELETE FROM public.user_institutions
WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- Eliminar de otras tablas relacionadas si es necesario
-- DELETE FROM public.user_sessions 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';
-- DELETE FROM public.devices 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';
-- DELETE FROM public.conversations 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';
-- DELETE FROM public.messages 
-- WHERE user_id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- 5. Eliminar de public.users
DELETE FROM public.users
WHERE id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- 6. Eliminar de auth.users (requiere permisos de admin)
-- NOTA: Esto debe ejecutarse con permisos de service_role
-- Si no tienes permisos, usa la API de Supabase Admin o el dashboard
DELETE FROM auth.users
WHERE id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- Verificar que se eliminó correctamente
SELECT 
    'public.users' as tabla,
    COUNT(*) as registros_restantes
FROM public.users
WHERE id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d'

UNION ALL

SELECT 
    'auth.users' as tabla,
    COUNT(*) as registros_restantes
FROM auth.users
WHERE id = 'fa7c543e-b22a-4f91-9eb0-7acdcd891e9d';

-- Si todo está correcto, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
COMMIT;
-- ROLLBACK; -- Descomentar si necesitas revertir los cambios
