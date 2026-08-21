-- =====================================================================
-- Migración: platform_config (Admin-Only Platform Mode Control)
-- Fecha: 2026-07-10
-- Propósito: Controla el modo de plataforma (EDUCATION / GENERAL)
--            Solo el usuario administrador puede leer/modificar.
-- =====================================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS public.platform_config (
  id              SERIAL PRIMARY KEY,
  key             TEXT NOT NULL UNIQUE,        -- Nombre del parámetro
  value           TEXT NOT NULL,               -- Valor del parámetro
  description     TEXT,                        -- Descripción legible
  allowed_values  TEXT[],                      -- Valores válidos (opcional)
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_by      UUID REFERENCES auth.users(id)
);

-- 2. Comentario de tabla
COMMENT ON TABLE public.platform_config IS
  'Configuración global de la plataforma. Solo accesible por el rol admin.';

-- 3. Insertar configuración inicial
INSERT INTO public.platform_config (key, value, description, allowed_values)
VALUES
  (
    'PLATFORM_MODE',
    'EDUCATION',
    'Modo activo de la plataforma. EDUCATION = EduSpark LMS. GENERAL = Plataforma de desarrollo general.',
    ARRAY['EDUCATION', 'GENERAL', 'DUAL']
  ),
  (
    'EDUCATION_FEATURES',
    'tutor,rag,analytics,compliance,lti',
    'Features habilitadas en modo EDUCATION (separadas por coma)',
    NULL
  ),
  (
    'GENERAL_FEATURES',
    'office_docs,filesystem,memory,sequential_thinking,code_assist',
    'Features habilitadas en modo GENERAL (separadas por coma)',
    NULL
  ),
  (
    'DUAL_FEATURES',
    'tutor,rag,office_docs,filesystem,memory,sequential_thinking,code_assist,analytics',
    'Features habilitadas en modo DUAL (todos los módulos activos)',
    NULL
  ),
  (
    'ADMIN_USER_EMAIL',
    '',  -- Rellenar con tu email de admin en Supabase
    'Email del usuario con permisos de administrador de plataforma',
    NULL
  )
ON CONFLICT (key) DO NOTHING;

-- 4. Habilitar RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- 5. Política: Solo el admin puede leer
CREATE POLICY "admin_select_platform_config"
  ON public.platform_config
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = (
      SELECT value FROM public.platform_config WHERE key = 'ADMIN_USER_EMAIL'
    )
    OR
    -- También permite leer a service_role (para Edge Functions)
    auth.role() = 'service_role'
  );

-- 6. Política: Solo el admin puede modificar
CREATE POLICY "admin_update_platform_config"
  ON public.platform_config
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = (
      SELECT value FROM public.platform_config WHERE key = 'ADMIN_USER_EMAIL'
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = (
      SELECT value FROM public.platform_config WHERE key = 'ADMIN_USER_EMAIL'
    )
  );

-- 7. Política: Solo service_role puede insertar (migraciones)
CREATE POLICY "service_insert_platform_config"
  ON public.platform_config
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 8. Negar todo lo demás a usuarios no-admin
CREATE POLICY "deny_non_admin"
  ON public.platform_config
  FOR ALL
  USING (FALSE);

-- 9. Función helper para leer el modo actual desde Edge Functions
CREATE OR REPLACE FUNCTION public.get_platform_mode()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT value FROM public.platform_config WHERE key = 'PLATFORM_MODE' LIMIT 1;
$$;

-- 10. Función helper para verificar si una feature está habilitada
CREATE OR REPLACE FUNCTION public.is_feature_enabled(feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_mode TEXT;
  features_key TEXT;
  features_list TEXT;
BEGIN
  SELECT value INTO current_mode FROM public.platform_config WHERE key = 'PLATFORM_MODE';
  features_key := current_mode || '_FEATURES';
  SELECT value INTO features_list FROM public.platform_config WHERE key = features_key;
  RETURN features_list ILIKE ('%' || feature_name || '%');
END;
$$;

-- =====================================================================
-- ⚠️  PASO POST-INSTALACIÓN (ejecutar manualmente):
-- =====================================================================
-- Actualiza el email del admin:
--
-- UPDATE public.platform_config
-- SET value = 'tu-email@dominio.com'  -- ← tu email de Supabase
-- WHERE key = 'ADMIN_USER_EMAIL';
--
-- =====================================================================

-- 2. Luego actualizar tu email de admin:
UPDATE public.platform_config
SET value = 'albertovillalba@gmail.com'
WHERE key = 'ADMIN_USER_EMAIL';