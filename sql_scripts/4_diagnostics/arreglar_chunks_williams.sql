-- ARREGLAR: Asignar nombre de archivo a chunks de Williams Ginecología

-- 1. PRIMERO: Verificar que hay chunks sin sourceFileName recientes
SELECT
    COUNT(*) as chunks_sin_archivo_recientes
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12
  AND created_at > NOW() - INTERVAL '2 hours';

-- 2. ASIGNAR NOMBRE DE ARCHIVO A CHUNKS SIN NOMBRE (asumiendo que son de Williams)
-- Solo ejecutar si hay chunks recientes sin nombre
UPDATE course_content_chunks
SET metadata = jsonb_set(metadata, '{sourceFileName}', '"Williams Gineco.pdf"')
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12
  AND created_at > NOW() - INTERVAL '2 hours';

-- 3. Verificar que se asignaron correctamente
SELECT
    COUNT(*) as chunks_con_williams_asignado
FROM course_content_chunks
WHERE metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND course_id = 12
  AND created_at > NOW() - INTERVAL '2 hours';

-- 4. Ver la lista actualizada de archivos
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 5. Verificar que Williams Ginecología tiene chunks con "estadificación"
SELECT
    COUNT(*) as chunks_estadificacion_williams
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%';

-- 6. Mostrar un ejemplo de contenido de Williams Ginecología
SELECT
    ccc.id,
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 500) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 3;