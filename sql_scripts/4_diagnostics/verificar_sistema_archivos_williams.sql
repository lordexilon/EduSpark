-- VERIFICAR: ¿Existe Williams Ginecología en el sistema de archivos?

-- 1. Buscar en system_files
SELECT
    sf.id,
    sf.original_name,
    sf.file_name,
    sf.file_path,
    sf.file_size,
    sf.created_at
FROM system_files sf
WHERE sf.course_id = 12
  AND (sf.original_name ILIKE '%williams%gineco%'
       OR sf.original_name ILIKE '%williams%ginec%'
       OR sf.file_name ILIKE '%williams%gineco%')
ORDER BY sf.created_at DESC;

-- 2. Buscar en materials
SELECT
    m.id,
    m.title,
    m.file_name,
    m.file_path,
    m.file_size,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND (m.title ILIKE '%williams%gineco%'
       OR m.title ILIKE '%williams%ginec%'
       OR m.file_name ILIKE '%williams%gineco%')
ORDER BY m.created_at DESC;

-- 3. Buscar en course_materials
SELECT
    cm.id,
    cm.title,
    cm.file_name,
    cm.file_path,
    cm.created_at
FROM course_materials cm
WHERE cm.course_id = 12
  AND (cm.title ILIKE '%williams%gineco%'
       OR cm.title ILIKE '%williams%ginec%'
       OR cm.file_name ILIKE '%williams%gineco%')
ORDER BY cm.created_at DESC;

-- 4. Ver todos los archivos del curso 12
SELECT
    'system_files' as tabla,
    COUNT(*) as total_archivos
FROM system_files
WHERE course_id = 12

UNION ALL

SELECT
    'materials' as tabla,
    COUNT(*) as total_archivos
FROM materials
WHERE course_id = 12

UNION ALL

SELECT
    'course_materials' as tabla,
    COUNT(*) as total_archivos
FROM course_materials
WHERE course_id = 12;