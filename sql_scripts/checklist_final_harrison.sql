-- ✅ CHECKLIST FINAL - Optimización RAG Harrison
-- Fecha: 2025-12-07

-- COMPLETADO ✅
-- [✅] 1. Corregir búsqueda vectorial (array vs string) - ragService.ts línea 727
-- [✅] 2. Optimizar parámetros de búsqueda (result_limit, min_relevance)
-- [✅] 3. Implementar timeout protection (3 segundos)
-- [✅] 4. Crear función de priorización por título - fix_search_prioritization.sql
-- [✅] 5. Agregar páginas estimadas Harrison Tomo 1 (512 chunks)
-- [✅] 6. Agregar páginas estimadas Harrison Tomo 2 (503 chunks)

-- PENDIENTE ⚠️
-- [ ] 7. CRÍTICO: Ejecutar fix_sql_type_error.sql
--        Este script arregla el error de tipos SQL que bloquea la búsqueda de texto

-- VERIFICACIÓN FINAL
-- Ejecuta estas queries para confirmar que todo está listo:

-- 1. Verificar páginas de Harrison
SELECT 
    'Harrison Tomo 1' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as con_paginas,
    MIN((metadata->>'pageStart')::int) as primera_pag,
    MAX((metadata->>'pageEnd')::int) as ultima_pag
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
UNION ALL
SELECT 
    'Harrison Tomo 2' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as con_paginas,
    MIN((metadata->>'pageStart')::int) as primera_pag,
    MAX((metadata->>'pageEnd')::int) as ultima_pag
FROM course_content_chunks
WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04';

-- 2. Verificar embeddings
SELECT 
    'Harrison Tomo 1' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as con_embedding
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
UNION ALL
SELECT 
    'Harrison Tomo 2' as libro,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as con_embedding
FROM course_content_chunks
WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04';

-- RESULTADO ESPERADO:
-- ✅ Tomo 1: 512 chunks con páginas (1-2500)
-- ✅ Tomo 2: 503 chunks con páginas (1-2500)
-- ✅ Todos los chunks tienen embeddings

-- PRÓXIMO PASO:
-- Ejecutar: sql_scripts/fix_sql_type_error.sql
-- Luego probar en el chat: "¿Qué dice Harrison sobre hipertensión?"
