-- =====================================================
-- BUSCAR: Contenido en página 370 del PDF (página impresa 349)
-- Williams Gineco.pdf - Estadificación del cáncer mamario
-- =====================================================

-- 1. Buscar chunks en página 370 del PDF (página impresa 349)
SELECT 
  c.id,
  c.metadata->>'pageStart' as pagina_inicio_pdf,
  c.metadata->>'pageEnd' as pagina_fin_pdf,
  c.metadata->>'material_id' as material_id,
  LEFT(c.content, 500) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    (c.metadata->>'pageStart' >= '365' AND c.metadata->>'pageStart' <= '375')
    OR (c.metadata->>'pageEnd' >= '365' AND c.metadata->>'pageEnd' <= '375')
    OR (CAST(c.metadata->>'pageStart' AS INTEGER) <= 370 AND CAST(c.metadata->>'pageEnd' AS INTEGER) >= 370)
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 20;

-- 2. Buscar específicamente "Estadificación del cáncer mamario" en la página 370
SELECT 
  c.id,
  c.metadata->>'pageStart' as pagina_inicio_pdf,
  c.metadata->>'pageEnd' as pagina_fin_pdf,
  LEFT(c.content, 600) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    c.content ILIKE '%Estadificaci%cáncer%mamario%'
    OR c.content ILIKE '%Estadificaci%cancer%mamario%'
    OR c.content ILIKE '%estadificaci%mamario%'
  )
  AND (
    (c.metadata->>'pageStart' >= '365' AND c.metadata->>'pageStart' <= '375')
    OR (c.metadata->>'pageEnd' >= '365' AND c.metadata->>'pageEnd' <= '375')
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 10;

-- 3. Verificar si hay contenido sobre "TNM", "estadio", "ganglios linfáticos" en la página 370
SELECT 
  c.metadata->>'pageStart' as pagina_inicio_pdf,
  c.metadata->>'pageEnd' as pagina_fin_pdf,
  LEFT(c.content, 400) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    c.content ILIKE '%TNM%'
    OR c.content ILIKE '%estadio%'
    OR c.content ILIKE '%ganglio%linfático%'
    OR c.content ILIKE '%sentinel%'
  )
  AND (
    (c.metadata->>'pageStart' >= '365' AND c.metadata->>'pageStart' <= '375')
    OR (c.metadata->>'pageEnd' >= '365' AND c.metadata->>'pageEnd' <= '375')
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 15;
