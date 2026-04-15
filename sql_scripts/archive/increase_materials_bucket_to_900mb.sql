-- =====================================================
-- Aumentar límite del bucket materials a 900 MB
-- Para permitir archivos de hasta 900 MB
-- =====================================================

-- Convertir 900 MB a bytes: 900 * 1024 * 1024 = 943718400 bytes
UPDATE storage.buckets 
SET file_size_limit = 943718400  -- 900 MB
WHERE id = 'materials';

-- Verificar el cambio
SELECT 
    id,
    name,
    public,
    file_size_limit,
    ROUND(file_size_limit / 1024.0 / 1024.0, 2) as limit_mb,
    CASE 
        WHEN file_size_limit >= 943718400 THEN '✅ Límite correcto (900+ MB)'
        ELSE '⚠️ Límite menor a 900 MB'
    END as status
FROM storage.buckets 
WHERE id = 'materials';
