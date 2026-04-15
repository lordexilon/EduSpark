-- VERIFICAR: Estado actual del procesamiento de archivos en curso 12

-- 1. Ver archivos en procesamiento actualmente
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.error_message,
    fp.created_at,
    fp.started_at,
    fp.completed_at
FROM file_processing fp
WHERE fp.status IN ('pending', 'processing')
ORDER BY fp.created_at DESC;

-- 2. Ver archivos procesados recientemente (últimas 24 horas)
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.error_message,
    fp.created_at,
    fp.started_at,
    fp.completed_at
FROM file_processing fp
WHERE fp.created_at > NOW() - INTERVAL '24 hours'
ORDER BY fp.created_at DESC;

-- 3. Ver si hay archivos de Williams Ginecología en procesamiento
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.input_path,
    fp.output_path,
    fp.error_message,
    fp.created_at
FROM file_processing fp
WHERE (fp.input_path ILIKE '%williams%gineco%'
       OR fp.output_path ILIKE '%williams%gineco%')
ORDER BY fp.created_at DESC;

-- 4. Ver archivos del sistema relacionados con Williams
SELECT
    sf.id,
    sf.original_name,
    sf.file_name,
    sf.file_path,
    sf.created_at
FROM system_files sf
WHERE sf.course_id = 12
  AND (sf.original_name ILIKE '%williams%'
       OR sf.file_name ILIKE '%williams%')
ORDER BY sf.created_at DESC;

-- 5. Ver chunks creados en las últimas horas
SELECT
    COUNT(*) as chunks_creados_ultimas_24h
FROM course_content_chunks ccc
WHERE ccc.created_at > NOW() - INTERVAL '24 hours';

-- 6. Ver archivos con más chunks en curso 12 (para comparar)
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NOT NULL
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;