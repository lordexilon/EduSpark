-- 166_increase_bucket_size_limit.sql
-- Aumentar el límite de tamaño de archivo para el bucket 'course-documents'
-- El archivo actual es de ~106MB, así que aumentaremos el límite a 500MB

UPDATE storage.buckets
SET file_size_limit = 524288000 -- 500MB en bytes (500 * 1024 * 1024)
WHERE id = 'course-documents';

-- Verificar el cambio
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'course-documents';
