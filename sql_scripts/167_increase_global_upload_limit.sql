-- 167_increase_global_upload_limit.sql
-- Aumentar el límite global de tamaño de archivo para Supabase Storage
-- El archivo actual es de ~490MB, así que aumentaremos el límite a 1GB para estar seguros

-- 1. Actualizar configuración del bucket específico
UPDATE storage.buckets
SET file_size_limit = 1073741824 -- 1GB en bytes (1024 * 1024 * 1024)
WHERE id = 'course-documents';

-- 2. Asegurar que las políticas RLS no tengan restricciones ocultas
-- (Las políticas actuales en 165_fix_storage_policies.sql no tienen restricciones de tamaño,
-- pero es bueno verificar que no haya otras políticas interfiriendo)

-- Verificar configuración actual
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'course-documents';
