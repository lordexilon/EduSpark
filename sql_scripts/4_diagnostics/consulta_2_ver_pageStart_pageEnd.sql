-- =====================================================
-- CONSULTA 2: Ver muestra de chunks con metadata
-- Muestra pageStart y pageEnd como texto (sin conversiones)
-- =====================================================

SELECT 
  id,
  course_id,
  metadata->>'pageStart' as pageStart_text,
  metadata->>'pageEnd' as pageEnd_text,
  metadata->>'material_id' as material_id,
  CASE WHEN embedding IS NULL THEN 'SIN' ELSE 'CON' END as embedding
FROM course_content_chunks
WHERE metadata->>'pageStart' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
