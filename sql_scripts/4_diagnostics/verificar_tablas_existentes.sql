-- VERIFICAR: ¿Qué tablas existen realmente en la base de datos?

-- Ver todas las tablas disponibles
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Ver si existen tablas relacionadas con archivos
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename ILIKE '%file%'
       OR tablename ILIKE '%process%'
       OR tablename ILIKE '%material%'
       OR tablename ILIKE '%chunk%')
ORDER BY tablename;

-- Verificar estructura de course_content_chunks
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'course_content_chunks'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si hay alguna tabla de logs o procesamiento
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename ILIKE '%log%'
       OR tablename ILIKE '%process%'
       OR tablename ILIKE '%job%'
       OR tablename ILIKE '%task%')
ORDER BY tablename;