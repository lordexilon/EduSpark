-- VERIFICAR: ¿Se procesó correctamente Williams Ginecología?

-- 1. Ver si hay registros en materials
SELECT
    m.id,
    m.title,
    m.file_name,
    m.file_path,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND (m.title ILIKE '%williams%gineco%'
       OR m.title ILIKE '%williams%ginec%'
       OR m.file_name ILIKE '%williams%gineco%');

-- 2. Ver si hay registros en course_materials
SELECT
    cm.id,
    cm.title,
    cm.file_name,
    cm.created_at
FROM course_materials cm
WHERE cm.course_id = 12
  AND (cm.title ILIKE '%williams%gineco%'
       OR cm.title ILIKE '%williams%ginec%'
       OR cm.file_name ILIKE '%williams%gineco%');

-- 3. Ver si hay registros de procesamiento de archivos
SELECT
    fp.id,
    fp.processing_type,
    fp.status,
    fp.error_message,
    fp.created_at
FROM file_processing fp
WHERE fp.input_path ILIKE '%williams%gineco%'
   OR fp.output_path ILIKE '%williams%gineco%'
ORDER BY fp.created_at DESC;

-- 4. Ver archivos del sistema relacionados
SELECT
    sf.id,
    sf.original_name,
    sf.file_name,
    sf.file_path,
    sf.created_at
FROM system_files sf
WHERE sf.course_id = 12
  AND (sf.original_name ILIKE '%williams%gineco%'
       OR sf.file_name ILIKE '%williams%gineco%')
ORDER BY sf.created_at DESC;

-- 5. Ver total de chunks por archivo en curso 12
SELECT
    COUNT(*) as total_chunks_curso_12
FROM course_content_chunks
WHERE course_id = 12;