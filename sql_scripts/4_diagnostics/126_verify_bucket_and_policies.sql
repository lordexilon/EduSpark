-- =====================================================
-- Verificar bucket "documents" y políticas RLS
-- =====================================================

-- 1. Verificar si el bucket "documents" existe
SELECT 
    'Bucket verification' as check_type,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'documents';

-- 2. Verificar políticas RLS para el bucket
SELECT 
    'RLS Policies' as check_type,
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
  AND (
    policyname LIKE '%documentos%'
    OR qual::text LIKE '%documents%'
    OR with_check::text LIKE '%documents%'
  )
ORDER BY cmd, policyname;

-- 3. Si el bucket NO existe, verás un resultado vacío en la primera consulta
-- Para crear el bucket, ve al dashboard de Supabase:
-- https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/storage/buckets
-- 
-- O ejecuta este comando desde la API REST (requiere Service Role Key):
-- POST https://mckfscukxcqwntpjagar.supabase.co/storage/v1/bucket
-- Headers: 
--   Authorization: Bearer [SERVICE_ROLE_KEY]
--   apikey: [SERVICE_ROLE_KEY]
--   Content-Type: application/json
-- Body:
-- {
--   "id": "documents",
--   "name": "documents",
--   "public": true,
--   "file_size_limit": 524288000,
--   "allowed_mime_types": ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
-- }

