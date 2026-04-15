-- VERIFICAR: Índices disponibles para optimizar el UPDATE

-- 1. Ver índices en course_content_chunks
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'course_content_chunks'
  AND schemaname = 'public'
ORDER BY indexname;

-- 2. Ver si hay un índice en course_id
SELECT
    COUNT(*) as tiene_indice_course_id
FROM pg_indexes
WHERE tablename = 'course_content_chunks'
  AND schemaname = 'public'
  AND indexdef ILIKE '%course_id%';

-- 3. Crear índice GIN en metadata si no existe (para búsquedas JSONB)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_metadata_gin
ON course_content_chunks USING GIN (metadata);

-- 4. Crear índice compuesto course_id + metadata->>'material_id' si no existe
-- (Esto puede ayudar con el UPDATE)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_material
ON course_content_chunks(course_id, (metadata->>'material_id'))
WHERE metadata->>'material_id' IS NOT NULL;

-- 5. Verificar tamaño de la tabla
SELECT
    pg_size_pretty(pg_total_relation_size('course_content_chunks')) as tamanio_total,
    COUNT(*) as total_registros
FROM course_content_chunks;