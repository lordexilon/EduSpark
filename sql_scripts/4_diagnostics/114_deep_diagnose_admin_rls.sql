-- =====================================================
-- DIAGNÓSTICO PROFUNDO: Por qué admin no ve documentos
-- =====================================================

-- 1. Verificar usuario en auth.users
SELECT 
    '1. Auth.users' as step,
    id,
    email,
    created_at
FROM auth.users
WHERE id = auth.uid();

-- 2. Verificar usuario en public.users
SELECT 
    '2. Public.users' as step,
    u.id,
    u.email,
    u.role_id,
    r.name as role_name,
    u.is_active
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.id = auth.uid();

-- 3. Verificar todos los roles disponibles
SELECT 
    '3. Roles disponibles' as step,
    id,
    name,
    description
FROM public.roles
ORDER BY name;

-- 4. Probar is_admin_safe() paso a paso
SELECT 
    '4a. Test is_admin_safe()' as step,
    public.is_admin_safe() as result;

-- 5. Verificar manualmente la lógica de is_admin_safe()
SELECT 
    '4b. Verificación manual' as step,
    u.id as user_id,
    u.role_id,
    r.name as role_name,
    CASE 
        WHEN r.name = 'admin' THEN true 
        ELSE false 
    END as should_be_admin,
    (u.id = auth.uid()) as user_matches
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE u.id = auth.uid();

-- 6. Verificar documentos sin RLS
BEGIN;
SET LOCAL row_security = off;
SELECT 
    '5. Documentos sin RLS' as step,
    COUNT(*) as total_documents
FROM processed_documents;
COMMIT;

-- 7. Verificar documentos con RLS
SELECT 
    '6. Documentos con RLS' as step,
    COUNT(*) as total_documents
FROM processed_documents;

-- 8. Verificar políticas RLS activas
SELECT 
    '7. Políticas RLS' as step,
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 9. Probar cada condición de la política manualmente
SELECT 
    '8. Test condiciones políticas' as step,
    public.is_admin_safe() as condition1_admin,
    public.is_admin_campus_safe() as condition2_admin_campus,
    public.is_coordinator_safe() as condition3_coordinator,
    public.get_user_institution_id() as condition4_institution_id;

-- 10. Verificar si alguna política permite acceso
SELECT 
    '9. Test acceso por política' as step,
    COUNT(*) FILTER (WHERE public.is_admin_safe()) as via_admin,
    COUNT(*) FILTER (WHERE public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id()) as via_admin_campus,
    COUNT(*) FILTER (WHERE public.is_coordinator_safe() AND institution_id = public.get_user_institution_id()) as via_coordinator,
    COUNT(*) FILTER (WHERE institution_id = public.get_user_institution_id()) as via_institution
FROM processed_documents;

-- 11. Ver el código fuente de is_admin_safe() para debug
SELECT 
    '10. Código de is_admin_safe()' as step,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_admin_safe' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 12. Si el usuario no existe o no es admin, corregirlo
DO $$
DECLARE
    v_user_id UUID;
    v_user_exists BOOLEAN;
    v_current_role_id INTEGER;
    v_admin_role_id INTEGER;
    v_email TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Verificar que auth.uid() no sea NULL
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '❌ auth.uid() retorna NULL. Debes estar autenticado en Supabase para ejecutar este script.';
    END IF;
    
    RAISE NOTICE 'Usuario ID: %', v_user_id;
    
    -- Obtener email de auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    
    IF v_email IS NULL THEN
        RAISE EXCEPTION '❌ No se encontró email para el usuario % en auth.users', v_user_id;
    END IF;
    
    RAISE NOTICE 'Email: %', v_email;
    
    -- Verificar si existe en public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    
    -- Obtener ID del rol admin
    SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
    
    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION '❌ Rol admin no encontrado. Verificar tabla roles.';
    END IF;
    
    RAISE NOTICE 'Admin role ID: %', v_admin_role_id;
    
    IF NOT v_user_exists THEN
        RAISE NOTICE '🔧 Usuario no existe en public.users. Creándolo...';
        
        INSERT INTO public.users (id, email, role_id, is_active)
        VALUES (v_user_id, v_email, v_admin_role_id, true)
        ON CONFLICT (id) DO UPDATE 
        SET role_id = v_admin_role_id, is_active = true;
        
        RAISE NOTICE '✅ Usuario creado/actualizado con rol admin';
    ELSE
        -- Verificar rol actual
        SELECT role_id INTO v_current_role_id FROM public.users WHERE id = v_user_id;
        
        RAISE NOTICE 'Rol actual del usuario: %', v_current_role_id;
        
        IF v_current_role_id IS NULL OR v_current_role_id != v_admin_role_id THEN
            RAISE NOTICE '🔧 Usuario existe pero no tiene rol admin. Actualizando...';
            UPDATE public.users 
            SET role_id = v_admin_role_id, is_active = true 
            WHERE id = v_user_id;
            RAISE NOTICE '✅ Rol actualizado a admin';
        ELSE
            RAISE NOTICE '✅ Usuario ya tiene rol admin';
        END IF;
    END IF;
END $$;

-- 13. Verificación final después de corrección
SELECT 
    '11. Verificación final' as step,
    public.is_admin_safe() as is_admin,
    (SELECT COUNT(*) FROM processed_documents WHERE public.is_admin_safe()) as documents_visible,
    (SELECT COUNT(*) FROM processed_documents) as total_documents_in_db;

-- 14. Si aún no funciona, probar deshabilitar RLS temporalmente (solo para diagnóstico)
-- NO EJECUTAR EN PRODUCCIÓN - Solo para diagnóstico
/*
ALTER TABLE processed_documents DISABLE ROW LEVEL SECURITY;
SELECT COUNT(*) FROM processed_documents;
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;
*/

