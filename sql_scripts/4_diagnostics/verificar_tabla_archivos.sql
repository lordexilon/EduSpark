-- VERIFICAR: ¿Qué tabla contiene los archivos del sistema?

-- Ver tablas relacionadas con archivos
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename ILIKE '%file%'
       OR tablename ILIKE '%document%'
       OR tablename ILIKE '%material%')
ORDER BY tablename;

-- Ver estructura de processed_documents (parece ser la tabla correcta)
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'processed_documents'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver archivos procesados en el curso 12
SELECT
    pd.id,
    pd.file_name,
    pd.status,
    pd.created_at,
    pd.updated_at
FROM processed_documents pd
WHERE pd.file_name ILIKE '%williams%'
   OR pd.file_name ILIKE '%gineco%'
ORDER BY pd.created_at DESC;

-- Ver si hay alguna tabla con archivos del sistema
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT ILIKE '%backup%'
  AND tablename NOT ILIKE '%log%'
  AND tablename NOT ILIKE '%usage%'
  AND tablename NOT ILIKE '%progress%'
  AND tablename NOT ILIKE '%tracking%'
ORDER BY tablename;