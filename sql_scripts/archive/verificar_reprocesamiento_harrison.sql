-- Verificar que Harrison ahora tiene metadata de páginas después del reprocesamiento

-- 1. Verificar chunks de Harrison Tomo 1
SELECT 
    'Harrison Tomo 1' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_paginas,
    COUNT(CASE WHEN metadata->>'pageStart' IS NULL THEN 1 END) as chunks_sin_paginas,
    MIN((metadata->>'pageStart')::int) as primera_pagina,
    MAX((metadata->>'pageEnd')::int) as ultima_pagina
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332';

-- 2. Verificar chunks de Harrison Tomo 2
SELECT 
    'Harrison Tomo 2' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_paginas,
    COUNT(CASE WHEN metadata->>'pageStart' IS NULL THEN 1 END) as chunks_sin_paginas,
    MIN((metadata->>'pageStart')::int) as primera_pagina,
    MAX((metadata->>'pageEnd')::int) as ultima_pagina
FROM course_content_chunks
WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04';

-- 3. Ver ejemplos de chunks con páginas
SELECT 
    left(content, 100) as preview,
    metadata->>'pageStart' as pagina_inicio,
    metadata->>'pageEnd' as pagina_fin,
    (embedding IS NOT NULL) as tiene_embedding
FROM course_content_chunks
WHERE metadata->>'material_id' IN (
    '6a695969-78c1-42ea-af24-f6f2e2f88332',
    '79882510-d16f-447b-802a-1f73cdce1c04'
)
AND metadata->>'pageStart' IS NOT NULL
ORDER BY (metadata->>'pageStart')::int
LIMIT 5;
