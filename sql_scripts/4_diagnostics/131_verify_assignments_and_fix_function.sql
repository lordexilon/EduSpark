-- =====================================================
-- Verificar asignaciones y corregir función
-- =====================================================

-- 1. Verificar si los documentos tienen cursos asignados
SELECT 
    'Cursos asignados a documentos migrados' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    dca.course_id,
    c.title as course_title,
    c.id as course_id_num
FROM processed_documents pd
LEFT JOIN document_course_assignments dca ON dca.document_id = pd.id
LEFT JOIN courses c ON c.id = dca.course_id
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title, c.title;

-- 2. Verificar materials disponibles en los cursos asignados
SELECT 
    'Materials disponibles en cursos asignados' as check_type,
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

-- 3. Recrear la función con mejor lógica de búsqueda
CREATE OR REPLACE FUNCTION get_document_file_url(p_document_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_file_url TEXT;
    v_source_file_id TEXT;
BEGIN
    -- Primero: Intentar obtener desde storage_path del documento mismo
    SELECT storage_path INTO v_file_url
    FROM processed_documents
    WHERE id = p_document_id
      AND storage_path IS NOT NULL;
    
    IF v_file_url IS NOT NULL THEN
        RETURN v_file_url;
    END IF;
    
    -- Segundo: Intentar obtener desde file_url del documento mismo
    SELECT file_url INTO v_file_url
    FROM processed_documents
    WHERE id = p_document_id
      AND file_url IS NOT NULL;
    
    IF v_file_url IS NOT NULL THEN
        RETURN v_file_url;
    END IF;
    
    -- Tercero: Buscar en metadata de chunks
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
    
    -- Cuarto: Si no se encontró, buscar en materials de los cursos asignados
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
              OR m.metadata->>'downloadUrl' IS NOT NULL
          )
        ORDER BY 
          -- Priorizar materials con URL de bucket sobre Google Drive
          CASE 
              WHEN m.url LIKE '%supabase.co/storage%' THEN 1 
              WHEN m.url LIKE '%drive.google.com%' THEN 2
              WHEN m.url IS NOT NULL THEN 3
              WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN 4
              ELSE 5 
          END,
          m.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN v_file_url;
END;
$$;

-- 4. Probar la función actualizada
SELECT 
    'Test función actualizada' as check_type,
    pd.id as document_id,
    pd.title as document_title,
    get_document_file_url(pd.id) as file_url_result
FROM processed_documents pd
WHERE pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title;

-- 5. Si la función ahora funciona, actualizar los documentos
UPDATE processed_documents pd
SET file_url = get_document_file_url(pd.id)
WHERE pd.title LIKE 'Documento migrado - %'
  AND pd.file_url IS NULL
  AND get_document_file_url(pd.id) IS NOT NULL;

-- 6. Verificar actualización final
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

