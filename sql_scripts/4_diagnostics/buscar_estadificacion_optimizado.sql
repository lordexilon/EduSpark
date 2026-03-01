-- 🔍 BUSCAR "estadificación" OPTIMIZADO (evitar timeout)

-- ESTRATEGIA: Buscar primero por material_id específico, luego filtrar por contenido

-- 1. Buscar "estadificación" en chunks de Williams (OPTIMIZADO: filtrar por material_id primero)
SELECT
    ccc.metadata->>'pageStart' as pagina,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 400) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
  AND ccc.content ILIKE '%estadificación%'
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 10;

-- 2. Si no encuentra nada, buscar variantes del término
SELECT
    ccc.metadata->>'pageStart' as pagina,
    LEFT(ccc.content, 400) as contenido_preview
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
  AND (ccc.content ILIKE '%estadificación%' 
       OR ccc.content ILIKE '%estadio%'
       OR ccc.content ILIKE '%estadificaci%')
ORDER BY CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)
LIMIT 10;