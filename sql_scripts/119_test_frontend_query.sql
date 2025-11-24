-- =====================================================
-- TEST: Simular exactamente lo que hace el frontend
-- =====================================================
-- Este script simula la consulta que hace documentLibraryService.getDocumentsByRole()

-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de hacer login en Supabase Dashboard
-- O usar el user_id directamente para simular

-- 1. Simular la consulta que hace el frontend para admin
-- (Línea 72-75 de documentLibraryService.ts)
SELECT 
    'Test: Consulta frontend para admin' as test_type,
    COUNT(*) as documents_count
FROM processed_documents;

-- 2. Verificar que is_admin_safe() funciona en el contexto de esta consulta
-- Esto es lo que evalúa RLS
SELECT 
    'Test: is_admin_safe() en contexto RLS' as test_type,
    public.is_admin_safe() as is_admin_result,
    auth.uid() as current_user_id;

-- 3. Verificar cada documento individualmente
-- Esto nos dirá si algún documento específico está siendo bloqueado
SELECT 
    'Test: Acceso por documento' as test_type,
    id,
    title,
    institution_id,
    -- Verificar si este documento específico es accesible
    CASE 
        WHEN public.is_admin_safe() THEN '✅ Accesible (admin)'
        WHEN (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL) THEN '✅ Accesible (admin-campus)'
        WHEN (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL) THEN '✅ Accesible (coordinator)'
        WHEN (institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL) THEN '✅ Accesible (institución)'
        ELSE '❌ Bloqueado'
    END as access_status
FROM processed_documents
ORDER BY created_at DESC;

-- 4. Verificar si hay algún problema con la función is_admin_safe()
-- Probar llamarla directamente con el user_id
DO $$
DECLARE
    v_test_user_id UUID := 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e';
    v_role_name TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Verificar rol directamente
    SELECT r.name INTO v_role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = v_test_user_id
      AND u.is_active = true;
    
    v_is_admin := (v_role_name = 'admin');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN MANUAL:';
    RAISE NOTICE '  User ID: %', v_test_user_id;
    RAISE NOTICE '  Rol: %', v_role_name;
    RAISE NOTICE '  Es admin: %', v_is_admin;
    RAISE NOTICE '';
    RAISE NOTICE 'Si el rol es "admin" y is_admin_safe() retorna false,';
    RAISE NOTICE 'puede ser que auth.uid() sea NULL en este contexto.';
    RAISE NOTICE '';
    RAISE NOTICE 'En el FRONTEND, auth.uid() siempre tendrá valor';
    RAISE NOTICE 'cuando el usuario está autenticado.';
    RAISE NOTICE '========================================';
END $$;

-- 5. Si auth.uid() es NULL, mostrar advertencia
DO $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  ADVERTENCIA: auth.uid() es NULL';
        RAISE NOTICE '';
        RAISE NOTICE 'Esto es normal en SQL Editor sin autenticación.';
        RAISE NOTICE 'En el FRONTEND, auth.uid() siempre tendrá valor.';
        RAISE NOTICE '';
        RAISE NOTICE 'Para probar correctamente:';
        RAISE NOTICE '1. Abre http://localhost:5173/admin/documents';
        RAISE NOTICE '2. Abre la consola del navegador (F12)';
        RAISE NOTICE '3. Busca los logs "📄 DocumentLibrary:"';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ auth.uid() tiene valor: %', auth.uid();
        RAISE NOTICE '✅ is_admin_safe() debería funcionar correctamente';
    END IF;
END $$;

-- 6. Query final: Esto es exactamente lo que hace el frontend
-- Si estás autenticado en Supabase, esto debería retornar los documentos
SELECT 
    id,
    institution_id,
    title,
    description,
    file_url,
    file_type,
    file_size_bytes,
    total_chunks,
    processing_status,
    created_at,
    updated_at
FROM processed_documents
ORDER BY created_at DESC;

