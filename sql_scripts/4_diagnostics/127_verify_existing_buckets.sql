-- =====================================================
-- Verificar buckets existentes en Supabase Storage
-- =====================================================

-- Ver todos los buckets disponibles
SELECT 
    'Buckets existentes' as check_type,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
ORDER BY created_at DESC;

-- Verificar políticas RLS para storage.objects
SELECT 
    'Políticas Storage' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;

