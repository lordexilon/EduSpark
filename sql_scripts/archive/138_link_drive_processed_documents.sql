-- =====================================================
-- Vincular documentos procesados desde Drive
-- =====================================================
-- Los documentos procesados desde Drive están en materials
-- pero no están vinculados correctamente con cursos e instituciones

-- 1. Identificar materials procesados desde Drive que tienen chunks
SELECT 
    'Materials procesados desde Drive con chunks' as check_type,
    m.id as material_id,
    m.title as material_title,
    m.course_id,
    c.title as course_title,
    c.institution_id,
    i.name as institution_name,
    m.metadata->>'sourceFileId' as source_file_id,
    m.metadata->>'source' as source,
    m.url as material_url,
    COUNT(DISTINCT ccc.id) as chunks_count,
    COUNT(DISTINCT ccc.document_id) as document_ids_count,
    STRING_AGG(DISTINCT CAST(ccc.document_id AS TEXT), ', ') as document_ids
FROM materials m
JOIN courses c ON c.id = m.course_id
LEFT JOIN institutions i ON i.id = c.institution_id
LEFT JOIN course_content_chunks ccc ON (
    ccc.metadata->>'material_id' = m.id::text
    OR (ccc.course_id = m.course_id AND ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId')
)
WHERE (m.metadata->>'sourceFileId' IS NOT NULL
   OR m.url IS NOT NULL)
  AND m.course_id IS NOT NULL
GROUP BY m.id, m.title, m.course_id, c.title, c.institution_id, i.name,
         m.metadata->>'sourceFileId', m.metadata->>'source', m.url
ORDER BY chunks_count DESC, m.created_at DESC;

-- 2. Crear/actualizar documentos en processed_documents desde materials
-- Agrupar por material_id o por document_id si ya existe
INSERT INTO processed_documents (
    id,
    institution_id,
    title,
    description,
    total_chunks,
    processing_status,
    file_url,
    storage_path,
    file_type,
    created_at,
    updated_at
)
SELECT DISTINCT ON (m.id)
    COALESCE(
        (SELECT ccc.document_id 
         FROM course_content_chunks ccc 
         WHERE ccc.metadata->>'material_id' = m.id::text 
           AND ccc.document_id IS NOT NULL
         LIMIT 1),
        gen_random_uuid()
    ) as id,
    c.institution_id,
    'Documento migrado - ' || m.title as title,
    'Documento procesado desde Google Drive - Material: ' || m.title as description,
    (SELECT COUNT(*) 
     FROM course_content_chunks ccc 
     WHERE ccc.metadata->>'material_id' = m.id::text
        OR (ccc.course_id = m.course_id 
            AND ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId')
    ) as total_chunks,
    'completed' as processing_status,
    COALESCE(
        m.url,
        CASE 
            WHEN m.metadata->>'sourceFileId' IS NOT NULL THEN
                'https://drive.google.com/file/d/' || (m.metadata->>'sourceFileId') || '/view'
            ELSE NULL
        END
    ) as file_url,
    CASE 
        WHEN m.url LIKE '%supabase.co/storage%' THEN m.url
        ELSE NULL
    END as storage_path,
    m.mime_type as file_type,
    m.created_at,
    NOW() as updated_at
FROM materials m
JOIN courses c ON c.id = m.course_id
WHERE (m.metadata->>'sourceFileId' IS NOT NULL
   OR m.url IS NOT NULL)
  AND m.course_id IS NOT NULL
  AND c.institution_id IS NOT NULL
  AND NOT EXISTS (
      -- Verificar si ya existe un documento para este material
      SELECT 1 
      FROM processed_documents pd
      JOIN course_content_chunks ccc ON ccc.document_id = pd.id
      WHERE ccc.metadata->>'material_id' = m.id::text
  )
ON CONFLICT (id) DO UPDATE
SET 
    institution_id = EXCLUDED.institution_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    total_chunks = EXCLUDED.total_chunks,
    file_url = COALESCE(processed_documents.file_url, EXCLUDED.file_url),
    storage_path = COALESCE(processed_documents.storage_path, EXCLUDED.storage_path),
    file_type = COALESCE(processed_documents.file_type, EXCLUDED.file_type),
    updated_at = EXCLUDED.updated_at;

-- 3. Actualizar chunks con document_id basándose en material_id
UPDATE course_content_chunks ccc
SET document_id = (
    SELECT pd.id
    FROM processed_documents pd
    JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
    WHERE pd.title = 'Documento migrado - ' || m.title
    LIMIT 1
)
WHERE ccc.document_id IS NULL
  AND ccc.metadata->>'material_id' IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM processed_documents pd
      JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
      WHERE pd.title = 'Documento migrado - ' || m.title
  );

-- 4. Actualizar chunks con document_id basándose en sourceFileId y course_id
UPDATE course_content_chunks ccc
SET document_id = (
    SELECT pd.id
    FROM processed_documents pd
    JOIN materials m ON (
        m.metadata->>'sourceFileId' = ccc.metadata->>'sourceFileId'
        AND m.course_id = ccc.course_id
    )
    WHERE pd.title = 'Documento migrado - ' || m.title
    LIMIT 1
)
WHERE ccc.document_id IS NULL
  AND ccc.metadata->>'sourceFileId' IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM processed_documents pd
      JOIN materials m ON (
          m.metadata->>'sourceFileId' = ccc.metadata->>'sourceFileId'
          AND m.course_id = ccc.course_id
      )
      WHERE pd.title = 'Documento migrado - ' || m.title
  );

