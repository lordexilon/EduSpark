-- =====================================================
-- BUSCAR: Chunks de Williams Gineco.pdf en páginas 366-370
-- Verificar dónde están realmente indexados
-- =====================================================

-- Buscar chunks de Williams Gineco.pdf en cualquier página
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  COUNT(*) as cantidad_chunks
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    (c.metadata->>'pageStart' >= '360' AND c.metadata->>'pageStart' <= '380')
    OR (c.metadata->>'pageStart' >= '365' AND c.metadata->>'pageStart' <= '375')
  )
GROUP BY c.metadata->>'pageStart', c.metadata->>'pageEnd'
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 20;

-- Ver todos los chunks de Williams Gineco.pdf alrededor de diferentes rangos
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  LEFT(c.content, 300) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    c.metadata->>'pageStart' IN ('360', '361', '362', '363', '364', '365', '366', '367', '368', '369', '370', '371', '372', '373', '374', '375', '376', '377', '378', '379', '380')
    OR c.metadata->>'pageStart' LIKE '36%'
    OR c.metadata->>'pageStart' LIKE '37%'
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 30;
