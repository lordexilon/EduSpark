-- 🔍 VERIFICAR: ¿Qué páginas de Williams Gineco.pdf se procesaron realmente?

-- 1. Ver rango de páginas procesadas
SELECT
    MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_minima,
    MAX(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_maxima,
    COUNT(*) as total_chunks,
    COUNT(DISTINCT ccc.metadata->>'pageStart') as paginas_diferentes
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf';

-- 2. Ver distribución de chunks por rango de páginas
SELECT
    CASE
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1 AND 100 THEN '1-100'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 101 AND 200 THEN '101-200'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 201 AND 300 THEN '201-300'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 301 AND 400 THEN '301-400'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 401 AND 500 THEN '401-500'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 501 AND 600 THEN '501-600'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 601 AND 700 THEN '601-700'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 701 AND 800 THEN '701-800'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 801 AND 900 THEN '801-900'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 901 AND 1000 THEN '901-1000'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) > 1000 THEN '1000+'
        ELSE 'Sin página'
    END as rango_paginas,
    COUNT(*) as chunks_en_rango
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
GROUP BY 
    CASE
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1 AND 100 THEN '1-100'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 101 AND 200 THEN '101-200'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 201 AND 300 THEN '201-300'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 301 AND 400 THEN '301-400'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 401 AND 500 THEN '401-500'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 501 AND 600 THEN '501-600'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 601 AND 700 THEN '601-700'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 701 AND 800 THEN '701-800'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 801 AND 900 THEN '801-900'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 901 AND 1000 THEN '901-1000'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) > 1000 THEN '1000+'
        ELSE 'Sin página'
    END
ORDER BY MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER));

-- 3. Verificar si hay chunks en el rango 340-380 (donde debería estar la estadificación)
SELECT
    COUNT(*) as chunks_en_rango_340_380
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 340 AND 380;

-- 4. Ver chunks específicos en el rango 340-380
SELECT
    ccc.metadata->>'pageStart' as pagina,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 300) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 340 AND 380
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER)
LIMIT 5;

-- 5. Verificar jobs de procesamiento para ver qué páginas se procesaron
SELECT
    fpj.metadata->>'pageStart' as page_start,
    fpj.metadata->>'pageEnd' as page_end,
    fpj.status,
    COUNT(*) as cantidad_jobs
FROM file_processing_jobs fpj
WHERE fpj.file_name = 'Williams Gineco.pdf'
  AND fpj.metadata->>'jobType' = 'process_chunk'
GROUP BY fpj.metadata->>'pageStart', fpj.metadata->>'pageEnd', fpj.status
ORDER BY CAST(COALESCE(fpj.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 20;