-- ✅ VERIFICACIÓN FINAL: Confirmar que la solución funcionó

-- 1. VERIFICAR QUE TODOS LOS CHUNKS TIENEN sourceFileName
SELECT
    COUNT(*) as total_chunks_williams,
    COUNT(CASE WHEN metadata->>'sourceFileName' = 'Williams Gineco.pdf' THEN 1 END) as chunks_con_sourceFileName_correcto,
    COUNT(CASE WHEN metadata->>'sourceFileName' IS NULL THEN 1 END) as chunks_sin_sourceFileName,
    COUNT(CASE WHEN metadata->>'sourceFileName' != 'Williams Gineco.pdf' THEN 1 END) as chunks_con_sourceFileName_incorrecto
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';

-- 2. VER LISTA DE ARCHIVOS (Williams debería aparecer ahora)
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' IS NOT NULL
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC
LIMIT 10;

-- 3. VERIFICAR QUE HAY CONTENIDO DE "ESTADIFICACIÓN"
SELECT
    COUNT(*) as chunks_con_estadificacion,
    MIN(ccc.metadata->>'pageStart') as pagina_minima,
    MAX(ccc.metadata->>'pageStart') as pagina_maxima
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
  AND ccc.content ILIKE '%mama%';

-- 4. MOSTRAR EJEMPLO DEL CONTENIDO ENCONTRADO
SELECT
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 800) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 3;