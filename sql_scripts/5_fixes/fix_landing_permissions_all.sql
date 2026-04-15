-- fix_landing_permissions_all.sql
-- Script UNIFICADO para corregir permisos de Landing Page (Tabla + Storage)
-- Incluye soporte para el rol 'supervisor'
-- Ejecutar en el Editor SQL de Supabase

-- ==============================================================================
-- PARTE 1: TABLA institution_landing_config
-- ==============================================================================

-- 1. Habilitar RLS
ALTER TABLE public.institution_landing_config ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas
DROP POLICY IF EXISTS "Public can view landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admins can manage landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can view all landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can insert landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can update all landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can delete landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin-campus can view own institution landing config" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin-campus can update own institution landing config" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Global Admins can manage all" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Campus Admins can manage own institution" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Campus Admins and Supervisors can manage own institution" ON public.institution_landing_config;

-- 3. Crear nuevas políticas (Incluyendo Supervisor)

-- Política 1: Acceso PÚBLICO para VER (SELECT)
CREATE POLICY "Public can view landing configs"
ON public.institution_landing_config
FOR SELECT
USING (true);

-- Política 2: Administradores Globales (admin, coordinator) pueden hacer TODO
CREATE POLICY "Global Admins can manage all"
ON public.institution_landing_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  )
);

-- Política 3: Admin Campus y Supervisores pueden gestionar SU institución
CREATE POLICY "Campus Admins and Supervisors can manage own institution"
ON public.institution_landing_config
FOR ALL
TO authenticated
USING (
  -- Verificar que el usuario sea admin-campus o supervisor
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin-campus', 'supervisor')
  )
  AND
  -- Verificar que la configuración pertenezca a una institución asignada al usuario
  institution_id IN (
    SELECT institution_id 
    FROM public.user_institutions 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin-campus', 'supervisor')
  )
  AND
  institution_id IN (
    SELECT institution_id 
    FROM public.user_institutions 
    WHERE user_id = auth.uid()
  )
);

-- ==============================================================================
-- PARTE 2: STORAGE (Bucket landing-page-images)
-- ==============================================================================

-- 1. Asegurar Bucket (Manejo de errores si ya existe o falta permisos)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('landing-page-images', 'landing-page-images', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo crear el bucket automáticamente. Verifique manualmente.';
END $$;

-- 2. Eliminar políticas antiguas de Storage
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can update landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can delete landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload landing images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can manage landing images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins and Supervisors can update landing page images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins and Supervisors can delete landing page images" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Advertencia al eliminar políticas de storage.';
END $$;

-- 3. Crear nuevas políticas de Storage (Incluyendo Supervisor)

-- Política 1: Acceso PÚBLICO para VER imágenes
CREATE POLICY "Public can view landing page images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-images');

-- Política 2: Usuarios AUTENTICADOS pueden SUBIR imágenes
CREATE POLICY "Authenticated users can upload landing page images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'landing-page-images');

-- Política 3: Admins, Admin-Campus y Supervisores pueden ACTUALIZAR sus imágenes
CREATE POLICY "Admins and Supervisors can update landing page images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'landing-page-images' 
  AND (
    -- Admin global / Coordinator
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
    )
    OR
    -- Admin campus / Supervisor (Solo sus propias imágenes por ruta)
    (
      EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON r.id = u.role_id
        WHERE u.id = auth.uid() AND r.name IN ('admin-campus', 'supervisor')
      )
      AND
      -- Verificar ruta: institution-{id}/...
      name LIKE 'institution-' || (
        SELECT institution_id::text 
        FROM public.user_institutions 
        WHERE user_id = auth.uid() 
        LIMIT 1
      ) || '/%'
    )
  )
);

-- Política 4: Admins, Admin-Campus y Supervisores pueden ELIMINAR sus imágenes
CREATE POLICY "Admins and Supervisors can delete landing page images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landing-page-images' 
  AND (
    -- Admin global / Coordinator
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
    )
    OR
    -- Admin campus / Supervisor
    (
      EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON r.id = u.role_id
        WHERE u.id = auth.uid() AND r.name IN ('admin-campus', 'supervisor')
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

-- Verificación final
SELECT * FROM public.institution_landing_config LIMIT 1;
