-- 🔧 SOLUCIÓN FINAL OPTIMIZADA: Asignar sourceFileName (evitar timeout)

-- ESTRATEGIA: Usar UPDATE directo con condiciones específicas
-- Si da timeout, usar la versión por lotes (solucion_sourceFileName_lotes.sql)

-- IMPORTANTE: Ejecutar primero verificar_indices_para_update.sql para crear índices

-- 1. ACTUALIZAR TODOS LOS CHUNKS DE UNA VEZ (OPTIMIZADO)
-- Usar material_id directamente para hacer el filtro más eficiente
UPDATE course_content_chunks
SET metadata = jsonb_set(
    metadata, 
    '{sourceFileName}', 
    '"Williams Gineco.pdf"'
)
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
  AND (metadata->>'sourceFileName' IS NULL OR metadata->>'sourceFileName' = '');

-- 2. VERIFICAR RESULTADO
SELECT
    COUNT(*) as total_chunks_material,
    COUNT(CASE WHEN metadata->>'sourceFileName' = 'Williams Gineco.pdf' THEN 1 END) as chunks_con_sourceFileName,
    COUNT(CASE WHEN metadata->>'sourceFileName' IS NULL OR metadata->>'sourceFileName' = '' THEN 1 END) as chunks_sin_sourceFileName
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';