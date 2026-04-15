-- SOLUCIÓN FINAL: Arreglar Williams Ginecología definitivamente

-- CONFIRMACIÓN: Williams Ginecología existe en processed_documents pero con total_chunks = 0
SELECT
    '✅ Williams registrado pero con 0 chunks reportados' as diagnostico,
    pd.title,
    pd.total_chunks,
    pd.processing_status,
    pd.created_at
FROM processed_documents pd
WHERE pd.title ILIKE '%Williams Gineco%'
ORDER BY pd.created_at DESC;

-- CONFIRMACIÓN: Hay 55,388 chunks sin sourceFileName que deben ser de Williams
SELECT
    COUNT(*) as chunks_sin_nombre_esperados_williams,
    MIN(created_at) as creacion_mas_antigua,
    MAX(created_at) as creacion_mas_reciente
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- SOLUCIÓN: Asignar "Williams Gineco.pdf" a todos los chunks sin nombre en curso 12
-- Estos chunks se crearon durante el procesamiento pero no se les asignó el nombre de archivo
UPDATE course_content_chunks
SET metadata = jsonb_set(metadata, '{sourceFileName}', '"Williams Gineco.pdf"')
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- VERIFICACIÓN: Williams ahora debe aparecer con ~55,000 chunks
SELECT
    '✅ VERIFICACIÓN: Williams Ginecología ahora debe tener chunks' as resultado,
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales,
    MIN(ccc.created_at) as primera_creacion,
    MAX(ccc.created_at) as ultima_creacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
GROUP BY ccc.metadata->>'sourceFileName';

-- VERIFICACIÓN: Buscar "estadificación del cáncer mamario" en Williams
SELECT
    '✅ VERIFICACIÓN: Contenido de estadificación encontrado' as resultado,
    COUNT(*) as chunks_con_estadificacion,
    COUNT(CASE WHEN content ILIKE '%cáncer%' AND content ILIKE '%mama%' THEN 1 END) as chunks_con_cancer_mama,
    MIN(ccc.metadata->>'pageStart') as pagina_minima,
    MAX(ccc.metadata->>'pageStart') as pagina_maxima
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%';

-- MOSTRAR EJEMPLO del contenido encontrado
SELECT
    '📖 EJEMPLO de contenido encontrado:' as info,
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 1000) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
  AND ccc.content ILIKE '%estadificación%'
  AND ccc.content ILIKE '%cáncer%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 3;

-- VERIFICACIÓN FINAL: Lista completa de archivos después del arreglo
SELECT
    '📋 LISTA FINAL de archivos en curso 12:' as info,
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;