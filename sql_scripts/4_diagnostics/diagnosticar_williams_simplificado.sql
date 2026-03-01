-- DIAGNÓSTICO SIMPLIFICADO: Verificar Williams Ginecología

-- 1. Ver todas las tablas disponibles
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Ver archivos en el curso 12
SELECT
    ccc.metadata->>'sourceFileName' as archivo,
    COUNT(*) as chunks_totales
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
GROUP BY ccc.metadata->>'sourceFileName'
ORDER BY chunks_totales DESC;

-- 3. Ver si Williams existe en materials
SELECT
    m.id,
    m.title,
    m.file_name,
    m.file_path,
    m.created_at
FROM materials m
WHERE m.course_id = 12
  AND (m.title ILIKE '%williams%' OR m.file_name ILIKE '%williams%')
ORDER BY m.created_at DESC;

-- 4. Ver si Williams existe en course_materials
SELECT
    cm.id,
    cm.title,
    cm.file_name,
    cm.created_at
FROM course_materials cm
WHERE cm.course_id = 12
  AND (cm.title ILIKE '%williams%' OR cm.file_name ILIKE '%williams%')
ORDER BY cm.created_at DESC;

-- 5. Ver si Williams existe en system_files
SELECT
    sf.id,
    sf.original_name,
    sf.file_name,
    sf.file_path,
    sf.created_at
FROM system_files sf
WHERE sf.course_id = 12
  AND (sf.original_name ILIKE '%williams%' OR sf.file_name ILIKE '%williams%')
ORDER BY sf.created_at DESC;

-- 6. Contar chunks sin sourceFileName (posiblemente de Williams)
SELECT
    COUNT(*) as chunks_sin_archivo,
    MIN(created_at) as mas_antiguo,
    MAX(created_at) as mas_reciente
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12;

-- 7. Ver contenido de chunks recientes sin archivo (últimos 30 min)
SELECT
    id,
    LEFT(content, 300) as preview_contenido,
    created_at
FROM course_content_chunks
WHERE metadata->>'sourceFileName' IS NULL
  AND course_id = 12
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 2;