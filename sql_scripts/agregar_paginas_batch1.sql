-- Script optimizado: Actualizar metadata de páginas en batches pequeños
-- Ejecutar SOLO UNO de estos a la vez

-- OPCIÓN 1: Actualizar solo los primeros 50 chunks de Harrison Tomo 1
-- Ejecuta esto primero, espera que termine, luego ejecuta OPCIÓN 2, etc.

WITH harrison_tomo1_batch AS (
  SELECT 
    id,
    chunk_index,
    FLOOR((chunk_index - 1) * 2500.0 / 512) + 1 as estimated_page_start,
    FLOOR(chunk_index * 2500.0 / 512) as estimated_page_end
  FROM course_content_chunks
  WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
    AND chunk_index <= 50
  ORDER BY chunk_index
)
UPDATE course_content_chunks
SET metadata = jsonb_set(
  jsonb_set(
    metadata,
    '{pageStart}',
    to_jsonb(harrison_tomo1_batch.estimated_page_start)
  ),
  '{pageEnd}',
  to_jsonb(harrison_tomo1_batch.estimated_page_end)
)
FROM harrison_tomo1_batch
WHERE course_content_chunks.id = harrison_tomo1_batch.id;

-- Ver progreso
SELECT 
    'Harrison Tomo 1' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_paginas
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332';
