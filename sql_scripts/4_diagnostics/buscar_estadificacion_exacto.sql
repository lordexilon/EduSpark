-- BUSCAR: Texto exacto "Estadificación del cáncer mamario" en todos los chunks

-- 1. Buscar el texto exacto en TODOS los chunks
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 500) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.content ILIKE '%estadificación del cáncer mamario%'
ORDER BY ccc.metadata->>'sourceFileName', CAST(ccc.metadata->>'pageStart' AS INTEGER);

-- 2. Buscar variaciones del texto
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 300) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
  AND ccc.content ILIKE '%mamario%'
ORDER BY ccc.metadata->>'sourceFileName', CAST(ccc.metadata->>'pageStart' AS INTEGER);

-- 3. Buscar en Williams Gineco.pdf específicamente
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 1000) as contenido_preview
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER);