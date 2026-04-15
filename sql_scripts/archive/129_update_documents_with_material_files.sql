-- =====================================================
-- Actualizar documentos migrados con archivos de materials
-- =====================================================
-- Este script busca archivos en materials de los cursos asignados
-- y actualiza los documentos migrados con las URLs encontradas

-- 1. Verificar qué documentos migrados tienen cursos asignados con materials
SELECT 
    'Documentos con materials disponibles' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    dca.course_id,
    c.title as course_title,
    COUNT(m.id) as materials_count,
    COUNT(CASE WHEN m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL THEN 1 END) as materials_with_files,
    STRING_AGG(
        COALESCE(
            m.url,
            CASE WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN
                'https://drive.google.com/file/d/' || (m.metadata->>'sourceFileId') || '/view'
            ELSE NULL END
        ), 
        ', '
    ) FILTER (WHERE m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL) as available_urls
FROM processed_documents pd
JOIN document_course_assignments dca ON dca.document_id = pd.id
JOIN courses c ON c.id = dca.course_id
LEFT JOIN materials m ON m.course_id = c.id
WHERE pd.title LIKE 'Documento migrado - %'
  AND (m.url IS NOT NULL OR m.metadata->>'sourceFileId' IS NOT NULL)
GROUP BY pd.id, pd.title, dca.course_id, c.title
ORDER BY pd.title, c.title;

-- 2. Actualizar función get_document_file_url para priorizar bucket sobre Drive
CREATE OR REPLACE FUNCTION get_document_file_url(p_document_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_file_url TEXT;
    v_source_file_id TEXT;
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
    -- Priorizar materials con URL de bucket sobre Google Drive
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
          CASE WHEN m.url LIKE '%supabase.co/storage%' THEN 1 
               WHEN m.url LIKE '%drive.google.com%' THEN 2
               WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN 3
               ELSE 4 END,
          m.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN v_file_url;
END;
$$;

-- 3. Probar la función actualizada
SELECT 
    'URLs encontradas (actualizado)' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    get_document_file_url(pd.id) as file_url_found
FROM processed_documents pd
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title;

-- 4. Actualizar documentos con URLs encontradas
UPDATE processed_documents pd
SET file_url = get_document_file_url(pd.id)
WHERE pd.title LIKE 'Documento migrado - %'
  AND pd.file_url IS NULL
  AND get_document_file_url(pd.id) IS NOT NULL;

-- 5. Verificar actualización final
SELECT 
    'Documentos actualizados (final)' as check_type,
    pd.id,
    pd.title,
    pd.file_url,
    pd.storage_path,
    CASE 
        WHEN pd.file_url LIKE '%supabase.co/storage%' THEN '✅ Tiene file_url (Bucket)'
        WHEN pd.file_url LIKE '%drive.google.com%' THEN '✅ Tiene file_url (Google Drive)'
        WHEN pd.file_url IS NOT NULL THEN '✅ Tiene file_url'
        WHEN pd.storage_path IS NOT NULL THEN '✅ Tiene storage_path'
        ELSE '❌ Sin archivo'
    END as status
FROM processed_documents pd
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title;

