-- =====================================================
-- Ver contenido de chunks específicos que incluyen página 350
-- SIN búsqueda de texto - Solo muestra contenido directamente
-- =====================================================

-- Obtener contenido completo de chunks que incluyen página 350
-- Usar IDs específicos o rangos de páginas exactos
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_text,
  metadata->>'pageEnd' as pageEnd_text,
  metadata->>'material_id' as material_id,
  LEFT(content, 2000) as content_preview
FROM course_content_chunks
WHERE 
  metadata->>'pageStart' IS NOT NULL
  AND metadata->>'pageEnd' IS NOT NULL
  -- Solo chunks que definitivamente incluyen página 350
  AND (
    -- Chunk 346-350
    (metadata->>'pageStart' = '346' AND metadata->>'pageEnd' = '350')
    OR
    -- Chunk 347-351
    (metadata->>'pageStart' = '347' AND metadata->>'pageEnd' = '351')
    OR
    -- Chunk 341-357
    (metadata->>'pageStart' = '341' AND metadata->>'pageEnd' = '357')
    OR
    -- Chunk 349-352 (que encontramos antes)
    (metadata->>'pageStart' = '349' AND metadata->>'pageEnd' = '352')
  )
ORDER BY metadata->>'pageStart'
LIMIT 5;
