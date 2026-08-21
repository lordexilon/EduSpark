-- Migración: Sistema de Auditoría de Eventos Críticos (S4-T03)
-- Objetivo: Registrar acciones administrativas para cumplimiento y trazabilidad.

-- 1. Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'UPDATE_ROLE', 'PUBLISH_COURSE', 'ASSIGN_INSTITUTION'
    resource_type TEXT NOT NULL, -- e.g., 'user', 'course', 'assignment'
    resource_id TEXT, -- ID del objeto afectado (puede ser UUID o Integer en string)
    metadata JSONB DEFAULT '{}'::jsonb, -- Detalles del cambio (ej: { old_role: 1, new_role: 3 })
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columna actor_id (puede faltar si tabla fue creada sin ella en ejecuciones previas)
DO $$ BEGIN
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add columns to audit_logs: %', SQLERRM;
END $$;

-- 2. Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (Solo Admin y Supervisor pueden ver audit_logs)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE POLICY "Admins can view all audit logs" 
    ON public.audit_logs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.name IN ('admin', 'supervisor')
        )
    );
  END IF;
END $$;

-- Los usuarios del sistema (backend/service role) pueden insertar, pero la UI usa el cliente normal
CREATE POLICY "Logged users can insert their own actions"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = actor_id);

-- 4. Índices para rendimiento en búsquedas administrativas
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_id ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 5. Comentario de tabla
COMMENT ON TABLE public.audit_logs IS 'Registro persistente de acciones administrativas para trazabilidad horaria y auditoría SCA.';
