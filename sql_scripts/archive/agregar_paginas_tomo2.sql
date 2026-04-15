-- Actualizar Harrison Tomo 2 en batches de 50 chunks
-- Ejecutar múltiples veces cambiando el rango hasta completar los 503 chunks

-- BATCH 1: Chunks 1-50
WITH harrison_tomo2_batch AS (
  SELECT 
    id,
    chunk_index,
    FLOOR((chunk_index - 1) * 2500.0 / 503) + 1 as estimated_page_start,
    FLOOR(chunk_index * 2500.0 / 503) as estimated_page_end
  FROM course_content_chunks
  WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04'
    AND chunk_index BETWEEN 1 AND 50
  ORDER BY chunk_index
)
UPDATE course_content_chunks
SET metadata = jsonb_set(
  jsonb_set(
    metadata,
    '{pageStart}',
    to_jsonb(harrison_tomo2_batch.estimated_page_start)
  ),
  '{pageEnd}',
  to_jsonb(harrison_tomo2_batch.estimated_page_end)
)
FROM harrison_tomo2_batch
WHERE course_content_chunks.id = harrison_tomo2_batch.id;

-- Ver progreso
SELECT 
    'Harrison Tomo 2' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_paginas,
    ROUND(COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as porcentaje
FROM course_content_chunks
WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04';

-- INSTRUCCIONES:
-- 1. Ejecuta este script (actualiza chunks 1-50)
-- 2. Cambia "BETWEEN 1 AND 50" a "BETWEEN 51 AND 100" y ejecuta de nuevo
-- 3. Cambia a "BETWEEN 101 AND 150" y ejecuta
-- 4. Continúa hasta llegar a "BETWEEN 501 AND 503"
