-- Verificar documentos en la biblioteca
SELECT 
    id,
    institution_id,
    title,
    file_type,
    total_chunks,
    processing_status,
    created_at
FROM processed_documents
ORDER BY created_at DESC;

-- Verificar asignaciones
SELECT 
    dca.id,
    pd.title as document_title,
    c.title as course_title,
    dca.assigned_at
FROM document_course_assignments dca
JOIN processed_documents pd ON pd.id = dca.document_id
JOIN courses c ON c.id = dca.course_id
ORDER BY dca.assigned_at DESC;

-- Verificar chunks
SELECT 
    document_id,
    COUNT(*) as chunk_count
FROM course_content_chunks
WHERE document_id IS NOT NULL
GROUP BY document_id;
