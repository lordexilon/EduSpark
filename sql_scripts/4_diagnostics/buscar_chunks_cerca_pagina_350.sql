-- =====================================================
-- Búsqueda de chunks cerca de página 350 (sin CAST)
-- Usa comparación de texto para números de 3 dígitos
-- =====================================================

-- Buscar chunks con pageStart que sea >= 300 (como texto)
-- Los números como texto se comparan correctamente si tienen la misma cantidad de dígitos
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_text,
  metadata->>'pageEnd' as pageEnd_text,
  metadata->>'material_id' as material_id,
  CASE WHEN embedding IS NULL THEN 'SIN' ELSE 'CON' END as embedding
FROM course_content_chunks
WHERE 
  metadata->>'pageStart' IS NOT NULL
  AND metadata->>'pageEnd' IS NOT NULL
  -- Buscar pageStart >= 300 (como texto, funciona para números de 3 dígitos)
  AND (
    LENGTH(metadata->>'pageStart') = 3 AND metadata->>'pageStart' >= '300'
    OR LENGTH(metadata->>'pageStart') > 3
  )
  AND metadata->>'pageStart' <= '400'
ORDER BY metadata->>'pageStart'
LIMIT 10;
