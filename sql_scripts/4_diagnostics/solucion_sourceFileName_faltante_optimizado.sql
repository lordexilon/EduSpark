-- 🔧 SOLUCIÓN OPTIMIZADA: Asignar sourceFileName a chunks (evitar timeout)

-- ESTRATEGIA: Usar UPDATE directo con condiciones específicas e índice
-- IMPORTANTE: Ejecutar en lotes si es necesario

-- 1. PRIMERO: Verificar cuántos chunks se van a actualizar
SELECT
    COUNT(*) as chunks_a_actualizar
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'sourceFileName' IS NULL
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';

-- 2. ACTUALIZAR EN LOTE (usar material_id para hacer el filtro más específico)
-- Usar material_id directamente en el WHERE para aprovechar índices
UPDATE course_content_chunks
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb), 
    '{sourceFileName}', 
    '"Williams Gineco.pdf"'
)
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
  AND (metadata->>'sourceFileName' IS NULL OR metadata->>'sourceFileName' = 'null');

-- 3. VERIFICAR QUE SE ACTUALIZÓ
SELECT
    COUNT(*) as total_chunks_material,
    COUNT(CASE WHEN metadata->>'sourceFileName' = 'Williams Gineco.pdf' THEN 1 END) as chunks_con_sourceFileName,
    COUNT(CASE WHEN metadata->>'sourceFileName' IS NULL THEN 1 END) as chunks_sin_sourceFileName
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';