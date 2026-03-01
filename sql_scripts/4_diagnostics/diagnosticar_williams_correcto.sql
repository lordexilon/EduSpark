-- DIAGNÓSTICO CORRECTO: Verificar Williams Ginecología usando las tablas reales

-- 1. Ver estado de procesamiento de archivos (file_processing_jobs)
SELECT
    fpj.id,
    fpj.file_name,
    fpj.status,
    fpj.error_message,
    fpj.created_at,
    fpj.updated_at,
    EXTRACT(EPOCH FROM (COALESCE(fpj.updated_at, NOW()) - fpj.created_at)) as duracion_segundos
FROM file_processing_jobs fpj
WHERE fpj.file_name ILIKE '%williams%'
   OR fpj.file_name ILIKE '%gineco%'
ORDER BY fpj.created_at DESC
LIMIT 10;

-- 2. Ver documentos procesados (processed_documents)
SELECT
    pd.id,
    pd.file_name,
    pd.status,
    pd.created_at,
    pd.updated_at
FROM processed_documents pd
WHERE pd.file_name ILIKE '%williams%'
   OR pd.file_name ILIKE '%gineco%'
ORDER BY pd.created_at DESC;

-- 3. Ver archivos en el curso 12 (course_content_chunks)
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 4. Ver si Williams existe en materials
SELECT
    m.id,
    m.title,
    m.file_name,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND (m.title ILIKE '%williams%' OR m.file_name ILIKE '%williams%')
ORDER BY m.created_at DESC;

-- 5. Ver si Williams existe en course_materials
SELECT
    cm.id,
    cm.title,
    cm.file_name,
    cm.created_at
FROM course_materials cm
WHERE cm.course_id = 12
  AND (cm.title ILIKE '%williams%' OR cm.file_name ILIKE '%williams%')
ORDER BY cm.created_at DESC;

-- 6. Contar chunks sin sourceFileName (posiblemente de Williams)
SELECT
    COUNT(*) as chunks_sin_archivo,
    MIN(created_at) as mas_antiguo,
    MAX(created_at) as mas_reciente
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- 7. Ver contenido de chunks recientes sin archivo (últimos 30 min)
SELECT
    id,
    LEFT(content, 300) as preview_contenido,
    created_at
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 2;