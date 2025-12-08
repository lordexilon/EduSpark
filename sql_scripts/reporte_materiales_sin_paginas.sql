-- REPORTE: Materiales que necesitan reprocesamiento para obtener metadata de páginas
-- Este script identifica materiales cuyos chunks NO tienen información de páginas

-- 1. RESUMEN GENERAL por curso
SELECT 
    m.course_id,
    c.title as curso,
    COUNT(DISTINCT m.id) as total_materiales,
    COUNT(DISTINCT CASE 
        WHEN EXISTS (
            SELECT 1 FROM course_content_chunks ccc 
            WHERE ccc.metadata->>'material_id' = m.id::text 
            AND (ccc.metadata->>'pageStart' IS NULL OR ccc.metadata->>'pageEnd' IS NULL)
        ) THEN m.id 
    END) as materiales_sin_paginas,
    COUNT(DISTINCT CASE 
        WHEN EXISTS (
            SELECT 1 FROM course_content_chunks ccc 
            WHERE ccc.metadata->>'material_id' = m.id::text 
            AND ccc.metadata->>'pageStart' IS NOT NULL
        ) THEN m.id 
    END) as materiales_con_paginas
FROM materials m
LEFT JOIN courses c ON c.id = m.course_id
WHERE m.course_id IS NOT NULL
GROUP BY m.course_id, c.title
ORDER BY materiales_sin_paginas DESC;

-- 2. LISTADO DETALLADO de materiales SIN metadata de páginas
SELECT 
    m.id,
    m.title as material,
    c.title as curso,
    m.course_id,
    COUNT(ccc.id) as total_chunks,
    COUNT(CASE WHEN ccc.metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_pagina,
    COUNT(CASE WHEN ccc.metadata->>'pageStart' IS NULL THEN 1 END) as chunks_sin_pagina,
    m.created_at as fecha_subida
FROM materials m
LEFT JOIN courses c ON c.id = m.course_id
LEFT JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.course_id IS NOT NULL
GROUP BY m.id, m.title, c.title, m.course_id, m.created_at
HAVING COUNT(CASE WHEN ccc.metadata->>'pageStart' IS NULL THEN 1 END) > 0
   AND COUNT(ccc.id) > 0  -- Solo materiales que ya tienen chunks procesados
ORDER BY m.course_id, m.title;

-- 3. DETALLE ESPECÍFICO para el curso CONAREM (course_id = 12)
SELECT 
    m.id,
    m.title,
    COUNT(ccc.id) as total_chunks,
    ROUND(
        COUNT(CASE WHEN ccc.metadata->>'pageStart' IS NULL THEN 1 END)::numeric / 
        NULLIF(COUNT(ccc.id), 0) * 100, 
        2
    ) as porcentaje_sin_pagina,
    MIN(ccc.created_at) as primer_chunk_procesado,
    MAX(ccc.created_at) as ultimo_chunk_procesado
FROM materials m
LEFT JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.course_id = 12
  AND EXISTS (SELECT 1 FROM course_content_chunks WHERE metadata->>'material_id' = m.id::text)
GROUP BY m.id, m.title
HAVING COUNT(CASE WHEN ccc.metadata->>'pageStart' IS NULL THEN 1 END) > 0
ORDER BY total_chunks DESC;

-- 4. VERIFICACIÓN: Ejemplo de chunks SIN metadata de páginas (primeros 5)
SELECT 
    m.title as material,
    ccc.id as chunk_id,
    left(ccc.content, 100) as preview,
    ccc.metadata->>'pageStart' as page_start,
    ccc.metadata->>'pageEnd' as page_end,
    ccc.metadata->>'material_id' as material_id,
    ccc.created_at
FROM course_content_chunks ccc
JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE m.course_id = 12
  AND (ccc.metadata->>'pageStart' IS NULL OR ccc.metadata->>'pageEnd' IS NULL)
ORDER BY m.title, ccc.created_at
LIMIT 5;
