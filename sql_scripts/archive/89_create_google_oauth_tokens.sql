-- 89_create_google_oauth_tokens.sql
-- Tabla para almacenar tokens de Google OAuth de los usuarios

CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at timestamptz,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Un usuario solo puede tener un token por tipo de servicio
  UNIQUE(user_id)
);

-- Índice para búsqueda rápida por usuario
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON public.user_google_tokens(user_id);

-- Índice para tokens expirados (para limpieza)
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_expires_at ON public.user_google_tokens(expires_at);

-- Comentarios
COMMENT ON TABLE public.user_google_tokens IS 'Almacena tokens de acceso OAuth de Google para usuarios';
COMMENT ON COLUMN public.user_google_tokens.access_token IS 'Token de acceso de OAuth (debe estar encriptado en producción)';
COMMENT ON COLUMN public.user_google_tokens.refresh_token IS 'Token de renovación para obtener nuevos access tokens';
COMMENT ON COLUMN public.user_google_tokens.expires_at IS 'Fecha de expiración del access token';
COMMENT ON COLUMN public.user_google_tokens.scope IS 'Permisos otorgados por el usuario';

-- Habilitar RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden leer/escribir sus propios tokens
CREATE POLICY "users_manage_own_tokens" ON public.user_google_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los administradores pueden leer todos los tokens (para debugging/soporte)
CREATE POLICY "admins_read_all_tokens" ON public.user_google_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_google_tokens_updated_at_trigger
  BEFORE UPDATE ON public.user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_google_tokens_updated_at();
