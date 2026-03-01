-- =====================================================
-- BUSCAR: Texto exacto "Estadificación del cáncer mamario"
-- Verificar si el texto está realmente en los chunks
-- VERSIÓN OPTIMIZADA (con límites y filtros estrictos)
-- =====================================================

-- 1. Buscar el texto exacto "Estadificación del cáncer mamario" en Williams Gineco.pdf
-- OPTIMIZADO: Limitar primero por archivo y rango de páginas, luego buscar texto
SELECT 
  c.id,
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  LEFT(c.content, 600) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (c.metadata->>'pageStart' >= '365' AND c.metadata->>'pageStart' <= '375')
  AND c.content ILIKE '%estadificaci%mamario%'
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 10;

-- 2. Verificar chunks mezclados - Comparar material_id de chunks cerca de página 370
-- OPTIMIZADO: Solo verificar material_id, no buscar en contenido
SELECT 
  c.metadata->>'file_name' as archivo,
  c.metadata->>'material_id' as material_id,
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  COUNT(*) OVER (PARTITION BY c.metadata->>'material_id') as chunks_mismo_material
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND (c.metadata->>'pageStart' >= '365' AND c.metadata->>'pageStart' <= '375')
GROUP BY c.metadata->>'file_name', c.metadata->>'material_id', c.metadata->>'pageStart', c.metadata->>'pageEnd'
ORDER BY c.metadata->>'file_name', CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 15;

-- 3. Ver contenido de chunks en página 366-370 (sin buscar texto, solo mostrar)
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  LEFT(c.content, 400) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND c.metadata->>'pageStart' >= '366'
  AND c.metadata->>'pageStart' <= '370'
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 5;
