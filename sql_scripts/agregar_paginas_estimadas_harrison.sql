-- Script para agregar metadata de páginas estimadas a chunks de Harrison
-- Basado en el orden de los chunks y distribución uniforme

-- PASO 1: Obtener información de los PDFs de Harrison
-- Necesitamos saber cuántas páginas tiene cada tomo para hacer una estimación precisa

-- Harrison Tomo 1: ~2500 páginas (estimado)
-- Harrison Tomo 2: ~2500 páginas (estimado)

-- PASO 2: Actualizar metadata con páginas estimadas para Harrison Tomo 1
WITH harrison_tomo1_chunks AS (
  SELECT 
    id,
    chunk_index,
    metadata,
    -- Calcular página estimada basándose en el índice del chunk
    -- Si hay 512 chunks y 2500 páginas, cada chunk cubre ~4.88 páginas
    FLOOR((chunk_index - 1) * 2500.0 / 512) + 1 as estimated_page_start,
    FLOOR(chunk_index * 2500.0 / 512) as estimated_page_end
  FROM course_content_chunks
  WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
  ORDER BY chunk_index
)
UPDATE course_content_chunks
SET metadata = jsonb_set(
  jsonb_set(
    course_content_chunks.metadata,
    '{pageStart}',
    to_jsonb(harrison_tomo1_chunks.estimated_page_start)
  ),
  '{pageEnd}',
  to_jsonb(harrison_tomo1_chunks.estimated_page_end)
)
FROM harrison_tomo1_chunks
WHERE course_content_chunks.id = harrison_tomo1_chunks.id;

-- PASO 3: Actualizar metadata con páginas estimadas para Harrison Tomo 2
WITH harrison_tomo2_chunks AS (
  SELECT 
    id,
    chunk_index,
    metadata,
    -- Si hay 503 chunks y 2500 páginas, cada chunk cubre ~4.97 páginas
    FLOOR((chunk_index - 1) * 2500.0 / 503) + 1 as estimated_page_start,
    FLOOR(chunk_index * 2500.0 / 503) as estimated_page_end
  FROM course_content_chunks
  WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04'
  ORDER BY chunk_index
)
UPDATE course_content_chunks
SET metadata = jsonb_set(
  jsonb_set(
    course_content_chunks.metadata,
    '{pageStart}',
    to_jsonb(harrison_tomo2_chunks.estimated_page_start)
  ),
  '{pageEnd}',
  to_jsonb(harrison_tomo2_chunks.estimated_page_end)
)
FROM harrison_tomo2_chunks
WHERE course_content_chunks.id = harrison_tomo2_chunks.id;

-- PASO 4: Verificar que se actualizaron correctamente
SELECT 
    'Harrison Tomo 1' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_paginas,
    MIN((metadata->>'pageStart')::int) as primera_pagina,
    MAX((metadata->>'pageEnd')::int) as ultima_pagina
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
UNION ALL
SELECT 
    'Harrison Tomo 2' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_paginas,
    MIN((metadata->>'pageStart')::int) as primera_pagina,
    MAX((metadata->>'pageEnd')::int) as ultima_pagina
FROM course_content_chunks
WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04';
