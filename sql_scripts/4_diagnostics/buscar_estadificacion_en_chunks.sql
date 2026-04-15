-- =====================================================
-- Buscar "Estadificación del cáncer mamario" en chunks
-- Busca variantes de mayúsculas/minúsculas (ILIKE es case-insensitive)
-- Prioriza chunks cerca de página 350
-- =====================================================

-- Buscar en chunks que incluyen la página 350 primero (más eficiente)
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_text,
  metadata->>'pageEnd' as pageEnd_text,
  metadata->>'material_id' as material_id,
  -- Buscar posición aproximada del texto
  POSITION(LOWER('estadificación') IN LOWER(content)) as posicion_en_chunk,
  LEFT(content, 1500) as content_preview
FROM course_content_chunks
WHERE 
  -- Buscar variantes: estadificación, Estadificación, ESTADIFICACIÓN
  content ILIKE '%estadificación%'
  AND (
    -- Priorizar chunks cerca de página 350 (que ya encontramos)
    (metadata->>'pageStart' IS NOT NULL 
     AND metadata->>'pageEnd' IS NOT NULL
     AND LENGTH(metadata->>'pageStart') = 3
     AND metadata->>'pageStart' >= '340'
     AND metadata->>'pageEnd' <= '360')
    OR
    -- También buscar en otros chunks
    metadata->>'pageStart' IS NULL
  )
ORDER BY 
  -- Priorizar chunks con pageStart cerca de 350
  CASE 
    WHEN metadata->>'pageStart' IS NOT NULL 
         AND metadata->>'pageStart' >= '340' 
         AND metadata->>'pageEnd' <= '360' 
    THEN 0 
    ELSE 1 
  END,
  created_at DESC
LIMIT 10;
