-- ARREGLAR: Asignar nombre de archivo correcto a chunks de Williams Ginecología

-- 1. PRIMERO: Verificar estado actual
SELECT
    COUNT(*) as chunks_sin_archivo,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 hours' THEN 1 END) as chunks_recientes_sin_archivo
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- 2. ASIGNAR NOMBRE DE ARCHIVO A CHUNKS SIN NOMBRE (asumiendo que son de Williams)
-- Solo asignar a chunks recientes (últimas 2 horas) para evitar afectar otros archivos
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
  AND course_id = 12;

-- 4. Ver la lista actualizada de archivos
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 5. Verificar que Williams Ginecología tiene chunks con "estadificación"
SELECT
    COUNT(*) as chunks_estadificacion_williams,
    MIN(ccc.metadata->>'pageStart') as pagina_minima,
    MAX(ccc.metadata->>'pageStart') as pagina_maxima
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%';

-- 6. Mostrar ejemplos de contenido de Williams Ginecología con "estadificación"
SELECT
    ccc.id,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 600) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 5;

-- 7. Verificar que no hay chunks duplicados o con asignación incorrecta
SELECT
    COUNT(*) as chunks_sin_archivo_restantes
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;