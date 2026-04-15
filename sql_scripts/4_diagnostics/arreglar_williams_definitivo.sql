-- ARREGLAR DEFINITIVAMENTE: Asignar Williams Ginecología a los chunks sin archivo

-- 1. ESTADO ACTUAL ANTES DEL ARREGLO
SELECT
    COUNT(*) as chunks_sin_archivo_total,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as chunks_sin_archivo_ultimo_dia
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- 2. ASIGNAR NOMBRE DE ARCHIVO A TODOS LOS CHUNKS SIN NOMBRE EN CURSO 12
-- (Asumiendo que todos los chunks sin archivo son de Williams Ginecología)
UPDATE course_content_chunks
SET metadata = jsonb_set(metadata, '{sourceFileName}', '"Williams Gineco.pdf"')
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- 3. VERIFICAR QUE SE ASIGNARON CORRECTAMENTE
SELECT
    COUNT(*) as chunks_con_williams_asignado
FROM course_content_chunks
WHERE metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND course_id = 12;

-- 4. VER LA LISTA COMPLETA DE ARCHIVOS DESPUÉS DEL ARREGLO
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 5. VERIFICAR QUE WILLIAMS TIENE CONTENIDO DE "ESTADIFICACIÓN"
SELECT
    COUNT(*) as chunks_con_estadificacion,
    COUNT(CASE WHEN content ILIKE '%cáncer%' AND content ILIKE '%mama%' THEN 1 END) as chunks_con_cancer_mama
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf';

-- 6. MOSTRAR EJEMPLOS DE CONTENIDO CON "ESTADIFICACIÓN"
SELECT
    ccc.id,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 800) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 5;

-- 7. CONFIRMAR QUE NO QUEDAN CHUNKS SIN ARCHIVO
SELECT
    COUNT(*) as chunks_sin_archivo_restantes
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;