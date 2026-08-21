-- =====================================================================
-- 🏛️ EduSpark AI Gateway - Configuración de Seguridad y API Keys
-- =====================================================================
-- Ejecutar en Supabase SQL Editor para crear la infraestructura de
-- claves de API institucionales con hashing SHA-256.

-- 1. Asegurar la extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Crear la tabla de API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INTEGER NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Ej: "Moodle Producción Medicina"
    key_prefix VARCHAR(12) NOT NULL DEFAULT 'edsp_live_', -- Prefijo legible
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 de la API Key completa
    scopes TEXT[] NOT NULL DEFAULT '{"tutor:chat"}', -- Scopes autorizados
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Índices para búsqueda ultra-rápida de hashes activos
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_lookup 
ON public.api_keys(key_hash) 
WHERE status = 'active';

-- Habilitar Row Level Security (RLS) en la tabla de API Keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para api_keys
-- El service_role (backend del gateway) puede leer todas las claves para validación
CREATE POLICY "service_role_all_access" 
ON public.api_keys 
FOR ALL 
TO service_role 
USING (true);

-- Los usuarios administradores de una institución sólo pueden ver y revocar las claves de su propia institución
CREATE POLICY "admin_manage_own_institution_keys" 
ON public.api_keys
FOR ALL
TO authenticated
USING (
  institution_id = ((auth.jwt() -> 'user_metadata' ->> 'institution_id')::integer)
  AND (auth.jwt() ->> 'role') = 'admin'
);

-- =====================================================================
-- 🛠️ FUNCIONES DE PROCEDIMIENTO ALMACENADO
-- =====================================================================

-- Función para generar de forma segura una nueva API Key y registrarla
CREATE OR REPLACE FUNCTION public.generate_api_key(
    p_institution_id INTEGER,
    p_name VARCHAR(255),
    p_scopes TEXT[] DEFAULT '{"tutor:chat"}',
    p_expiration_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
    raw_api_key TEXT,
    key_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_raw_key TEXT;
    v_key_prefix TEXT := 'edsp_live_';
    v_random_part TEXT;
    v_hash VARCHAR(64);
    v_new_id UUID;
    v_created_at TIMESTAMP WITH TIME ZONE;
    v_expires_at TIMESTAMP WITH TIME ZONE := NULL;
BEGIN
    -- Generar 32 bytes de datos aleatorios en formato hexadecimal
    v_random_part := encode(gen_random_bytes(24), 'hex');
    v_raw_key := v_key_prefix || v_random_part;
    
    -- Calcular el hash SHA-256 de la API Key cruda
    v_hash := encode(digest(v_raw_key, 'sha256'), 'hex');
    
    -- Calcular fecha de expiración si corresponde
    IF p_expiration_days IS NOT NULL THEN
        v_expires_at := now() + (p_expiration_days || ' days')::INTERVAL;
    END IF;
    
    -- Insertar el registro en la base de datos
    INSERT INTO public.api_keys (
        institution_id,
        name,
        key_prefix,
        key_hash,
        scopes,
        expires_at
    ) VALUES (
        p_institution_id,
        p_name,
        v_key_prefix,
        v_hash,
        p_scopes,
        v_expires_at
    )
    RETURNING id, api_keys.created_at INTO v_new_id, v_created_at;
    
    -- Retornar la clave cruda (solo se muestra esta vez)
    RETURN QUERY SELECT v_raw_key, v_new_id, v_created_at;
END;
$$;

-- Función para validar una API Key y actualizar su último uso
CREATE OR REPLACE FUNCTION public.validate_api_key(
    p_raw_key TEXT,
    p_required_scope TEXT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    institution_id INTEGER,
    scopes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hash VARCHAR(64);
    v_inst_id INTEGER;
    v_key_scopes TEXT[];
    v_key_id UUID;
BEGIN
    -- Calcular el hash SHA-256 de la clave recibida
    v_hash := encode(digest(p_raw_key, 'sha256'), 'hex');
    
    -- Buscar la clave activa
    SELECT id, api_keys.institution_id, api_keys.scopes
    INTO v_key_id, v_inst_id, v_key_scopes
    FROM public.api_keys
    WHERE key_hash = v_hash
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now());
      
    -- Si la clave existe y tiene el scope necesario
    IF v_key_id IS NOT NULL AND (p_required_scope = ANY(v_key_scopes)) THEN
        -- Registrar fecha de último uso
        UPDATE public.api_keys 
        SET last_used_at = now()
        WHERE id = v_key_id;
        
        RETURN QUERY SELECT true, v_inst_id, v_key_scopes;
    ELSE
        RETURN QUERY SELECT false, NULL::integer, NULL::text[];
    END IF;
END;
$$;

-- =====================================================================
-- 🛡️ POLÍTICA DE EJEMPLO DE RLS BASADA EN CONFIG LOCAL (Para Gateway)
-- =====================================================================
-- Nota: La variable 'app.current_institution_id' se establece 
-- mediante SET LOCAL en el backend del Gateway durante cada transacción.

-- Ejemplo de cómo aplicar esta lógica a la consulta semántica del tutor:
/*
CREATE POLICY "Gateway RLS - Course Chunks"
ON public.course_content_chunks
FOR SELECT
TO service_role
USING (
  institution_id = current_setting('app.current_institution_id', true)::integer
);
*/
