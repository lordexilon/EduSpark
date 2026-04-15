-- 🔍 DIAGNÓSTICO COMPLETO: ¿Por qué no hay chunks en páginas 340-380?

-- PROBLEMA IDENTIFICADO:
-- - Páginas procesadas: 1-1406 (pero solo 172 chunks)
-- - Total páginas detectadas: 287 (¿por qué solo 287 si debería tener más?)
-- - Chunks en rango 340-380: 0 (¡NO HAY CHUNKS en ese rango!)
-- - Jobs process_chunk: No hay filas

-- 1. Ver TODOS los jobs de Williams (incluyendo los que ya se completaron/eliminaron)
SELECT
    fpj.id,
    fpj.file_name,
    fpj.status,
    fpj.metadata->>'jobType' as job_type,
    fpj.metadata->>'pageStart' as page_start,
    fpj.metadata->>'pageEnd' as page_end,
    fpj.metadata->>'totalPages' as total_pages,
    fpj.error_message,
    fpj.created_at,
    fpj.updated_at
FROM file_processing_jobs fpj
WHERE fpj.file_name = 'Williams Gineco.pdf'
ORDER BY 
    CASE WHEN fpj.metadata->>'jobType' = 'split' THEN 0 ELSE 1 END,
    CAST(COALESCE(fpj.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 50;

-- 2. Ver distribución de chunks por rango de páginas (más detallado)
SELECT
    CASE
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1 AND 50 THEN '1-50'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 51 AND 100 THEN '51-100'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 101 AND 200 THEN '101-200'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 201 AND 300 THEN '201-300'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 301 AND 400 THEN '301-400'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 401 AND 500 THEN '401-500'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 501 AND 600 THEN '501-600'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 601 AND 700 THEN '601-700'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 701 AND 800 THEN '701-800'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 801 AND 900 THEN '801-900'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 901 AND 1000 THEN '901-1000'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1001 AND 1100 THEN '1001-1100'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1101 AND 1200 THEN '1101-1200'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1201 AND 1300 THEN '1201-1300'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1301 AND 1400 THEN '1301-1400'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) > 1400 THEN '1400+'
        ELSE 'Sin página'
    END as rango_paginas,
    COUNT(*) as chunks_en_rango,
    MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_min,
    MAX(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_max
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
GROUP BY 
    CASE
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1 AND 50 THEN '1-50'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 51 AND 100 THEN '51-100'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 101 AND 200 THEN '101-200'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 201 AND 300 THEN '201-300'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 301 AND 400 THEN '301-400'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 401 AND 500 THEN '401-500'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 501 AND 600 THEN '501-600'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 601 AND 700 THEN '601-700'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 701 AND 800 THEN '701-800'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 801 AND 900 THEN '801-900'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 901 AND 1000 THEN '901-1000'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1001 AND 1100 THEN '1001-1100'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1101 AND 1200 THEN '1101-1200'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1201 AND 1300 THEN '1201-1300'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 1301 AND 1400 THEN '1301-1400'
        WHEN CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) > 1400 THEN '1400+'
        ELSE 'Sin página'
    END
ORDER BY MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER));

-- 3. Buscar "estadificación" en TODOS los chunks de Williams (sin importar la página)
SELECT
    ccc.metadata->>'pageStart' as pagina,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 500) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 10;

-- 4. Verificar si el PDF realmente tiene solo 287 páginas o si hay un error
-- (Esto requiere ver el archivo original, pero podemos verificar en los jobs)
SELECT
    'Total páginas detectadas por split job' as info,
    fpj.metadata->>'totalPages' as total_pages,
    'Si Williams Ginecología tiene ~995 páginas, entonces solo se procesó una parte' as nota
FROM file_processing_jobs fpj
WHERE fpj.file_name = 'Williams Gineco.pdf'
  AND fpj.metadata->>'jobType' = 'split'
ORDER BY fpj.created_at DESC
LIMIT 1;