-- 5. Crear asignaciones de cursos para los documentos creados
INSERT INTO document_course_assignments (
    document_id,
    course_id,
    assigned_at,
    notes
)
SELECT DISTINCT
    pd.id as document_id,
    m.course_id,
    m.created_at as assigned_at,
    'Asignación automática desde material procesado: ' || m.title as notes
FROM processed_documents pd
JOIN materials m ON pd.title = 'Documento migrado - ' || m.title
WHERE NOT EXISTS (
    SELECT 1 
    FROM document_course_assignments dca
    WHERE dca.document_id = pd.id
      AND dca.course_id = m.course_id
)
AND m.course_id IS NOT NULL;

-- 6. Actualizar institution_id de documentos basándose en cursos asignados
UPDATE processed_documents pd
SET institution_id = (
    SELECT c.institution_id
    FROM document_course_assignments dca
    JOIN courses c ON c.id = dca.course_id
    WHERE dca.document_id = pd.id
      AND c.institution_id IS NOT NULL
    LIMIT 1
)
WHERE (pd.institution_id IS NULL OR pd.institution_id = 1)
  AND EXISTS (
      SELECT 1
      FROM document_course_assignments dca
      JOIN courses c ON c.id = dca.course_id
      WHERE dca.document_id = pd.id
        AND c.institution_id IS NOT NULL
        AND c.institution_id != 1
  );

-- 7. Actualizar total_chunks en documentos
UPDATE processed_documents pd
SET total_chunks = (
    SELECT COUNT(*)
    FROM course_content_chunks ccc
    WHERE ccc.document_id = pd.id
)
WHERE pd.total_chunks = 0 
   OR pd.total_chunks IS NULL
   OR pd.total_chunks < (
       SELECT COUNT(*)
       FROM course_content_chunks ccc
       WHERE ccc.document_id = pd.id
   );

-- 8. Verificación final
SELECT 
    'RESUMEN: Documentos vinculados desde materials' as check_type,
    COUNT(*) as total_documents,
    COUNT(DISTINCT institution_id) as distinct_institutions,
    SUM(total_chunks) as total_chunks,
    COUNT(CASE WHEN file_url IS NOT NULL THEN 1 END) as with_file_url,
    COUNT(CASE WHEN storage_path IS NOT NULL THEN 1 END) as with_storage_path
FROM processed_documents
WHERE title LIKE 'Documento migrado - %';

-- 9. Listar documentos por institución
SELECT 
    'Documentos por institución' as check_type,
    i.name as institution_name,
    COUNT(*) as document_count,
    SUM(pd.total_chunks) as total_chunks
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
WHERE pd.title LIKE 'Documento migrado - %'
GROUP BY i.id, i.name
ORDER BY document_count DESC;

-- 10. Verificar materials que aún no tienen documentos vinculados
SELECT 
    'Materials sin documentos vinculados' as check_type,
    m.id as material_id,
    m.title as material_title,
    m.course_id,
    c.title as course_title,
    c.institution_id,
    m.metadata->>'sourceFileId' as source_file_id,
    COUNT(DISTINCT ccc.id) as chunks_count
FROM materials m
JOIN courses c ON c.id = m.course_id
LEFT JOIN course_content_chunks ccc ON (
    ccc.metadata->>'material_id' = m.id::text
    OR (ccc.course_id = m.course_id AND ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId')
)
WHERE (m.metadata->>'sourceFileId' IS NOT NULL
   OR m.url IS NOT NULL)
  AND m.course_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM processed_documents pd
      JOIN course_content_chunks ccc2 ON ccc2.document_id = pd.id
      WHERE ccc2.metadata->>'material_id' = m.id::text
         OR (ccc2.course_id = m.course_id 
             AND ccc2.metadata->>'sourceFileId' = m.metadata->>'sourceFileId')
  )
GROUP BY m.id, m.title, m.course_id, c.title, c.institution_id, m.metadata->>'sourceFileId'
HAVING COUNT(DISTINCT ccc.id) > 0
ORDER BY chunks_count DESC;

