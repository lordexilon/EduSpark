-- =====================================================
-- Verificar que admin puede ver todos los documentos
-- =====================================================

-- 1. Contar documentos totales por institución
SELECT 
    'Documentos por institución' as check_type,
    i.id as institution_id,
    i.name as institution_name,
    COUNT(pd.id) as total_documents
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
GROUP BY i.id, i.name
ORDER BY i.id;

-- 2. Verificar políticas RLS actuales
SELECT 
    'Políticas RLS' as check_type,
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

-- 3. Verificar si is_admin_safe() funciona
SELECT 
    'Test is_admin_safe' as check_type,
    public.is_admin_safe() as is_admin,
    (SELECT COUNT(*) FROM processed_documents) as total_docs,
    (SELECT COUNT(*) FROM processed_documents WHERE public.is_admin_safe()) as docs_visible_to_admin;

-- 4. Ver todos los documentos (simulando consulta de admin)
SELECT 
    'Todos los documentos' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    i.name as institution_name,
    pd.file_url,
    pd.storage_path,
    pd.total_chunks,
    pd.created_at
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
ORDER BY pd.created_at DESC;

-- 5. Verificar documentos sin institución
SELECT 
    'Documentos sin institución' as check_type,
    COUNT(*) as count
FROM processed_documents
WHERE institution_id IS NULL;

