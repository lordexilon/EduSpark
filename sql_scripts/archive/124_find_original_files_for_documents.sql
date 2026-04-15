-- =====================================================
-- Buscar archivos originales para documentos migrados
-- =====================================================
-- Este script busca en los chunks y materials para encontrar
-- los archivos originales de los documentos migrados

-- 1. Verificar metadata de chunks para documentos migrados
SELECT 
    'Metadata de chunks' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    ccc.metadata->>'sourceFileId' as source_file_id,
    ccc.metadata->>'sourceFileName' as source_file_name,
    ccc.metadata->>'sourceUrl' as source_url,
    ccc.metadata->>'fileUrl' as file_url,
    ccc.metadata->>'downloadUrl' as download_url,
    COUNT(*) as chunks_count
FROM processed_documents pd
JOIN course_content_chunks ccc ON ccc.document_id = pd.id
WHERE pd.title LIKE 'Documento migrado - %'
GROUP BY pd.id, pd.title, 
    ccc.metadata->>'sourceFileId',
    ccc.metadata->>'sourceFileName',
    ccc.metadata->>'sourceUrl',
    ccc.metadata->>'fileUrl',
    ccc.metadata->>'downloadUrl'
ORDER BY pd.title;

-- 2. Buscar en materials si hay archivos relacionados
SELECT 
    'Materials relacionados' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    m.id as material_id,
    m.title as material_title,
    m.kind as material_kind,
    m.url as material_url,
    m.metadata->>'sourceFileId' as material_source_file_id,
    m.metadata->>'source' as material_source,
    m.metadata->>'url' as material_metadata_url,
    m.metadata->>'fileUrl' as material_metadata_fileUrl
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title LIKE 'Documento migrado - %'
  AND (m.url IS NOT NULL 
       OR m.metadata->>'sourceFileId' IS NOT NULL
       OR m.metadata->>'url' IS NOT NULL
       OR m.metadata->>'fileUrl' IS NOT NULL)
ORDER BY pd.title, m.created_at DESC;

-- 3. Crear función para obtener URL del archivo desde metadata
CREATE OR REPLACE FUNCTION get_document_file_url(p_document_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_file_url TEXT;
    v_source_file_id TEXT;
    v_metadata_url TEXT;
BEGIN
    -- Intentar obtener desde metadata de chunks
    SELECT 
        COALESCE(
            ccc.metadata->>'sourceUrl',
            ccc.metadata->>'fileUrl',
            ccc.metadata->>'downloadUrl',
            CASE 
                WHEN ccc.metadata->>'sourceFileId' IS NOT NULL THEN
                    'https://drive.google.com/file/d/' || (ccc.metadata->>'sourceFileId') || '/view'
                ELSE NULL
            END
        )
    INTO v_file_url
    FROM course_content_chunks ccc
    WHERE ccc.document_id = p_document_id
      AND (
          ccc.metadata->>'sourceUrl' IS NOT NULL
          OR ccc.metadata->>'fileUrl' IS NOT NULL
          OR ccc.metadata->>'downloadUrl' IS NOT NULL
          OR ccc.metadata->>'sourceFileId' IS NOT NULL
      )
    LIMIT 1;
    
    -- Si no se encontró, buscar en materials del curso asignado
    IF v_file_url IS NULL THEN
        SELECT 
            COALESCE(
                m.url,
                m.metadata->>'url',
                m.metadata->>'fileUrl',
                m.metadata->>'downloadUrl',
                CASE 
                    WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN
                        'https://drive.google.com/file/d/' || (m.metadata->>'sourceFileId') || '/view'
                    ELSE NULL
                END
            )
        INTO v_file_url
        FROM document_course_assignments dca
        JOIN courses c ON c.id = dca.course_id
        JOIN materials m ON m.course_id = c.id
        WHERE dca.document_id = p_document_id
          AND (
              m.url IS NOT NULL
              OR m.metadata->>'sourceFileId' IS NOT NULL
              OR m.metadata->>'url' IS NOT NULL
              OR m.metadata->>'fileUrl' IS NOT NULL
          )
        ORDER BY 
          -- Priorizar materials con URL de bucket sobre Google Drive
          CASE WHEN m.url LIKE '%supabase.co/storage%' THEN 1 ELSE 2 END,
          m.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN v_file_url;
END;
$$;

-- 4. Probar la función con los documentos migrados
SELECT 
    'URLs encontradas' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    get_document_file_url(pd.id) as file_url_found
FROM processed_documents pd
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title;

-- 5. Actualizar documentos con URLs encontradas
UPDATE processed_documents pd
SET file_url = get_document_file_url(pd.id)
WHERE pd.title LIKE 'Documento migrado - %'
  AND pd.file_url IS NULL
  AND get_document_file_url(pd.id) IS NOT NULL;

-- 6. Verificar actualización
SELECT 
    'Documentos actualizados' as check_type,
    pd.id,
    pd.title,
    pd.file_url,
    pd.storage_path,
    CASE 
        WHEN pd.file_url IS NOT NULL THEN '✅ Tiene file_url'
        WHEN pd.storage_path IS NOT NULL THEN '✅ Tiene storage_path'
        ELSE '❌ Sin archivo'
    END as status
FROM processed_documents pd
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title;

