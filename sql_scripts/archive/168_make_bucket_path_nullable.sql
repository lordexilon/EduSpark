-- 168_make_bucket_path_nullable.sql
-- Hacer que bucket_path sea nullable para soportar procesamiento desde Google Drive

-- Modificar la columna bucket_path para permitir NULL
ALTER TABLE public.file_processing_jobs
ALTER COLUMN bucket_path DROP NOT NULL;

-- Verificar el cambio
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'file_processing_jobs'
AND column_name = 'bucket_path';
