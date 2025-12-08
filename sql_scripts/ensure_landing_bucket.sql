-- ensure_landing_bucket.sql
-- Configura el bucket 'landing-page-images' y sus políticas de seguridad
-- Este script debe ejecutarse en el Editor SQL de Supabase

-- 1. Crear el bucket si no existe (requiere extensión pg_net o permisos de superusuario, 
--    si falla, crear manualmente en Storage > New Bucket > 'landing-page-images' > Public: YES)
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-page-images', 'landing-page-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Habilitar RLS en objetos de almacenamiento (por si acaso)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Public can view landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload landing images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage landing images" ON storage.objects;

-- 4. Crear nuevas políticas

-- Política 1: Acceso PÚBLICO para VER imágenes (necesario para la landing page)
CREATE POLICY "Public can view landing page images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-images');

-- Política 2: Usuarios AUTENTICADOS pueden SUBIR imágenes
-- Se permite a cualquier usuario autenticado subir, pero la aplicación controla
-- la ruta (institution-{id}/...)
CREATE POLICY "Authenticated users can upload landing page images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'landing-page-images');

-- Política 3: Administradores y Admin-Campus pueden ACTUALIZAR sus imágenes
CREATE POLICY "Admins can update landing page images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'landing-page-images' 
  AND (
    -- Admin global (role_id 3)
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role_id = 3
    )
    OR
    -- Admin campus (role_id 5) - Solo sus propias imágenes
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role_id = 5
      )
      AND
      -- Verificar que la ruta coincida con su institución
      -- Formato ruta: institution-{id}/...
      name LIKE 'institution-' || (
        SELECT institution_id::text 
        FROM public.user_institutions 
        WHERE user_id = auth.uid() 
        LIMIT 1
      ) || '/%'
    )
  )
);

-- Política 4: Administradores y Admin-Campus pueden ELIMINAR sus imágenes
CREATE POLICY "Admins can delete landing page images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landing-page-images' 
  AND (
    -- Admin global
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role_id = 3
    )
    OR
    -- Admin campus
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role_id = 5
      )
      AND
      name LIKE 'institution-' || (
        SELECT institution_id::text 
        FROM public.user_institutions 
        WHERE user_id = auth.uid() 
        LIMIT 1
      ) || '/%'
    )
  )
);

-- Verificación
SELECT * FROM storage.buckets WHERE id = 'landing-page-images';
