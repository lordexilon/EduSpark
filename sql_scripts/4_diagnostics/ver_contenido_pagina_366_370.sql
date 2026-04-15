-- =====================================================
-- VER: Contenido de chunks en páginas 366-370
-- Solo mostrar contenido, sin buscar texto (muy rápido)
-- =====================================================

-- Ver contenido de chunks en página 366-370 (sin buscar texto)
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  LEFT(c.content, 500) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND c.metadata->>'pageStart' >= '366'
  AND c.metadata->>'pageStart' <= '370'
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 5;
