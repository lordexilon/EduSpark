-- =====================================================
-- BUSCAR: "estadificación del cáncer mamario" en Williams Gineco.pdf
-- Verificar si el contenido existe en el archivo procesado
-- =====================================================

-- 1. Buscar "estadificación del cáncer mamario" en Williams Gineco.pdf
SELECT 
  c.id,
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  c.metadata->>'material_id' as material_id,
  LEFT(c.content, 400) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    c.content ILIKE '%estadificaci%cáncer%mamario%'
    OR c.content ILIKE '%estadificaci%cancer%mamario%'
    OR c.content ILIKE '%estadificaci%mama%'
    OR c.content ILIKE '%estadificaci%tumor%mama%'
    OR c.content ILIKE '%staging%breast%cancer%'
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 20;

-- 2. Ver rangos de páginas disponibles en Williams Gineco.pdf alrededor de página 350
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  COUNT(*) as cantidad_chunks
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    (c.metadata->>'pageStart' >= '340' AND c.metadata->>'pageStart' <= '360')
    OR (c.metadata->>'pageEnd' >= '340' AND c.metadata->>'pageEnd' <= '360')
    OR (CAST(c.metadata->>'pageStart' AS INTEGER) <= 350 AND CAST(c.metadata->>'pageEnd' AS INTEGER) >= 350)
  )
GROUP BY c.metadata->>'pageStart', c.metadata->>'pageEnd'
ORDER BY c.metadata->>'pageStart'
LIMIT 20;

-- 3. Ver contenido de Williams Gineco.pdf alrededor de página 350
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  LEFT(c.content, 300) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    (c.metadata->>'pageStart' >= '340' AND c.metadata->>'pageStart' <= '360')
    OR (c.metadata->>'pageEnd' >= '340' AND c.metadata->>'pageEnd' <= '360')
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 15;

-- 4. Buscar cualquier mención de "mamario", "cáncer de mama", etc. en Williams Gineco.pdf
SELECT 
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  LEFT(c.content, 300) as contenido_preview
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    c.content ILIKE '%mamario%'
    OR c.content ILIKE '%cáncer%mama%'
    OR c.content ILIKE '%cancer%mama%'
    OR c.content ILIKE '%tumor%mama%'
    OR c.content ILIKE '%breast%cancer%'
  )
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 20;
