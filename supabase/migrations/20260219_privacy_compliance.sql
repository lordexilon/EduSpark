-- Migración para cumplimiento de Ley No. 7593/2025 (Protección de Datos Personales)
-- Fecha: 2026-02-16

-- 1. Agregar campos de consentimiento y privacidad a la tabla de usuarios (public.users)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT,
    ADD COLUMN IF NOT EXISTS deleted_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_scheduled_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Crear tabla de auditoría para acceso a datos sensibles (si no existe)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id), -- Quién realizó la acción
    action TEXT NOT NULL, -- "VIEW_PROFILE", "EXPORT_DATA", "DELETE_REQUEST"
    resource_type TEXT NOT NULL, -- "user", "course", "report"
    resource_id TEXT, -- ID del recurso afectado
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE POLICY "Admins can view audit logs" ON public.audit_logs
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
            )
        );
  END IF;
END $$;

-- Insertar logs está permitido para funciones autenticadas (o via triggers/functions)
CREATE POLICY "System can insert logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Índice para búsquedas rápidas en logs
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
