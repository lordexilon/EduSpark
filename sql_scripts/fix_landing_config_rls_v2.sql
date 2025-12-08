-- fix_landing_config_rls_v2.sql
-- Corregir y asegurar permisos para la tabla institution_landing_config
-- Ejecutar en el Editor SQL de Supabase

-- 1. Habilitar RLS
ALTER TABLE public.institution_landing_config ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Public can view landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admins can manage landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can view all landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can insert landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can update all landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin can delete landing configs" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin-campus can view own institution landing config" ON public.institution_landing_config;
DROP POLICY IF EXISTS "Admin-campus can update own institution landing config" ON public.institution_landing_config;

-- 3. Crear nuevas políticas simplificadas y robustas

-- Política 1: Acceso PÚBLICO para VER (SELECT)
-- Cualquiera puede ver la configuración de la landing page
CREATE POLICY "Public can view landing configs"
ON public.institution_landing_config
FOR SELECT
USING (true);

-- Política 2: Administradores Globales (role_id = 3) pueden hacer TODO
CREATE POLICY "Global Admins can manage all"
ON public.institution_landing_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role_id = 3
  )
);

-- Política 3: Admin Campus (role_id = 5) puede gestionar SU institución
-- Permite SELECT, INSERT, UPDATE (no DELETE por seguridad, aunque podría agregarse)
CREATE POLICY "Campus Admins can manage own institution"
ON public.institution_landing_config
FOR ALL
TO authenticated
USING (
  -- Verificar que el usuario sea admin-campus (role_id 5)
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role_id = 5
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
  -- Misma condición para INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role_id = 5
  )
  AND
  institution_id IN (
    SELECT institution_id 
    FROM public.user_institutions 
    WHERE user_id = auth.uid()
  )
);

-- Verificación
SELECT * FROM public.institution_landing_config LIMIT 1;
