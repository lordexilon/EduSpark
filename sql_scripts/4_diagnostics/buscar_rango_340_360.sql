-- =====================================================
-- Buscar chunks específicamente en rango 340-360
-- Usa comparación de texto sin CAST
-- =====================================================

-- Buscar chunks donde pageStart esté en rango 340-360 (como texto)
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
  -- Buscar pageStart en rango 340-360 usando comparación de texto
  -- Funciona porque estamos comparando números de 3 dígitos
  AND metadata->>'pageStart' >= '3'
  AND metadata->>'pageStart' <= '360'
ORDER BY metadata->>'pageStart'
LIMIT 20;
