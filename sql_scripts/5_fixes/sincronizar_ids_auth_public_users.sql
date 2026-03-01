-- =====================================================
-- SOLUCIÓN: Sincronizar IDs entre auth.users y public.users
-- Problema: Usuario existe en ambas tablas pero con IDs diferentes
-- =====================================================

-- 1. DIAGNOSTICAR: Buscar el usuario en ambas tablas
SELECT 
    'auth.users' as tabla,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
WHERE au.email = 'barretoisaacdavid97@gmail.com'

UNION ALL

SELECT 
    'public.users' as tabla,
    pu.id,
    pu.email,
    pu.created_at
FROM public.users pu
WHERE pu.email = 'barretoisaacdavid97@gmail.com';

-- 2. SINCRONIZAR: Actualizar public.users con el ID de auth.users
DO $$
DECLARE
    v_auth_id UUID;
    v_public_id UUID;
    v_email TEXT := 'barretoisaacdavid97@gmail.com';
BEGIN
    -- Obtener ID de auth.users
    SELECT id INTO v_auth_id
    FROM auth.users
    WHERE email = v_email;

    -- Obtener ID de public.users
    SELECT id INTO v_public_id
    FROM public.users
    WHERE email = v_email;

    -- Verificar que ambos existen
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users: %', v_email;
    END IF;

    IF v_public_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado en public.users: %', v_email;
    END IF;

    -- Si los IDs son diferentes, sincronizar
    IF v_auth_id != v_public_id THEN
        RAISE NOTICE 'Sincronizando IDs: auth.users=% -> public.users=%', v_auth_id, v_public_id;
        
        -- Actualizar el ID en public.users
        UPDATE public.users
        SET id = v_auth_id
        WHERE id = v_public_id;

        -- Actualizar referencias en tablas relacionadas
        UPDATE public.user_institutions
        SET user_id = v_auth_id
        WHERE user_id = v_public_id;

        UPDATE public.course_enrollments
        SET student_id = v_auth_id
        WHERE student_id = v_public_id;

        UPDATE public.career_enrollments
        SET student_id = v_auth_id
        WHERE student_id = v_public_id;

        UPDATE public.conversations
        SET user_id = v_auth_id
        WHERE user_id = v_public_id;

        UPDATE public.messages
        SET user_id = v_auth_id
        WHERE user_id = v_public_id;

        RAISE NOTICE '✅ Sincronización completada para: %', v_email;
    ELSE
        RAISE NOTICE '✅ IDs ya están sincronizados para: %', v_email;
    END IF;
END $$;

-- 3. VERIFICAR: Confirmar sincronización
SELECT 
    au.id as auth_id,
    pu.id as public_id,
    CASE 
        WHEN au.id = pu.id THEN '✅ Sincronizado'
        ELSE '❌ Desincronizado'
    END as estado,
    au.email
FROM auth.users au
JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'barretoisaacdavid97@gmail.com';

-- 4. VERIFICAR INSTITUCIÓN Y ASIGNACIONES
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as rol,
    (SELECT COUNT(*) FROM public.user_institutions WHERE user_id = u.id) as instituciones_asignadas,
    (SELECT COUNT(*) FROM public.course_enrollments WHERE student_id = u.id) as cursos_asignados,
    (SELECT COUNT(*) FROM public.career_enrollments WHERE student_id = u.id) as carreras_asignadas
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'barretoisaacdavid97@gmail.com';
