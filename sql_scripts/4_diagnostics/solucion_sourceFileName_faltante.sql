-- 🔧 SOLUCIÓN: Asignar sourceFileName a chunks que lo tienen NULL pero tienen material_id

-- 1. VERIFICAR CHUNKS CON material_id PERO SIN sourceFileName
SELECT
    COUNT(*) as chunks_sin_sourceFileName_con_material_id,
    COUNT(DISTINCT ccc.metadata->>'material_id') as materiales_afectados
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NULL
  AND ccc.metadata->>'material_id' IS NOT NULL;

-- 2. OBTENER NOMBRE DEL ARCHIVO DESDE file_processing_jobs O materials
-- Primero obtener el nombre desde el material
SELECT
    m.id as material_id,
    m.title as material_title,
    -- Extraer nombre de archivo del título
    CASE 
        WHEN m.title ILIKE '%.pdf' THEN m.title
        WHEN m.title ILIKE '%Williams Gineco%' THEN 'Williams Gineco.pdf'
        ELSE NULL
    END as source_file_name_propuesto
FROM materials m
WHERE m.id = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';

-- 3. ACTUALIZAR CHUNKS CON sourceFileName FALTANTE
-- Usar el nombre del archivo del job padre o del material
UPDATE course_content_chunks
SET metadata = jsonb_set(
    metadata, 
    '{sourceFileName}', 
    '"Williams Gineco.pdf"'
)
WHERE course_id = 12
  AND metadata->>'sourceFileName' IS NULL
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';

-- 4. VERIFICAR QUE SE ACTUALIZÓ CORRECTAMENTE
SELECT
    COUNT(*) as chunks_con_sourceFileName,
    COUNT(CASE WHEN metadata->>'sourceFileName' = 'Williams Gineco.pdf' THEN 1 END) as chunks_williams_gineco
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';