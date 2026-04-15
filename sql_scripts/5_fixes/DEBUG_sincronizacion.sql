-- =====================================================
-- DEBUG: Ver qué está bloqueando la sincronización
-- =====================================================

-- 1. Ver si hay registros duplicados con auth_id
SELECT 
    'Registros en public.users' as check_type,
    email,
    id,
    'auth_id existe?' as verif
FROM public.users
WHERE id IN (
    SELECT au.id FROM auth.users au
    WHERE au.email IN (
        'jaraorregojosesebastian@gmail.com',
        'otihidalgo9@gmail.com',
        'barretoisaacdavid97@gmail.com'
    )
)
UNION ALL
SELECT 
    'Registros con public_id',
    email,
    id,
    'public_id existe?'
FROM public.users
WHERE email IN (
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'barretoisaacdavid97@gmail.com'
);

-- 2. Intentar UN solo usuario con logging extremo
DO $$
DECLARE
    v_email TEXT := 'barretoisaacdavid97@gmail.com';
    v_auth_id UUID;
    v_public_id UUID;
    v_user_record RECORD;
    v_existing_auth_record RECORD;
BEGIN
    RAISE NOTICE '========== DEBUG PARA: % ==========', v_email;
    
    -- Obtener IDs
    SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
    RAISE NOTICE '1. auth_id: %', v_auth_id;
    
    SELECT * INTO v_user_record FROM public.users WHERE email = v_email;
    v_public_id := v_user_record.id;
    RAISE NOTICE '2. public_id actual: %', v_public_id;
    
    -- ¿Ya existe un registro con auth_id?
    SELECT * INTO v_existing_auth_record FROM public.users WHERE id = v_auth_id;
    IF FOUND THEN
        RAISE NOTICE '❌ PROBLEMA: Ya existe registro con auth_id!';
        RAISE NOTICE '   Email del registro: %', v_existing_auth_record.email;
        RAISE NOTICE '   ID: %', v_existing_auth_record.id;
        -- ELIMINAR este registro primero
        RAISE NOTICE '   Eliminando registro duplicado...';
        DELETE FROM public.users WHERE id = v_auth_id;
        RAISE NOTICE '   ✅ Eliminado';
    ELSE
        RAISE NOTICE '✅ No hay registro con auth_id, podemos insertar';
    END IF;
    
    -- Intentar INSERT
    RAISE NOTICE '3. Insertando nuevo registro con auth_id...';
    INSERT INTO public.users (
        id, email, first_name, last_name, avatar_url, created_at, updated_at,
        role_id, email_verified, is_active, identity_document, identity_document_type
    ) VALUES (
        v_auth_id,
        v_user_record.email,
        v_user_record.first_name,
        v_user_record.last_name,
        v_user_record.avatar_url,
        v_user_record.created_at,
        v_user_record.updated_at,
        v_user_record.role_id,
        v_user_record.email_verified,
        v_user_record.is_active,
        v_user_record.identity_document,
        v_user_record.identity_document_type
    );
    RAISE NOTICE '   ✅ INSERT exitoso';
    
    -- Actualizar FKs (solo algunas para test)
    RAISE NOTICE '4. Actualizando FKs...';
    UPDATE public.course_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
    RAISE NOTICE '   course_enrollments: % filas', FOUND;
    UPDATE public.career_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
    RAISE NOTICE '   career_enrollments: % filas', FOUND;
    UPDATE public.user_institutions SET user_id = v_auth_id WHERE user_id = v_public_id;
    RAISE NOTICE '   user_institutions: % filas', FOUND;
    
    -- Eliminar viejo
    RAISE NOTICE '5. Eliminando registro viejo...';
    DELETE FROM public.users WHERE id = v_public_id;
    RAISE NOTICE '   ✅ DELETE exitoso';
    
    RAISE NOTICE '========== FIN DEBUG ==========';
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR: % [%]', SQLERRM, SQLSTATE;
END $$;

-- 3. Verificar resultado
SELECT 
    au.email,
    au.id as auth_id,
    pu.id as public_id,
    CASE WHEN au.id = pu.id THEN '✅' ELSE '❌' END as sincronizado
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'barretoisaacdavid97@gmail.com';
