-- =====================================================
-- BUSCAR: Texto exacto "Estadificación del cáncer mamario"
-- En páginas 371-375 de Williams Gineco.pdf (sin búsqueda ILIKE)
-- Solo mostrar contenido para verificación manual
-- =====================================================

-- Mostrar todo el contenido de páginas 371-375 para verificar si el texto está ahí
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  c.content as contenido_completo
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND c.metadata->>'pageStart' >= '371'
  AND c.metadata->>'pageStart' <= '375'
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 5;
