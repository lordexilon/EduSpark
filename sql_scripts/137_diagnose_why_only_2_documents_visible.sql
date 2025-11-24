-- =====================================================
-- Diagnóstico: ¿Por qué solo se ven 2 documentos de 27?
-- =====================================================

-- 1. Contar TODOS los documentos en processed_documents
SELECT 
    'Total documentos en processed_documents' as check_type,
    COUNT(*) as total_documents,
    COUNT(DISTINCT institution_id) as distinct_institutions,
    COUNT(CASE WHEN institution_id IS NULL THEN 1 END) as without_institution
FROM processed_documents;

-- 2. Listar TODOS los documentos con su institution_id
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
ORDER BY pd.institution_id, pd.created_at DESC;

-- 3. Verificar políticas RLS actuales
SELECT 
    'Políticas RLS processed_documents' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'processed_documents'
ORDER BY policyname;

-- 4. Simular consulta del frontend (admin sin filtros)
-- Esto debería retornar todos los documentos
SELECT 
    'Simulación consulta admin (sin filtros)' as check_type,
    COUNT(*) as documents_visible,
    COUNT(DISTINCT institution_id) as institutions_visible
FROM processed_documents;

-- 5. Verificar si hay documentos con institution_id NULL
SELECT 
    'Documentos sin institution_id' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    pd.processing_status,
    pd.total_chunks
FROM processed_documents pd
WHERE pd.institution_id IS NULL
ORDER BY pd.created_at DESC;

-- 6. Verificar documentos por institución
SELECT 
    'Documentos por institución' as check_type,
    COALESCE(i.name, 'Sin institución') as institution_name,
    pd.institution_id,
    COUNT(*) as document_count,
    STRING_AGG(pd.title, ' | ') as document_titles
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
GROUP BY i.id, i.name, pd.institution_id
ORDER BY document_count DESC;

-- 7. Verificar si los documentos tienen cursos asignados
SELECT 
    'Documentos con asignaciones de cursos' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    COUNT(dca.course_id) as assigned_courses_count,
    STRING_AGG(CAST(dca.course_id AS TEXT), ', ') as course_ids
FROM processed_documents pd
LEFT JOIN document_course_assignments dca ON dca.document_id = pd.id
GROUP BY pd.id, pd.title, pd.institution_id
ORDER BY assigned_courses_count DESC, pd.title;

-- 8. Verificar chunks asociados a documentos
SELECT 
    'Chunks por documento' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    COUNT(ccc.id) as chunks_count
FROM processed_documents pd
LEFT JOIN course_content_chunks ccc ON ccc.document_id = pd.id
GROUP BY pd.id, pd.title, pd.institution_id
ORDER BY chunks_count DESC, pd.title;

-- 9. Comparar: documentos en processed_documents vs document_ids en chunks
SELECT 
    'Comparación: processed_documents vs chunks' as check_type,
    (SELECT COUNT(*) FROM processed_documents) as in_processed_documents,
    (SELECT COUNT(DISTINCT document_id) FROM course_content_chunks WHERE document_id IS NOT NULL) as unique_document_ids_in_chunks,
    (SELECT COUNT(DISTINCT document_id) FROM course_content_chunks 
     WHERE document_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM processed_documents WHERE id = document_id)) as missing_in_processed_documents;

-- 10. Verificar si hay documentos duplicados o con IDs incorrectos
SELECT 
    'Verificación de IDs duplicados' as check_type,
    pd.id,
    COUNT(*) as count
FROM processed_documents pd
GROUP BY pd.id
HAVING COUNT(*) > 1;

