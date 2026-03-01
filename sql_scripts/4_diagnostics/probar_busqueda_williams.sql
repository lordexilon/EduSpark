-- PROBAR: Verificar que la búsqueda de "Estadificación de cancer de mama" funciona

-- 1. Ver que Williams Ginecología aparece en la lista de archivos
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NOT NULL
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 2. Buscar directamente "Estadificación del cáncer mamario" en Williams Ginecología
SELECT
    ccc.id,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 800) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
  AND ccc.content ILIKE '%mama%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER);

-- 3. Buscar variaciones del término
SELECT
    ccc.id,
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 500) as preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND (ccc.content ILIKE '%estadificación%'
       OR ccc.content ILIKE '%estadio%'
       OR ccc.content ILIKE '%estadificación%')
  AND ccc.content ILIKE '%cáncer%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 10;

-- 4. Verificar que el contenido está en las páginas correctas (alrededor de 349-370)
SELECT
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    COUNT(*) as chunks_en_pagina,
    LEFT(MIN(ccc.content), 300) as primer_chunk_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) >= 340
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) <= 380
GROUP BY ccc.metadata->>'pageStart', ccc.metadata->>'pageEnd'
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER);

-- 5. Verificar que la búsqueda vectorial funcionará (simular embedding)
-- Esto es solo para verificar que hay contenido relevante
SELECT
    COUNT(*) as total_chunks_williams,
    COUNT(CASE WHEN content ILIKE '%cancer%' THEN 1 END) as chunks_con_cancer,
    COUNT(CASE WHEN content ILIKE '%mama%' THEN 1 END) as chunks_con_mama,
    COUNT(CASE WHEN content ILIKE '%estad%' THEN 1 END) as chunks_con_estad
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf';

-- 6. Confirmar que Williams es material prioritario para el curso 12
-- (Esto debería estar configurado en el código TypeScript)
SELECT
    'Williams Gineco.pdf debe ser material prioritario para búsquedas médicas' as nota,
    COUNT(*) as chunks_williams_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf';