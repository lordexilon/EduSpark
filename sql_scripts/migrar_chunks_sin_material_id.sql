-- Script para migrar chunks sin material_id en metadata
-- Este script busca chunks que no tienen material_id en metadata y trata de asociarlos
-- con materiales basándose en el file_name

-- PASO 1: Verificar cuántos chunks tienen el problema
SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'material_id' IS NULL OR metadata->>'material_id' = '' THEN 1 END) as chunks_sin_material_id,
    COUNT(CASE WHEN metadata->>'material_id' IS NOT NULL AND metadata->>'material_id' != '' THEN 1 END) as chunks_con_material_id
FROM course_content_chunks;

-- PASO 2: Ver ejemplos de chunks sin material_id
SELECT 
    id,
    metadata->>'file_name' as file_name,
    metadata->>'material_id' as material_id,
    course_id,
    created_at
FROM course_content_chunks
WHERE metadata->>'material_id' IS NULL OR metadata->>'material_id' = ''
ORDER BY created_at DESC
LIMIT 20;

-- PASO 3: Intentar asociar chunks con materiales basándose en file_name
-- Primero, ver qué materiales tienen file_name similar
SELECT DISTINCT
    m.id as material_id,
    m.title as material_title,
    m.metadata->>'file_name' as material_file_name,
    COUNT(ccc.id) as chunks_count
FROM materials m
LEFT JOIN course_content_chunks ccc ON (
    ccc.metadata->>'file_name' = m.metadata->>'file_name'
    AND (ccc.metadata->>'material_id' IS NULL OR ccc.metadata->>'material_id' = '')
)
WHERE m.metadata->>'file_name' IS NOT NULL
GROUP BY m.id, m.title, m.metadata->>'file_name'
HAVING COUNT(ccc.id) > 0
ORDER BY chunks_count DESC;

-- PASO 4: Actualizar chunks sin material_id usando file_name para encontrar el material
-- ⚠️ EJECUTAR CON PRECAUCIÓN - Hace UPDATE en la base de datos
UPDATE course_content_chunks ccc
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{material_id}',
    to_jsonb(m.id::text)
)
FROM materials m
WHERE 
    (ccc.metadata->>'material_id' IS NULL OR ccc.metadata->>'material_id' = '')
    AND ccc.metadata->>'file_name' = m.metadata->>'file_name'
    AND m.metadata->>'file_name' IS NOT NULL
    AND ccc.course_id = m.course_id; -- Asegurar que pertenecen al mismo curso

-- PASO 5: Verificar resultados después de la migración
SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'material_id' IS NULL OR metadata->>'material_id' = '' THEN 1 END) as chunks_sin_material_id,
    COUNT(CASE WHEN metadata->>'material_id' IS NOT NULL AND metadata->>'material_id' != '' THEN 1 END) as chunks_con_material_id
FROM course_content_chunks;

-- PASO 6: Ver chunks que aún no tienen material_id (necesitan procesamiento manual)
SELECT 
    ccc.id,
    ccc.metadata->>'file_name' as file_name,
    ccc.course_id,
    ccc.created_at
FROM course_content_chunks ccc
WHERE ccc.metadata->>'material_id' IS NULL OR ccc.metadata->>'material_id' = ''
ORDER BY ccc.created_at DESC;

