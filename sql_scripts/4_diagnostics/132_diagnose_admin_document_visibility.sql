-- =====================================================
-- Diagnóstico completo de visibilidad de documentos para admin
-- =====================================================

-- 1. Contar TODOS los documentos en la base de datos
SELECT 
    'Total documentos en BD' as check_type,
    COUNT(*) as total_documents,
    COUNT(DISTINCT institution_id) as total_institutions
FROM processed_documents;

-- 2. Documentos por institución
SELECT 
    'Documentos por institución' as check_type,
    pd.institution_id,
    i.name as institution_name,
    COUNT(*) as document_count
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
GROUP BY pd.institution_id, i.name
ORDER BY pd.institution_id;

-- 3. Listar TODOS los documentos con sus instituciones
SELECT 
    'Todos los documentos' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    i.name as institution_name,
    pd.processing_status,
    pd.total_chunks,
    pd.created_at
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
ORDER BY pd.created_at DESC;

-- 4. Verificar políticas RLS actuales
SELECT 
    'Políticas RLS processed_documents' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'processed_documents'
ORDER BY policyname;

-- 5. Verificar función is_admin_safe
SELECT 
    'Test is_admin_safe' as check_type,
    is_admin_safe() as is_admin_result,
    auth.uid() as current_user_id;

-- 6. Simular consulta del frontend (admin sin filtros)
SELECT 
    'Simulación consulta admin' as check_type,
    COUNT(*) as documents_visible,
    COUNT(DISTINCT institution_id) as institutions_visible
FROM processed_documents;

-- 7. Verificar si hay documentos de otras instituciones
SELECT 
    'Documentos por institución (detallado)' as check_type,
    pd.institution_id,
    i.name as institution_name,
    pd.id as document_id,
    pd.title,
    pd.processing_status
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
ORDER BY pd.institution_id, pd.created_at DESC;

-- 8. Verificar usuarios admin (admin no tiene institution_id)
SELECT 
    'Usuarios admin' as check_type,
    u.id,
    u.email,
    r.name as role_name,
    'N/A (admin no tiene institution_id)' as institution_note
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'admin'
ORDER BY u.created_at DESC;

