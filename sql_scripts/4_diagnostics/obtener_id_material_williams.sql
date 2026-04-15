-- 1. ENCONTRAR EL ID DEL MATERIAL REAL
-- Necesitamos el ID de la tabla 'materials' para vincular los chunks correctamente
SELECT 
    id as material_id, 
    title, 
    file_name
FROM materials 
WHERE course_id = 12 
  AND (title ILIKE '%Williams Gineco%' OR file_name ILIKE '%Williams Gineco%');

-- 2. VERIFICAR CHUNKS HUÉRFANOS NUEVAMENTE
SELECT 
    COUNT(*) as chunks_huerfanos
FROM course_content_chunks 
WHERE course_id = 12 
  AND metadata->>'sourceFileName' IS NULL;