-- 104_setup_flashcards_storage_policies.sql
-- Configurar políticas RLS para el bucket 'course-media' para permitir subida de imágenes de flashcards
-- Fecha: Enero 2025

-- =====================================================
-- IMPORTANTE: VERIFICAR QUE EL BUCKET EXISTA
-- =====================================================
-- 
-- El bucket 'course-media' debe existir en Supabase Storage.
-- Si no existe, créalo desde el dashboard:
-- 1. Ve a: Storage > Buckets
-- 2. Click en "New bucket"
-- 3. Nombre del bucket: course-media
-- 4. Marca la casilla "Public bucket" (IMPORTANTE: debe ser público)
-- 5. Click en "Create bucket"
-- 
-- Este script solo configura las políticas RLS para la carpeta flashcards/

-- =====================================================
-- POLÍTICAS RLS PARA FLASHCARDS EN BUCKET 'course-media'
-- =====================================================

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Permitir lectura pública de flashcards" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de imágenes de flashcards para docentes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de imágenes de flashcards" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de imágenes de flashcards" ON storage.objects;

-- Política 1: Permitir lectura pública de imágenes de flashcards
-- Todos pueden ver las imágenes de flashcards (necesario para que los estudiantes las vean)
CREATE POLICY "Permitir lectura pública de flashcards"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-media' AND
  (storage.foldername(name))[1] = 'flashcards'
);

-- Política 2: Permitir subida de imágenes de flashcards para docentes y admins
-- Los docentes pueden subir imágenes en la carpeta flashcards/{courseId}/
-- Verificamos que el usuario sea teacher o admin
CREATE POLICY "Permitir subida de imágenes de flashcards para docentes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-media' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'flashcards' AND
  (
    public.is_admin() OR
    public.is_teacher() OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[2]
      AND c.teacher_id = auth.uid()
    )
  )
);

-- Política 3: Permitir actualización de imágenes de flashcards
-- Los docentes pueden actualizar imágenes de flashcards de sus cursos
CREATE POLICY "Permitir actualización de imágenes de flashcards"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-media' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'flashcards' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[2]
      AND c.teacher_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'course-media' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'flashcards' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[2]
      AND c.teacher_id = auth.uid()
    )
  )
);

-- Política 4: Permitir eliminación de imágenes de flashcards
-- Los docentes pueden eliminar imágenes de flashcards de sus cursos
CREATE POLICY "Permitir eliminación de imágenes de flashcards"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-media' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'flashcards' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[2]
      AND c.teacher_id = auth.uid()
    )
  )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas existen
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
  AND policyname LIKE '%flashcard%'
ORDER BY policyname;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS para imágenes de flashcards configuradas correctamente.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RECORDATORIO:';
  RAISE NOTICE '   - El bucket "course-media" debe existir en Supabase Storage';
  RAISE NOTICE '   - Debe ser un bucket público';
  RAISE NOTICE '   - Las políticas RLS ya están aplicadas';
  RAISE NOTICE '';
  RAISE NOTICE '📁 ESTRUCTURA DE ARCHIVOS:';
  RAISE NOTICE '   Las imágenes se almacenarán en: course-media/flashcards/{courseId}/{filename}';
  RAISE NOTICE '   URLs públicas: https://[proyecto].supabase.co/storage/v1/object/public/course-media/flashcards/{courseId}/{filename}';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Permisos configurados:';
  RAISE NOTICE '   - Lectura: Pública (todos pueden ver las imágenes)';
  RAISE NOTICE '   - Subida: Docentes y admins (solo en sus cursos)';
  RAISE NOTICE '   - Actualización: Docentes y admins (solo en sus cursos)';
  RAISE NOTICE '   - Eliminación: Docentes y admins (solo en sus cursos)';
END $$;

