-- VERIFICAR: ¿Williams Ginecología se procesó correctamente después de la subida?

-- 1. Ver todos los archivos en el curso 12 (debería incluir Williams Ginecología ahora)
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NOT NULL
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 2. Verificar específicamente Williams Ginecología
SELECT
    'Williams Ginecología chunks' as status,
    COUNT(*) as cantidad_chunks
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%gineco%');

-- 3. Ver si hay chunks con "estadificación" en Williams Ginecología
SELECT
    ccc.id,
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 500) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 5;

-- 4. Ver chunks recientes (última hora) para ver si se procesó recientemente
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_recientes,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.created_at > NOW() - INTERVAL '1 hour'
  AND ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY ultima_creacion DESC;

-- 5. Ver archivos en system_files para Williams
SELECT
    sf.id,
    sf.original_name,
    sf.file_name,
    sf.created_at
FROM system_files sf
WHERE sf.course_id = 12
  AND (sf.original_name ILIKE '%williams%'
       OR sf.file_name ILIKE '%williams%')
ORDER BY sf.created_at DESC;

-- 6. Ver si hay procesamiento reciente en file_processing
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.error_message,
    fp.created_at,
    fp.started_at,
    fp.completed_at
FROM file_processing fp
WHERE fp.created_at > NOW() - INTERVAL '2 hours'
ORDER BY fp.created_at DESC;