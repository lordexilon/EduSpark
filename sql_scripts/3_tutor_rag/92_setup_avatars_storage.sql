-- 92_setup_avatars_storage.sql
-- Configurar Supabase Storage para almacenar avatares de usuarios
-- Permite que todos los tipos de usuarios (student, teacher, admin) puedan subir sus fotos
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- IMPORTANTE: CREAR EL BUCKET MANUALMENTE
-- =====================================================
-- 
-- El bucket debe crearse desde el dashboard de Supabase:
-- 1. Ve a: Storage > Buckets
-- 2. Click en "New bucket"
-- 3. Nombre del bucket: avatars
-- 4. Marca la casilla "Public bucket" (IMPORTANTE: debe ser público)
-- 5. Click en "Create bucket"
-- 
-- Este script solo configura las políticas RLS para el bucket

-- =====================================================
-- POLÍTICAS RLS PARA EL BUCKET "avatars"
-- =====================================================

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Permitir lectura pública de avatares" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de avatares para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de avatares propios" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de avatares propios" ON storage.objects;

-- Política 1: Permitir lectura pública de avatares
-- Todos pueden ver los avatares (necesario para mostrar fotos de perfil)
CREATE POLICY "Permitir lectura pública de avatares"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Política 2: Permitir subida de avatares para TODOS los usuarios autenticados
-- Cualquier usuario autenticado (student, teacher, admin) puede subir su avatar
-- El archivo debe estar en una carpeta con su user_id
CREATE POLICY "Permitir subida de avatares para usuarios autenticados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  -- Verificar que el archivo esté en la carpeta del usuario autenticado
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 3: Permitir actualización de avatares propios
-- Los usuarios solo pueden actualizar sus propios avatares
CREATE POLICY "Permitir actualización de avatares propios"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 4: Permitir eliminación de avatares propios
-- Los usuarios solo pueden eliminar sus propios avatares
CREATE POLICY "Permitir eliminación de avatares propios"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin() -- Los admins también pueden eliminar cualquier avatar
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
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%avatares%');

-- Verificar que el bucket existe (si se creó manualmente)
-- Nota: Esta consulta puede fallar si el bucket no existe aún
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS para avatares configuradas correctamente.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 RECORDATORIO:';
  RAISE NOTICE '   - El bucket "avatars" debe crearse manualmente desde el dashboard';
  RAISE NOTICE '   - Debe ser un bucket público';
  RAISE NOTICE '   - Las políticas RLS ya están aplicadas';
  RAISE NOTICE '';
  RAISE NOTICE '📁 ESTRUCTURA DE ARCHIVOS:';
  RAISE NOTICE '   Los avatares se almacenarán en: avatars/{user_id}/{filename}';
  RAISE NOTICE '   URLs públicas: https://[proyecto].supabase.co/storage/v1/object/public/avatars/{user_id}/{filename}';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todos los usuarios autenticados (student, teacher, admin) pueden:';
  RAISE NOTICE '   - Subir sus propios avatares';
  RAISE NOTICE '   - Actualizar sus propios avatares';
  RAISE NOTICE '   - Eliminar sus propios avatares';
  RAISE NOTICE '   - Ver todos los avatares (público)';
END $$;

