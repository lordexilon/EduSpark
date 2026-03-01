-- =====================================================
-- FIX DIRECTO: Crear/actualizar usuario admin
-- =====================================================
-- IMPORTANTE: Reemplaza 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e' con tu user_id real
-- Puedes obtenerlo de los logs del navegador o de auth.users

-- OPCIÓN 1: Si conoces el user_id, úsalo directamente
-- Reemplaza este UUID con el ID de tu usuario
DO $$
DECLARE
    v_user_id UUID := 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'; -- User ID del log del navegador
    v_email TEXT;
    v_admin_role_id INTEGER;
    v_user_exists BOOLEAN;
    v_current_role_id INTEGER;
BEGIN
    -- Obtener email de auth.users
    SELECT email INTO v_email 
    FROM auth.users 
    WHERE id = v_user_id;
    
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'Usuario % no encontrado en auth.users', v_user_id;
    END IF;
    
    RAISE NOTICE 'Usuario: % (%)', v_email, v_user_id;
    
    -- Obtener ID del rol admin
    SELECT id INTO v_admin_role_id 
    FROM public.roles 
    WHERE name = 'admin' 
    LIMIT 1;
    
    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Rol admin no encontrado en la tabla roles';
    END IF;
    
    RAISE NOTICE 'Admin role ID: %', v_admin_role_id;
    
    -- Verificar si existe en public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE NOTICE '🔧 Creando usuario en public.users...';
        
        INSERT INTO public.users (id, email, role_id, is_active)
        VALUES (v_user_id, v_email, v_admin_role_id, true);
        
        RAISE NOTICE '✅ Usuario creado con rol admin';
    ELSE
        -- Verificar rol actual
        SELECT role_id INTO v_current_role_id 
        FROM public.users 
        WHERE id = v_user_id;
        
        IF v_current_role_id IS NULL OR v_current_role_id != v_admin_role_id THEN
            RAISE NOTICE '🔧 Actualizando rol a admin...';
            UPDATE public.users 
            SET role_id = v_admin_role_id, is_active = true 
            WHERE id = v_user_id;
            RAISE NOTICE '✅ Rol actualizado a admin';
        ELSE
            RAISE NOTICE '✅ Usuario ya tiene rol admin';
        END IF;
    END IF;
END $$;

-- OPCIÓN 2: Si prefieres usar auth.uid(), ejecuta esto DESPUÉS de hacer login en Supabase
-- (Comentar la opción 1 y descomentar esta)
/*
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_admin_role_id INTEGER;
    v_user_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'auth.uid() es NULL. Debes estar autenticado en Supabase.';
    END IF;
    
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
    
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        INSERT INTO public.users (id, email, role_id, is_active)
        VALUES (v_user_id, v_email, v_admin_role_id, true);
    ELSE
        UPDATE public.users 
        SET role_id = v_admin_role_id, is_active = true 
        WHERE id = v_user_id;
    END IF;
    
    RAISE NOTICE '✅ Usuario configurado correctamente';
END $$;
*/

-- Verificación final
SELECT 
    'Verificación' as check_type,
    u.id,
    u.email,
    r.name as role_name,
    public.is_admin_safe() as is_admin_function,
    (SELECT COUNT(*) FROM processed_documents WHERE public.is_admin_safe()) as documents_visible
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'; -- User ID del log del navegador

