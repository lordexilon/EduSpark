-- DIAGNÓSTICO COMPLETO: ¿Por qué no se encuentra la estadificación del cáncer de mama?
-- Revisar exactamente qué hay en Williams Ginecología

-- 1. Verificar archivos disponibles en el curso 12
SELECT DISTINCT
    c.metadata->>'sourceFileName' as archivo,
    COUNT(*) as total_chunks
FROM course_content_chunks c
WHERE c.course_id = 12
  AND c.metadata->>'sourceFileName' IS NOT NULL
GROUP BY c.metadata->>'sourceFileName'
ORDER BY total_chunks DESC;

-- 2. Verificar si "Williams Gineco.pdf" existe y cuántos chunks tiene
SELECT
    'Williams Gineco.pdf chunks' as descripcion,
    COUNT(*) as cantidad
FROM course_content_chunks c
WHERE c.course_id = 12
  AND c.metadata->>'sourceFileName' ILIKE '%williams%gineco%';

-- 3. Mostrar contenido de algunos chunks de Williams Gineco.pdf para ver qué contienen
SELECT
    c.id,
    c.metadata->>'pageStart' as pagina,
    LEFT(c.content, 1000) as contenido_preview
FROM course_content_chunks c
WHERE c.course_id = 12
  AND c.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
ORDER BY CAST(COALESCE(c.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 10;

-- 4. Buscar específicamente términos relacionados con estadificación
SELECT
    c.id,
    c.metadata->>'pageStart' as pagina,
    POSITION(LOWER('estad') IN LOWER(c.content)) as posicion_estad,
    POSITION(LOWER('cancer') IN LOWER(c.content)) as posicion_cancer,
    POSITION(LOWER('mama') IN LOWER(c.content)) as posicion_mama,
    LEFT(c.content, 800) as contenido_preview
FROM course_content_chunks c
WHERE c.course_id = 12
  AND c.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
  AND (c.content ILIKE '%estad%' OR c.content ILIKE '%cancer%' OR c.content ILIKE '%mama%')
ORDER BY CAST(COALESCE(c.metadata->>'pageStart', '0') AS INTEGER);

-- 5. Verificar páginas alrededor de 349-370 (donde el usuario dice que está la info)
SELECT
    c.metadata->>'pageStart' as pagina_inicio,
    c.metadata->>'pageEnd' as pagina_fin,
    COUNT(*) as chunks_en_pagina,
    LEFT(MIN(c.content), 500) as primer_contenido
FROM course_content_chunks c
WHERE c.course_id = 12
  AND c.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
  AND CAST(COALESCE(c.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 340 AND 380
GROUP BY c.metadata->>'pageStart', c.metadata->>'pageEnd'
ORDER BY CAST(c.metadata->>'pageStart' AS INTEGER);

-- 6. Verificar si hay chunks con el texto exacto "Estadificación del cáncer mamario"
SELECT
    c.id,
    c.metadata->>'pageStart' as pagina,
    c.content as contenido_completo
FROM course_content_chunks c
WHERE c.course_id = 12
  AND c.content ILIKE '%estadificación del cáncer mamario%'
ORDER BY CAST(COALESCE(c.metadata->>'pageStart', '0') AS INTEGER);