-- =====================================================
-- VERIFICAR Y CORREGIR: Admin no puede ver documentos
-- =====================================================
-- Este script verifica por qué is_admin_safe() no funciona
-- y corrige el problema

-- 1. Verificar usuario actual
SELECT 
    'Usuario actual' as check_type,
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- 2. Verificar si existe en public.users
SELECT 
    'Usuario en public.users' as check_type,
    u.id,
    u.email,
    u.role_id,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.id = auth.uid();

-- 3. Probar función is_admin_safe() directamente
SELECT 
    'Test is_admin_safe()' as check_type,
    public.is_admin_safe() as is_admin_result;

-- 4. Verificar manualmente si el usuario es admin
SELECT 
    'Verificación manual admin' as check_type,
    u.id,
    r.name as role_name,
    CASE WHEN r.name = 'admin' THEN true ELSE false END as should_be_admin
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE u.id = auth.uid();

-- 5. Verificar acceso directo a documentos (sin RLS temporalmente)
-- Esto nos dirá si el problema es RLS o los datos
SET LOCAL row_security = off;
SELECT COUNT(*) as total_without_rls FROM processed_documents;
RESET row_security;

-- 6. Verificar acceso con RLS activo
SELECT COUNT(*) as total_with_rls FROM processed_documents;

-- 7. Si el usuario no existe en public.users, crearlo
DO $$
DECLARE
    v_user_exists BOOLEAN;
    v_user_id UUID;
    v_admin_role_id INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    -- Verificar si existe
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE NOTICE 'Usuario no existe en public.users. Creándolo...';
        
        -- Obtener ID del rol admin
        SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
        
        IF v_admin_role_id IS NULL THEN
            RAISE EXCEPTION 'Rol admin no encontrado en la tabla roles';
        END IF;
        
        -- Crear usuario
        INSERT INTO public.users (id, email, role_id, is_active)
        SELECT 
            au.id,
            au.email,
            v_admin_role_id,
            true
        FROM auth.users au
        WHERE au.id = v_user_id
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Usuario creado en public.users con rol admin';
    ELSE
        RAISE NOTICE 'Usuario ya existe en public.users';
        
        -- Verificar que tenga el rol admin
        SELECT role_id INTO v_admin_role_id
        FROM public.users
        WHERE id = v_user_id;
        
        SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
        
        -- Si no es admin, actualizarlo
        UPDATE public.users
        SET role_id = v_admin_role_id
        WHERE id = v_user_id
        AND role_id != v_admin_role_id;
        
        IF FOUND THEN
            RAISE NOTICE 'Rol del usuario actualizado a admin';
        END IF;
    END IF;
END $$;

-- 8. Verificar nuevamente is_admin_safe()
SELECT 
    'Verificación final is_admin_safe()' as check_type,
    public.is_admin_safe() as is_admin_result,
    (SELECT COUNT(*) FROM processed_documents WHERE public.is_admin_safe()) as documents_visible;

-- 9. Verificar acceso a documentos después de la corrección
SELECT 
    'Documentos accesibles' as check_type,
    COUNT(*) as count
FROM processed_documents
WHERE public.is_admin_safe();

-- Notificación final
DO $$
DECLARE
    v_is_admin BOOLEAN;
    v_docs_count INTEGER;
BEGIN
    v_is_admin := public.is_admin_safe();
    SELECT COUNT(*) INTO v_docs_count FROM processed_documents WHERE public.is_admin_safe();
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESULTADO FINAL:';
    RAISE NOTICE '  - is_admin_safe(): %', v_is_admin;
    RAISE NOTICE '  - Documentos visibles: %', v_docs_count;
    
    IF v_is_admin AND v_docs_count > 0 THEN
        RAISE NOTICE '✅ TODO CORRECTO: Admin puede ver documentos';
    ELSIF v_is_admin AND v_docs_count = 0 THEN
        RAISE NOTICE '⚠️  Admin detectado pero no hay documentos visibles';
        RAISE NOTICE '   Verificar que existan documentos en processed_documents';
    ELSE
        RAISE NOTICE '❌ PROBLEMA: is_admin_safe() retorna false';
        RAISE NOTICE '   Verificar que el usuario tenga rol admin en public.users';
    END IF;
    RAISE NOTICE '========================================';
END $$;

