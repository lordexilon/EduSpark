-- 🔍 DIAGNÓSTICO COMPLETO: Entender qué está pasando con el procesamiento de Williams Ginecología (CORREGIDO)

-- 1. VER ESTADO DE file_processing_jobs PARA WILLIAMS
SELECT
    fpj.id,
    fpj.file_name,
    fpj.status,
    fpj.metadata->>'jobType' as job_type,
    fpj.metadata->>'materialId' as material_id,
    fpj.metadata->>'pageStart' as page_start,
    fpj.metadata->>'pageEnd' as page_end,
    fpj.metadata->>'totalPages' as total_pages,
    fpj.error_message,
    fpj.created_at,
    fpj.updated_at
FROM file_processing_jobs fpj
WHERE fpj.file_name ILIKE '%williams%gineco%'
ORDER BY fpj.created_at DESC
LIMIT 20;

-- 2. VER MATERIALES RELACIONADOS CON WILLIAMS (CORREGIDO: sin file_name)
SELECT
    m.id as material_id,
    m.title,
    m.course_id,
    m.rag_status,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND m.title ILIKE '%williams%gineco%'
ORDER BY m.created_at DESC;

-- 3. VER CHUNKS ACTUALES Y SU METADATA (muestra la estructura real)
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as source_file_name,
    ccc.metadata->>'material_id' as material_id_metadata,
    ccc.metadata->>'pageStart' as page_start,
    ccc.metadata->>'pageEnd' as page_end,
    LEFT(ccc.content, 100) as content_preview,
    ccc.created_at
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND (ccc.metadata->>'sourceFileName' ILIKE '%williams%'
       OR ccc.metadata->>'sourceFileName' IS NULL)
ORDER BY ccc.created_at DESC
LIMIT 10;

-- 4. CONTAR CHUNKS POR ESTADO DE sourceFileName
SELECT
    CASE 
        WHEN ccc.metadata->>'sourceFileName' IS NULL THEN 'Sin sourceFileName'
        WHEN ccc.metadata->>'sourceFileName' ILIKE '%williams%' THEN 'Con Williams en nombre'
        ELSE 'Otro archivo'
    END as estado_sourceFileName,
    COUNT(*) as total_chunks,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY 
    CASE 
        WHEN ccc.metadata->>'sourceFileName' IS NULL THEN 'Sin sourceFileName'
        WHEN ccc.metadata->>'sourceFileName' ILIKE '%williams%' THEN 'Con Williams en nombre'
        ELSE 'Otro archivo'
    END;

-- 5. VER SI HAY MATERIAL_ID EN LOS CHUNKS HUÉRFANOS
SELECT
    COUNT(*) as chunks_sin_sourceFileName,
    COUNT(CASE WHEN ccc.metadata->>'material_id' IS NOT NULL THEN 1 END) as chunks_con_material_id,
    COUNT(CASE WHEN ccc.metadata->>'material_id' IS NULL THEN 1 END) as chunks_sin_material_id,
    COUNT(DISTINCT ccc.metadata->>'material_id') as materiales_diferentes_en_chunks
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NULL;

-- 6. VER PROCESSED_DOCUMENTS (tabla de registro de procesamiento)
SELECT
    pd.id,
    pd.title,
    pd.processing_status,
    pd.total_chunks,
    pd.created_at,
    pd.updated_at
FROM processed_documents pd
WHERE pd.title ILIKE '%williams%gineco%'
ORDER BY pd.created_at DESC;

-- 7. VER SI HAY RELACIÓN ENTRE MATERIAL_ID Y CHUNKS (últimos chunks procesados)
SELECT
    ccc.metadata->>'material_id' as material_id_de_chunk,
    m.title as material_title,
    COUNT(*) as chunks_count
FROM course_content_chunks ccc
LEFT JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12
  AND ccc.created_at > NOW() - INTERVAL '2 days'
GROUP BY ccc.metadata->>'material_id', m.title
ORDER BY chunks_count DESC
LIMIT 10;

-- 8. VER JOBS HIJOS (process_chunk) PARA WILLIAMS
SELECT
    fpj.id,
    fpj.file_name,
    fpj.status,
    fpj.metadata->>'jobType' as job_type,
    fpj.metadata->>'pageStart' as page_start,
    fpj.metadata->>'pageEnd' as page_end,
    fpj.error_message,
    fpj.created_at,
    fpj.updated_at
FROM file_processing_jobs fpj
WHERE fpj.file_name ILIKE '%williams%gineco%'
  AND fpj.metadata->>'jobType' = 'process_chunk'
ORDER BY CAST(fpj.metadata->>'pageStart' AS INTEGER)
LIMIT 20;

-- 9. CONTAR JOBS POR ESTADO PARA WILLIAMS
SELECT
    fpj.status,
    fpj.metadata->>'jobType' as job_type,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN fpj.error_message IS NOT NULL THEN 1 END) as con_error
FROM file_processing_jobs fpj
WHERE fpj.file_name ILIKE '%williams%gineco%'
GROUP BY fpj.status, fpj.metadata->>'jobType'
ORDER BY fpj.status, fpj.metadata->>'jobType';