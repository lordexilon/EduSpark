-- PRUEBA FINAL: Verificar que Williams Ginecología está listo para búsquedas

-- 1. CONFIRMAR QUE WILLIAMS APARECE EN LA LISTA DE ARCHIVOS
SELECT
    '✅ Williams Gineco.pdf debe aparecer en esta lista' as verificacion,
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NOT NULL
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 2. VERIFICAR CONTENIDO ESPECÍFICO DE "ESTADIFICACIÓN DEL CÁNCER MAMARIO"
SELECT
    COUNT(*) as total_chunks_estadificacion,
    MIN(ccc.metadata->>'pageStart') as pagina_minima,
    MAX(ccc.metadata->>'pageStart') as pagina_maxima
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
  AND ccc.content ILIKE '%mama%';

-- 3. MOSTRAR CONTENIDO ESPECÍFICO PARA VERIFICAR
SELECT
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 1000) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 3;

-- 4. VERIFICAR QUE EL CONTENIDO ESTÁ EN LAS PÁGINAS CORRECTAS (349-370)
SELECT
    ccc.metadata->>'pageStart' as pagina_inicio,
    COUNT(*) as chunks_en_pagina
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) >= 340
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) <= 380
GROUP BY ccc.metadata->>'pageStart'
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER);

-- 5. ESTADÍSTICAS FINALES
SELECT
    '✅ Williams Ginecología listo para búsquedas' as estado_final,
    COUNT(*) as total_chunks_williams,
    COUNT(CASE WHEN content ILIKE '%estadificación%' THEN 1 END) as chunks_con_estadificacion,
    COUNT(CASE WHEN content ILIKE '%cáncer%' AND content ILIKE '%mama%' THEN 1 END) as chunks_con_cancer_mama
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf';