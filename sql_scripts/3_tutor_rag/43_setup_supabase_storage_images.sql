-- 43_setup_supabase_storage_images.sql
-- Configurar Supabase Storage para almacenar imágenes de contenido educativo
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- CREAR BUCKET PARA IMÁGENES DE CURSOS
-- =====================================================

-- Nota: Los buckets se crean desde la interfaz de Supabase Storage
-- Este script documenta la configuración recomendada
-- 
-- Pasos manuales en Supabase Dashboard:
-- 1. Ve a Storage > Buckets
-- 2. Crea un nuevo bucket llamado "course-images"
-- 3. Configura como público (public: true)
-- 4. Configura políticas RLS (ver abajo)

-- =====================================================
-- POLÍTICAS RLS PARA EL BUCKET "course-images"
-- =====================================================

-- Estas políticas permiten:
-- - Lectura pública de imágenes (para que se muestren en el contenido)
-- - Subida/escritura solo para usuarios autenticados (teachers/admins)
-- - Eliminación solo para el propietario o admin

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Permitir lectura pública de imágenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de imágenes para teachers y admins" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de imágenes propias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de imágenes propias" ON storage.objects;

-- Política 1: Permitir lectura pública
CREATE POLICY "Permitir lectura pública de imágenes"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-images');

-- Política 2: Permitir subida para usuarios autenticados
CREATE POLICY "Permitir subida de imágenes para teachers y admins"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-images' AND
  auth.role() = 'authenticated' AND
  (
    public.is_admin() OR
    public.is_teacher()
  )
);

-- Política 3: Permitir actualización para el propietario
CREATE POLICY "Permitir actualización de imágenes propias"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-images' AND
  auth.role() = 'authenticated' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin()
  )
);

-- Política 4: Permitir eliminación para el propietario o admin
CREATE POLICY "Permitir eliminación de imágenes propias"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-images' AND
  auth.role() = 'authenticated' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin()
  )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar si las políticas existen
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (policyname LIKE '%course-images%' OR policyname LIKE '%imágenes%');

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '⚠️ IMPORTANTE: Este script solo crea las políticas RLS.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PASOS PARA CREAR EL BUCKET MANUALMENTE:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ve a: https://supabase.com/dashboard/project/[TU_PROYECTO]/storage/buckets';
  RAISE NOTICE '2. Click en "New bucket"';
  RAISE NOTICE '3. Nombre del bucket: course-images';
  RAISE NOTICE '4. Marca la casilla "Public bucket" (IMPORTANTE: debe ser público)';
  RAISE NOTICE '5. Click en "Create bucket"';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Las políticas RLS ya están aplicadas por este script.';
  RAISE NOTICE '';
  RAISE NOTICE '📁 ESTRUCTURA DE ARCHIVOS:';
  RAISE NOTICE '   Las imágenes se almacenarán en: course-images/course-content/';
  RAISE NOTICE '   URLs públicas: https://[proyecto].supabase.co/storage/v1/object/public/course-images/...';
  RAISE NOTICE '';
  RAISE NOTICE '💡 NOTA: Si no creas el bucket, las imágenes se guardarán como';
  RAISE NOTICE '   data URIs (base64) directamente en el HTML. Esto funciona perfectamente,';
  RAISE NOTICE '   pero puede aumentar el tamaño del contenido si hay muchas imágenes.';
END $$;

