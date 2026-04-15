-- VERIFICAR: ¿Por qué falló el procesamiento de Williams Ginecología?

-- 1. Ver errores en file_processing
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.error_message,
    fp.created_at,
    fp.started_at,
    fp.completed_at
FROM file_processing fp
WHERE fp.status = 'failed'
   OR fp.error_message IS NOT NULL
ORDER BY fp.created_at DESC
LIMIT 10;

-- 2. Ver procesamiento reciente (últimas 24 horas)
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.error_message,
    fp.created_at,
    fp.started_at,
    fp.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(fp.completed_at, NOW()) - fp.started_at)) as duracion_segundos
FROM file_processing fp
WHERE fp.created_at > NOW() - INTERVAL '24 hours'
ORDER BY fp.created_at DESC;

-- 3. Ver si Williams está en system_files
SELECT
    sf.id,
    sf.original_name,
    sf.file_name,
    sf.file_path,
    sf.file_size,
    sf.created_at
FROM system_files sf
WHERE sf.original_name ILIKE '%williams%'
   OR sf.file_name ILIKE '%williams%'
ORDER BY sf.created_at DESC;

-- 4. Ver chunks sin sourceFileName (estos pueden ser de Williams que falló)
SELECT
    COUNT(*) as chunks_sin_archivo,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.metadata->>'sourceFileName' IS NULL
  AND ccc.created_at > NOW() - INTERVAL '24 hours';

-- 5. Ver contenido de algunos chunks sin archivo (últimos 10 minutos)
SELECT
    ccc.id,
    LEFT(ccc.content, 200) as contenido_preview,
    ccc.created_at
FROM course_content_chunks ccc
WHERE ccc.metadata->>'sourceFileName' IS NULL
  AND ccc.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY ccc.created_at DESC
LIMIT 3;