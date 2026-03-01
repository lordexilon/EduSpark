-- VERIFICAR: ¿Qué contenido tiene Williams Gineco.pdf para la búsqueda "estadio cancer mama"?

-- 1. Ver todos los chunks de Williams Gineco.pdf que contienen "cancer" o "mama"
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 800) as contenido_preview
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND (ccc.content ILIKE '%cancer%' OR ccc.content ILIKE '%cáncer%'
       OR ccc.content ILIKE '%mama%' OR ccc.content ILIKE '%mamario%')
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER)
LIMIT 10;

-- 2. Ver si hay chunks con "estadio" o "estadificación"
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 1000) as contenido_preview
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND (ccc.content ILIKE '%estadio%' OR ccc.content ILIKE '%estadificación%')
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER);

-- 3. Ver páginas alrededor de donde debería estar la información (340-380)
SELECT
    'Páginas con contenido en Williams Gineco.pdf' as descripcion,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    COUNT(*) as chunks_en_pagina
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 340 AND 380
GROUP BY ccc.metadata->>'pageStart', ccc.metadata->>'pageEnd'
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER);