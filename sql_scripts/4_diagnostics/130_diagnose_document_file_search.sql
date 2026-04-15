-- =====================================================
-- Diagnóstico detallado de búsqueda de archivos
-- =====================================================

-- 1. Verificar si los documentos tienen cursos asignados
SELECT 
    'Cursos asignados a documentos' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    dca.course_id,
    c.title as course_title
FROM processed_documents pd
LEFT JOIN document_course_assignments dca ON dca.document_id = pd.id
LEFT JOIN courses c ON c.id = dca.course_id
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title, c.title;

-- 2. Verificar materials de los cursos asignados
SELECT 
    'Materials de cursos asignados' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    dca.course_id,
    c.title as course_title,
    m.id as material_id,
    m.title as material_title,
    m.url as material_url,
    m.metadata->>'sourceFileId' as source_file_id,
    CASE 
        WHEN m.url LIKE '%supabase.co/storage%' THEN 'Bucket'
        WHEN m.url LIKE '%drive.google.com%' THEN 'Google Drive URL'
        WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN 'Google Drive ID'
        ELSE 'Sin archivo'
    END as file_type
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title LIKE 'Documento migrado - %'
  AND (m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL)
ORDER BY pd.title, 
  CASE WHEN m.url LIKE '%supabase.co/storage%' THEN 1 ELSE 2 END,
  m.created_at DESC;

-- 3. Probar la función manualmente para cada documento
SELECT 
    'Test función get_document_file_url' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    get_document_file_url(pd.id) as file_url_result
FROM processed_documents pd
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title;

-- 4. Verificar paso a paso qué encuentra la función
-- Para "Documento migrado - CONAREM INTENSIVO"
SELECT 
    'Paso a paso: CONAREM INTENSIVO' as check_type,
    '1. Buscar en chunks' as step,
    ccc.metadata->>'sourceFileId' as chunk_source_file_id,
    ccc.metadata->>'sourceUrl' as chunk_source_url
FROM processed_documents pd
JOIN course_content_chunks ccc ON ccc.document_id = pd.id
WHERE pd.title = 'Documento migrado - CONAREM INTENSIVO'
  AND (ccc.metadata->>'sourceFileId' IS NOT NULL 
       OR ccc.metadata->>'sourceUrl' IS NOT NULL)
LIMIT 1;

-- 5. Verificar materials del curso asignado para CONAREM INTENSIVO
SELECT 
    'Paso a paso: Materials de CONAREM' as check_type,
    dca.course_id,
    c.title as course_title,
    m.id as material_id,
    m.title as material_title,
    m.url as material_url,
    m.metadata->>'sourceFileId' as source_file_id,
    CASE 
        WHEN m.url LIKE '%supabase.co/storage%' THEN 1
        WHEN m.url LIKE '%drive.google.com%' THEN 2
        WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN 3
        ELSE 4
    END as priority
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title = 'Documento migrado - CONAREM INTENSIVO'
  AND (m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL)
ORDER BY priority, m.created_at DESC;

-- 6. Verificar materials del curso asignado para Matematica
SELECT 
    'Paso a paso: Materials de Matematica' as check_type,
    dca.course_id,
    c.title as course_title,
    m.id as material_id,
    m.title as material_title,
    m.url as material_url,
    m.metadata->>'sourceFileId' as source_file_id,
    CASE 
        WHEN m.url LIKE '%supabase.co/storage%' THEN 1
        WHEN m.url LIKE '%drive.google.com%' THEN 2
        WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN 3
        ELSE 4
    END as priority
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title = 'Documento migrado - Matematica para Empresas 1'
  AND (m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL)
ORDER BY priority, m.created_at DESC;

