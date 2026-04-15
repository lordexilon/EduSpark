-- =====================================================
-- VERIFICAR: Material ID de chunks en página 370
-- Solo verificar metadata, sin tocar contenido (muy rápido)
-- =====================================================

-- Verificar material_id de chunks cerca de página 370
SELECT 
  c.metadata->>'file_name' as archivo,
  c.metadata->>'material_id' as material_id,
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'pageStart' >= '365'
  AND c.metadata->>'pageStart' <= '375'
GROUP BY c.metadata->>'file_name', c.metadata->>'material_id', c.metadata->>'pageStart', c.metadata->>'pageEnd'
ORDER BY c.metadata->>'file_name', c.metadata->>'pageStart'
LIMIT 20;
