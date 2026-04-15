-- =====================================================
-- TEST: Simular acceso desde el frontend
-- =====================================================
-- Este script verifica que las políticas RLS funcionan correctamente
-- cuando se accede desde el frontend (usuario autenticado)

-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de hacer login en Supabase
-- O usar el user_id directamente para simular

-- 1. Verificar usuario específico (simulando frontend)
DO $$
DECLARE
    v_user_id UUID := 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e';
    v_role_name TEXT;
    v_is_admin BOOLEAN;
    v_docs_count INTEGER;
BEGIN
    -- Verificar rol del usuario
    SELECT r.name INTO v_role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = v_user_id;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuario: %', v_user_id;
    RAISE NOTICE 'Rol: %', v_role_name;
    RAISE NOTICE 'Es admin: %', (v_role_name = 'admin');
    RAISE NOTICE '========================================';
    
    -- Verificar documentos sin RLS (para comparar)
    SELECT COUNT(*) INTO v_docs_count
    FROM processed_documents;
    
    RAISE NOTICE 'Total documentos en BD: %', v_docs_count;
END $$;

-- 2. Verificar que las políticas RLS permiten acceso a admin
-- Esto simula lo que pasaría cuando el frontend hace la consulta
-- NOTA: Esto solo funcionará si estás autenticado en Supabase
SELECT 
    'Test acceso con RLS' as test_type,
    COUNT(*) FILTER (WHERE public.is_admin_safe()) as docs_via_admin,
    COUNT(*) FILTER (WHERE public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id()) as docs_via_admin_campus,
    COUNT(*) FILTER (WHERE public.is_coordinator_safe() AND institution_id = public.get_user_institution_id()) as docs_via_coordinator,
    COUNT(*) as total_docs
FROM processed_documents;

-- 3. Verificar acceso directo (esto es lo que hace el frontend)
SELECT 
    'Acceso directo (como frontend)' as test_type,
    COUNT(*) as documents_visible
FROM processed_documents
WHERE public.is_admin_safe()
   OR (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
   OR (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
   OR (institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL);

-- 4. Verificar cada condición de la política manualmente
SELECT 
    'Condiciones políticas' as test_type,
    public.is_admin_safe() as condition_admin,
    public.is_admin_campus_safe() as condition_admin_campus,
    public.is_coordinator_safe() as condition_coordinator,
    public.get_user_institution_id() as user_institution_id,
    (SELECT COUNT(*) FROM processed_documents) as total_docs_in_db;

-- 5. Si auth.uid() es NULL, mostrar advertencia
DO $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '⚠️  ADVERTENCIA: auth.uid() es NULL';
        RAISE NOTICE '';
        RAISE NOTICE 'Esto es normal cuando ejecutas desde SQL Editor';
        RAISE NOTICE 'sin estar autenticado.';
        RAISE NOTICE '';
        RAISE NOTICE 'En el FRONTEND, auth.uid() siempre tendrá un valor';
        RAISE NOTICE 'cuando el usuario está autenticado.';
        RAISE NOTICE '';
        RAISE NOTICE 'Para probar desde aquí, necesitas:';
        RAISE NOTICE '1. Hacer login en Supabase Dashboard';
        RAISE NOTICE '2. O usar el user_id directamente en las consultas';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '✅ auth.uid() tiene valor: %', auth.uid();
    END IF;
END $$;

