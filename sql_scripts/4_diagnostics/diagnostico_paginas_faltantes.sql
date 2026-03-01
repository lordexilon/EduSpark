-- 🔍 DIAGNÓSTICO: ¿Por qué solo hay 172 chunks y no se encuentra la página 370?

-- 1. Ver rango de páginas procesadas en chunks
SELECT
    'Rango de páginas en chunks' as tipo,
    MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_minima,
    MAX(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_maxima,
    COUNT(*) as total_chunks
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf';

-- 2. Ver qué páginas se procesaron en los jobs
SELECT
    'Rango de páginas en jobs' as tipo,
    MIN(CAST(COALESCE(fpj.metadata->>'pageStart', '0') AS INTEGER)) as pagina_minima,
    MAX(CAST(COALESCE(fpj.metadata->>'pageEnd', '0') AS INTEGER)) as pagina_maxima,
    COUNT(*) as total_jobs_process_chunk
FROM file_processing_jobs fpj
WHERE fpj.file_name = 'Williams Gineco.pdf'
  AND fpj.metadata->>'jobType' = 'process_chunk';

-- 3. Ver el job "split" para saber cuántas páginas detectó
SELECT
    fpj.id,
    fpj.file_name,
    fpj.status,
    fpj.metadata->>'totalPages' as total_pages_detectadas,
    fpj.metadata->>'chunksCreated' as chunks_creados,
    fpj.created_at,
    fpj.updated_at
FROM file_processing_jobs fpj
WHERE fpj.file_name = 'Williams Gineco.pdf'
  AND fpj.metadata->>'jobType' = 'split'
ORDER BY fpj.created_at DESC
LIMIT 1;

-- 4. Verificar si hay chunks en el rango 340-380 (donde debería estar la estadificación)
SELECT
    COUNT(*) as chunks_en_rango_340_380,
    MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_min_en_rango,
    MAX(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_max_en_rango
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 340 AND 380;

-- 5. Ver estado de los jobs process_chunk (¿algunos fallaron?)
SELECT
    fpj.status,
    COUNT(*) as cantidad,
    MIN(CAST(COALESCE(fpj.metadata->>'pageStart', '0') AS INTEGER)) as pagina_min,
    MAX(CAST(COALESCE(fpj.metadata->>'pageEnd', '0') AS INTEGER)) as pagina_max
FROM file_processing_jobs fpj
WHERE fpj.file_name = 'Williams Gineco.pdf'
  AND fpj.metadata->>'jobType' = 'process_chunk'
GROUP BY fpj.status
ORDER BY fpj.status;