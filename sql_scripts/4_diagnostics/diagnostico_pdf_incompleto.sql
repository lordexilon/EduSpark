-- 🔍 DIAGNÓSTICO: ¿Por qué el PDF tiene solo 287 páginas?

-- PROBLEMA IDENTIFICADO:
-- - El job "split" detectó solo 287 páginas
-- - Williams Ginecología debería tener ~995 páginas
-- - Esto sugiere que se procesó un PDF incompleto o diferente

-- 1. Verificar si hay múltiples materiales de Williams
SELECT
    m.id,
    m.title,
    m.course_id,
    m.rag_status,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND m.title ILIKE '%williams%gineco%'
ORDER BY m.created_at DESC;

-- 2. Verificar cuántos chunks hay por material_id
SELECT
    ccc.metadata->>'material_id' as material_id,
    COUNT(*) as total_chunks,
    MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_min,
    MAX(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_max
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
GROUP BY ccc.metadata->>'material_id';

-- 3. Verificar si hay otros archivos de Williams procesados
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks,
    MIN(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_min,
    MAX(CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER)) as pagina_max
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND (ccc.metadata->>'sourceFileName' ILIKE '%williams%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%gineco%')
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks DESC;

-- 4. CONCLUSIÓN:
-- Si el PDF tiene solo 287 páginas, entonces:
-- - O se procesó un PDF incompleto/diferente
-- - O el PDF realmente tiene 287 páginas (pero esto es poco probable para Williams Ginecología)
-- - SOLUCIÓN: Reprocesar el PDF completo desde /teacher/file-processing