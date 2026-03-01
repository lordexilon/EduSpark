-- =====================================================
-- Búsqueda profunda de archivos para documentos migrados
-- =====================================================

-- 1. Verificar TODOS los campos de metadata en chunks
SELECT 
    'Metadata completa de chunks' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    key as metadata_key,
    ccc.metadata->>key as metadata_value
FROM processed_documents pd
JOIN course_content_chunks ccc ON ccc.document_id = pd.id
CROSS JOIN LATERAL jsonb_object_keys(ccc.metadata) AS key
WHERE pd.title LIKE 'Documento migrado - %'
  AND ccc.metadata IS NOT NULL
LIMIT 50;

-- 2. Ver TODA la metadata de chunks (sin agrupar)
SELECT 
    'Metadata completa' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    ccc.metadata as full_metadata
FROM processed_documents pd
JOIN course_content_chunks ccc ON ccc.document_id = pd.id
WHERE pd.title LIKE 'Documento migrado - %'
  AND ccc.metadata IS NOT NULL
LIMIT 10;

-- 3. Buscar en materials de los cursos asignados
SELECT 
    'Materials de cursos asignados' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    dca.course_id,
    c.title as course_title,
    m.id as material_id,
    m.title as material_title,
    m.kind as material_kind,
    m.url as material_url,
    m.metadata as material_metadata
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title, c.title, m.created_at DESC;

-- 4. Buscar materials con sourceFileId en metadata
SELECT 
    'Materials con sourceFileId' as check_type,
    m.id as material_id,
    m.title as material_title,
    m.course_id,
    c.title as course_title,
    m.metadata->>'sourceFileId' as source_file_id,
    m.metadata->>'source' as source,
    m.url as material_url,
    m.metadata->>'url' as metadata_url,
    m.metadata->>'fileUrl' as metadata_fileUrl
FROM materials m
JOIN courses c ON c.id = m.course_id
WHERE m.metadata->>'sourceFileId' IS NOT NULL
  OR m.url IS NOT NULL
  OR m.metadata->>'url' IS NOT NULL
  OR m.metadata->>'fileUrl' IS NOT NULL
ORDER BY m.created_at DESC;

-- 5. Verificar si hay relación entre documentos y materials a través de chunks
SELECT 
    'Relación chunks-materials' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    ccc.metadata->>'material_id' as chunk_material_id,
    m.id as material_id,
    m.title as material_title,
    m.url as material_url,
    m.metadata->>'sourceFileId' as material_source_file_id
FROM processed_documents pd
JOIN course_content_chunks ccc ON ccc.document_id = pd.id
LEFT JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE pd.title LIKE 'Documento migrado - %'
  AND ccc.metadata->>'material_id' IS NOT NULL
LIMIT 20;

-- 6. Verificar si los cursos asignados tienen materials con archivos
SELECT 
    'Cursos asignados con materials' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    dca.course_id,
    c.title as course_title,
    COUNT(m.id) as materials_count,
    COUNT(CASE WHEN m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL THEN 1 END) as materials_with_files
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title LIKE 'Documento migrado - %'
GROUP BY pd.id, pd.title, dca.course_id, c.title
ORDER BY pd.title, c.title;

