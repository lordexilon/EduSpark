-- =====================================================
-- Migración de Datos Existentes a Sistema de Biblioteca
-- Convierte chunks existentes en documentos de biblioteca
-- =====================================================

-- PASO 1: Crear documentos a partir de chunks existentes agrupados por course_id
-- Esto crea un documento por cada curso que tiene chunks
INSERT INTO processed_documents (id, institution_id, title, description, total_chunks, processing_status, created_at)
SELECT 
    gen_random_uuid() as id,
    COALESCE(c.institution_id, 1) as institution_id,
    'Documento migrado - ' || COALESCE(c.title, 'Curso ' || ccc.course_id) as title,
    'Documento creado automáticamente durante migración de sistema legacy' as description,
    COUNT(*) as total_chunks,
    'completed' as processing_status,
    MIN(ccc.created_at) as created_at
FROM course_content_chunks ccc
LEFT JOIN courses c ON CAST(c.id AS TEXT) = CAST(ccc.course_id AS TEXT)
WHERE ccc.document_id IS NULL
  AND CAST(ccc.course_id AS TEXT) ~ '^[0-9]+$'  -- Solo IDs numéricos
GROUP BY c.id, c.institution_id, c.title, ccc.course_id
HAVING COUNT(*) > 0;

-- PASO 2: Actualizar chunks con document_id
-- Asocia cada chunk con el documento recién creado
WITH document_mapping AS (
    SELECT 
        pd.id as document_id,
        CAST(c.id AS TEXT) as course_id_text
    FROM processed_documents pd
    JOIN courses c ON c.institution_id = pd.institution_id
    WHERE pd.title LIKE 'Documento migrado - %'
)
UPDATE course_content_chunks ccc
SET 
    document_id = dm.document_id,
    chunk_index = (
        SELECT COUNT(*) 
        FROM course_content_chunks ccc2 
        WHERE ccc2.course_id = ccc.course_id 
        AND ccc2.created_at < ccc.created_at
    ) + 1
FROM document_mapping dm
WHERE CAST(ccc.course_id AS TEXT) = dm.course_id_text
AND ccc.document_id IS NULL;

-- PASO 3: Crear asignaciones iniciales
-- Asigna cada documento al curso del que proviene
INSERT INTO document_course_assignments (document_id, course_id, assigned_at, notes)
SELECT DISTINCT 
    ccc.document_id,
    ccc.course_id::integer as course_id,
    MIN(ccc.created_at) as assigned_at,
    'Asignación automática durante migración' as notes
FROM course_content_chunks ccc
WHERE ccc.document_id IS NOT NULL
AND CAST(ccc.course_id AS TEXT) ~ '^[0-9]+$'
AND NOT EXISTS (
    SELECT 1 FROM document_course_assignments dca
    WHERE dca.document_id = ccc.document_id
    AND dca.course_id = ccc.course_id::integer
)
GROUP BY ccc.document_id, ccc.course_id;

-- PASO 4: Actualizar contadores de chunks en documentos
UPDATE processed_documents pd
SET total_chunks = (
    SELECT COUNT(*)
    FROM course_content_chunks ccc
    WHERE ccc.document_id = pd.id
)
WHERE pd.total_chunks = 0 OR pd.total_chunks IS NULL;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
    v_documents_created INTEGER;
    v_chunks_updated INTEGER;
    v_assignments_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_documents_created FROM processed_documents WHERE title LIKE 'Documento migrado - %';
    SELECT COUNT(*) INTO v_chunks_updated FROM course_content_chunks WHERE document_id IS NOT NULL;
    SELECT COUNT(*) INTO v_assignments_created FROM document_course_assignments;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Documentos creados: %', v_documents_created;
    RAISE NOTICE '✅ Chunks actualizados: %', v_chunks_updated;
    RAISE NOTICE '✅ Asignaciones creadas: %', v_assignments_created;
    RAISE NOTICE '==========================================';
END $$;

-- Consulta de verificación: Documentos por institución
SELECT 
    i.name as institucion,
    COUNT(DISTINCT pd.id) as total_documentos,
    SUM(pd.total_chunks) as total_chunks
FROM processed_documents pd
JOIN institutions i ON i.id = pd.institution_id
GROUP BY i.id, i.name
ORDER BY total_documentos DESC;

-- Consulta de verificación: Asignaciones por curso
SELECT 
    c.title as curso,
    COUNT(dca.id) as documentos_asignados
FROM courses c
LEFT JOIN document_course_assignments dca ON dca.course_id = c.id
GROUP BY c.id, c.title
HAVING COUNT(dca.id) > 0
ORDER BY documentos_asignados DESC
LIMIT 10;
