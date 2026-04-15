-- =====================================================
-- Crear documentos faltantes en processed_documents
-- =====================================================
-- Identifica todos los document_ids únicos en chunks
-- y crea registros en processed_documents para los que faltan

-- 1. Identificar document_ids que están en chunks pero NO en processed_documents
SELECT 
    'Documentos faltantes en processed_documents' as check_type,
    ccc.document_id,
    COUNT(*) as chunks_count,
    COUNT(DISTINCT ccc.course_id) as courses_count,
    MIN(ccc.created_at) as first_chunk_date,
    MAX(ccc.created_at) as last_chunk_date,
    STRING_AGG(DISTINCT CAST(ccc.course_id AS TEXT), ', ') as course_ids
FROM course_content_chunks ccc
WHERE ccc.document_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM processed_documents pd 
      WHERE pd.id = ccc.document_id
  )
GROUP BY ccc.document_id
ORDER BY chunks_count DESC;

-- 2. Crear documentos faltantes basándose en los chunks
-- Obtener institution_id del primer curso asociado usando CTE
WITH document_info AS (
    SELECT 
        ccc.document_id,
        COUNT(*) as total_chunks,
        MIN(ccc.course_id) as first_course_id,
        MIN(ccc.created_at) as first_created_at,
        MAX(ccc.created_at) as last_created_at
    FROM course_content_chunks ccc
    WHERE ccc.document_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 
          FROM processed_documents pd 
          WHERE pd.id = ccc.document_id
      )
    GROUP BY ccc.document_id
    HAVING COUNT(*) > 0
),
document_courses AS (
    SELECT DISTINCT
        di.document_id,
        di.total_chunks,
        di.first_created_at,
        di.last_created_at,
        c.id as course_id,
        c.institution_id,
        c.title as course_title
    FROM document_info di
    JOIN course_content_chunks ccc ON ccc.document_id = di.document_id
    JOIN courses c ON CAST(c.id AS TEXT) = CAST(ccc.course_id AS TEXT)
    WHERE c.institution_id IS NOT NULL
    ORDER BY di.document_id, c.institution_id
)
INSERT INTO processed_documents (
    id,
    institution_id,
    title,
    description,
    total_chunks,
    processing_status,
    created_at,
    updated_at
)
SELECT DISTINCT ON (dc.document_id)
    dc.document_id as id,
    dc.institution_id,  -- Usar la institución del curso
    COALESCE(
        'Documento migrado - ' || dc.course_title,
        'Documento migrado - ' || CAST(dc.document_id AS TEXT)
    ) as title,
    'Documento creado automáticamente desde chunks existentes' as description,
    dc.total_chunks,
    'completed' as processing_status,
    dc.first_created_at as created_at,
    dc.last_created_at as updated_at
FROM document_courses dc
WHERE dc.institution_id IS NOT NULL;

-- 3. Crear asignaciones de cursos para los documentos recién creados
INSERT INTO document_course_assignments (
    document_id,
    course_id,
    assigned_at,
    notes
)
SELECT DISTINCT
    ccc.document_id,
    ccc.course_id::integer as course_id,
    MIN(ccc.created_at) as assigned_at,
    'Asignación automática desde chunks existentes' as notes
FROM course_content_chunks ccc
WHERE ccc.document_id IS NOT NULL
  AND CAST(ccc.course_id AS TEXT) ~ '^[0-9]+$'  -- Solo IDs numéricos
  AND EXISTS (
      SELECT 1 
      FROM processed_documents pd 
      WHERE pd.id = ccc.document_id
  )
  AND NOT EXISTS (
      SELECT 1 
      FROM document_course_assignments dca
      WHERE dca.document_id = ccc.document_id
        AND dca.course_id = ccc.course_id::integer
  )
GROUP BY ccc.document_id, ccc.course_id;

-- 4. Actualizar institution_id de documentos que aún no tienen institución
-- Basándose en los cursos asignados
UPDATE processed_documents pd
SET institution_id = (
    SELECT c.institution_id
    FROM document_course_assignments dca
    JOIN courses c ON c.id = dca.course_id
    WHERE dca.document_id = pd.id
      AND c.institution_id IS NOT NULL
    LIMIT 1
)
WHERE (pd.institution_id IS NULL OR pd.institution_id = 1)  -- Actualizar si es NULL o por defecto
  AND EXISTS (
      SELECT 1
      FROM document_course_assignments dca
      JOIN courses c ON c.id = dca.course_id
      WHERE dca.document_id = pd.id
        AND c.institution_id IS NOT NULL
        AND c.institution_id != 1
  );

-- 4b. Si aún hay documentos sin institución, asignar basándose en chunks directamente
UPDATE processed_documents pd
SET institution_id = (
    SELECT c.institution_id
    FROM course_content_chunks ccc
    JOIN courses c ON CAST(c.id AS TEXT) = CAST(ccc.course_id AS TEXT)
    WHERE ccc.document_id = pd.id
      AND c.institution_id IS NOT NULL
    LIMIT 1
)
WHERE (pd.institution_id IS NULL OR pd.institution_id = 1)
  AND NOT EXISTS (
      SELECT 1
      FROM document_course_assignments dca
      WHERE dca.document_id = pd.id
  )
  AND EXISTS (
      SELECT 1
      FROM course_content_chunks ccc
      JOIN courses c ON CAST(c.id AS TEXT) = CAST(ccc.course_id AS TEXT)
      WHERE ccc.document_id = pd.id
        AND c.institution_id IS NOT NULL
  );

-- 5. Verificación final
SELECT 
    'RESUMEN: Documentos creados' as check_type,
    COUNT(*) as total_documents_in_processed_documents,
    COUNT(DISTINCT institution_id) as distinct_institutions,
    SUM(total_chunks) as total_chunks
FROM processed_documents;

-- 6. Comparar: chunks vs processed_documents
SELECT 
    'Comparación final' as check_type,
    (SELECT COUNT(*) FROM processed_documents) as documents_in_table,
    (SELECT COUNT(DISTINCT document_id) FROM course_content_chunks WHERE document_id IS NOT NULL) as unique_document_ids_in_chunks,
    (SELECT COUNT(DISTINCT document_id) FROM course_content_chunks 
     WHERE document_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM processed_documents WHERE id = document_id)) as missing_documents;

-- 7. Listar todos los documentos por institución
SELECT 
    'Documentos por institución' as check_type,
    i.name as institution_name,
    COUNT(*) as document_count,
    SUM(pd.total_chunks) as total_chunks
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
GROUP BY i.id, i.name
ORDER BY document_count DESC;

