-- VERIFICAR: ¿Qué archivos están realmente indexados en el curso 12?

-- 1. Ver todos los archivos únicos en course_content_chunks
SELECT DISTINCT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NOT NULL
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 2. Ver si Williams Gineco existe
SELECT
    'Williams Gineco existe' as status,
    COUNT(*) as chunks
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%');

-- 3. Ver si hay chunks con "estadificación" en cualquier archivo
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_con_estadificacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.content ILIKE '%estadificación%'
GROUP BY ccc.metadata->>'sourceFileName';

-- 4. Ver si la función RPC existe
SELECT
    proname,
    pg_get_function_identity_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'search_course_content_chunks';