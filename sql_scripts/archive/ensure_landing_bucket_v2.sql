-- ensure_landing_bucket_v2.sql
-- Configura el bucket 'landing-page-images' y sus políticas de seguridad
-- Versión corregida para evitar errores de permisos (ERROR: 42501)

-- 1. Crear el bucket de forma segura
-- Si falla, por favor crea el bucket "landing-page-images" manualmente en el Dashboard > Storage
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('landing-page-images', 'landing-page-images', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo crear el bucket automáticamente (posible error de permisos). Por favor verifique que el bucket "landing-page-images" exista y sea público.';
END $$;

-- 2. Eliminar políticas antiguas de forma segura
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can update landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can delete landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload landing images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can manage landing images" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Advertencia: No se pudieron eliminar algunas políticas antiguas. Si recibes errores de "policy already exists", elimínalas manualmente desde el Dashboard.';
END $$;

-- 3. Crear nuevas políticas

-- Política 1: Acceso PÚBLICO para VER imágenes
-- Esta política es fundamental para que la landing page funcione
CREATE POLICY "Public can view landing page images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-images');

-- Política 2: Usuarios AUTENTICADOS pueden SUBIR imágenes
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
    -- Admin campus (role_id 5)
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
