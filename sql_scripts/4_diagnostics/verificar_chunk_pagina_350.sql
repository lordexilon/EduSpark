-- =====================================================
-- Verificar chunk específico que debería incluir página 350
-- El chunk con pageStart=349 y pageEnd=352 debería incluir la página 350
-- =====================================================

-- Buscar el chunk específico que incluye la página 350
-- pageStart <= 350 AND pageEnd >= 350
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_text,
  metadata->>'pageEnd' as pageEnd_text,
  metadata->>'material_id' as material_id,
  LEFT(content, 500) as content_preview,
  CASE WHEN embedding IS NULL THEN 'SIN' ELSE 'CON' END as embedding
FROM course_content_chunks
WHERE 
  metadata->>'pageStart' IS NOT NULL
  AND metadata->>'pageEnd' IS NOT NULL
  -- Buscar chunks que incluyen página 350
  -- pageStart <= 350 AND pageEnd >= 350
  AND (
    -- Caso 1: pageStart "349" y pageEnd "352" (incluye 350)
    (metadata->>'pageStart' = '349' AND metadata->>'pageEnd' >= '350')
    OR
    -- Caso 2: pageStart "350" exactamente
    (metadata->>'pageStart' = '350')
    OR
    -- Caso 3: pageStart < 350 y pageEnd >= 350 (números de 3 dígitos)
    (LENGTH(metadata->>'pageStart') = 3 
     AND metadata->>'pageStart' < '350' 
     AND metadata->>'pageEnd' >= '350'
     AND LENGTH(metadata->>'pageEnd') <= 4)
  )
ORDER BY metadata->>'pageStart'
LIMIT 5;
