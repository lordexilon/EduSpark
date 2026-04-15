-- =====================================================
-- Verificar y configurar bucket "course-documents" en Supabase Storage
-- =====================================================
-- Este script verifica el bucket existente y configura las políticas RLS
-- para almacenar documentos migrados desde Google Drive

-- Verificar si el bucket "course-documents" existe
SELECT 
    'Bucket verification' as check_type,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'course-documents';

-- Si el bucket "course-documents" no existe, créalo desde el dashboard de Supabase:
-- 1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/storage/buckets
-- 2. Haz clic en "New bucket"
-- 3. Nombre: course-documents
-- 4. Público: Sí (para URLs públicas)
-- 5. File size limit: 500 MB (o el que necesites)
-- 6. Allowed MIME types: application/pdf, image/*, etc.

-- Políticas RLS para el bucket "course-documents"
-- Estas políticas permiten a usuarios autenticados leer y escribir en el bucket

-- Política de lectura (SELECT) para course-documents
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer course-documents" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden leer course-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'course-documents');

-- Política de escritura (INSERT) para course-documents
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir course-documents" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir course-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-documents');

-- Política de actualización (UPDATE) para course-documents
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar course-documents" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden actualizar course-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-documents')
WITH CHECK (bucket_id = 'course-documents');

-- Política de eliminación (DELETE) para course-documents
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar course-documents" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden eliminar course-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-documents');

-- Verificar políticas creadas para course-documents
SELECT 
    'RLS Policies verification' as check_type,
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
    policyname LIKE '%course-documents%'
    OR qual::text LIKE '%course-documents%'
    OR with_check::text LIKE '%course-documents%'
  )
ORDER BY cmd, policyname;

