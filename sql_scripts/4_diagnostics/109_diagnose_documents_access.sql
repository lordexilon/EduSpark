-- =====================================================
-- DIAGNÓSTICO: Acceso a Documentos en /admin/documents
-- =====================================================
-- Este script ayuda a diagnosticar por qué no se ven documentos

-- 1. Verificar si existen documentos en la tabla
SELECT 
    COUNT(*) as total_documents,
    COUNT(DISTINCT institution_id) as institutions_with_documents
FROM processed_documents;

-- 2. Ver documentos existentes (primeros 10)
SELECT 
    id,
    institution_id,
    title,
    processing_status,
    total_chunks,
    created_at
FROM processed_documents
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar políticas RLS activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 4. Verificar funciones helper
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_admin_safe', 'is_admin_campus_safe', 'is_coordinator_safe', 'get_user_institution_id')
ORDER BY routine_name;

-- 5. Verificar usuario actual y su rol
SELECT 
    auth.uid() as current_user_id,
    u.email,
    r.name as role_name,
    ui.institution_id,
    ui.is_primary
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
WHERE u.id = auth.uid();

-- 6. Probar acceso directo (sin RLS) - Solo para diagnóstico
-- Descomentar para probar:
-- SET row_security = off;
-- SELECT COUNT(*) FROM processed_documents;
-- SET row_security = on;

-- 7. Verificar si el usuario puede ver documentos según políticas
SELECT 
    COUNT(*) as visible_documents,
    'Admin access' as access_type
FROM processed_documents
WHERE public.is_admin_safe()
UNION ALL
SELECT 
    COUNT(*) as visible_documents,
    'Institution access' as access_type
FROM processed_documents
WHERE institution_id = public.get_user_institution_id()
UNION ALL
SELECT 
    COUNT(*) as visible_documents,
    'Admin-campus access' as access_type
FROM processed_documents
WHERE public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id()
UNION ALL
SELECT 
    COUNT(*) as visible_documents,
    'Coordinator access' as access_type
FROM processed_documents
WHERE public.is_coordinator_safe() AND institution_id = public.get_user_institution_id();

-- 8. Verificar documentos por institución
SELECT 
    institution_id,
    COUNT(*) as document_count,
    COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_count
FROM processed_documents
GROUP BY institution_id
ORDER BY document_count DESC;

