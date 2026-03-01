-- REPROCESAR: Intentar arreglar Williams Ginecología

-- 1. PRIMERO: Verificar si Williams existe en system_files
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

-- 2. Si existe, actualizar chunks sin sourceFileName con el nombre correcto
-- (Solo ejecutar si Williams está en system_files)
-- UPDATE course_content_chunks
-- SET metadata = jsonb_set(metadata, '{sourceFileName}', '"Williams Gineco.pdf"')
-- WHERE metadata->>'sourceFileName' IS NULL
--   AND created_at > NOW() - INTERVAL '1 hour'
--   AND course_id = 12;

-- 3. Verificar unidades disponibles en el curso 12
SELECT
    cu.id,
    cu.title,
    cu.order_index
FROM course_units cu
WHERE cu.course_id = 12
ORDER BY cu.order_index;

-- 4. Verificar sesiones disponibles
SELECT
    s.id,
    s.title,
    s.unit_id,
    cu.title as unit_title
FROM sessions s
LEFT JOIN course_units cu ON s.unit_id = cu.id
WHERE cu.course_id = 12
ORDER BY cu.order_index, s.created_at;

-- 5. Si Williams está en system_files pero no tiene material_id asignado:
-- INSERT INTO materials (course_id, title, file_name, file_path, created_at)
-- SELECT
--     12,
--     sf.original_name,
--     sf.file_name,
--     sf.file_path,
--     NOW()
-- FROM system_files sf
-- WHERE sf.course_id = 12
--   AND (sf.original_name ILIKE '%williams%' OR sf.file_name ILIKE '%williams%')
--   AND NOT EXISTS (
--       SELECT 1 FROM materials m
--       WHERE m.course_id = 12
--       AND (m.title ILIKE '%williams%' OR m.file_name ILIKE '%williams%')
--   );

-- 6. Ver materiales después de la inserción
SELECT
    m.id,
    m.title,
    m.file_name,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND (m.title ILIKE '%williams%' OR m.file_name ILIKE '%williams%')
ORDER BY m.created_at DESC;