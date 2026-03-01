-- Diagnóstico: ¿Por qué no aparecen instituciones en landing page?

-- 1. Verificar si hay instituciones activas
SELECT 
    id, 
    name, 
    is_active,
    logo_url,
    description
FROM institutions
WHERE is_active = true;

-- 2. Verificar políticas RLS en institutions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'institutions';

-- 3. Verificar si RLS está habilitado
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'institutions';

-- SOLUCIÓN: Crear política para acceso público a instituciones activas
-- Esto permite que la landing page (sin autenticación) vea las instituciones

-- Primero, eliminar política pública si existe
DROP POLICY IF EXISTS "institutions_public_active" ON institutions;

-- Crear nueva política: acceso público SOLO a instituciones activas
CREATE POLICY "institutions_public_active"
ON institutions
FOR SELECT
TO anon  -- Rol para usuarios no autenticados
USING (is_active = true);

-- También permitir a usuarios autenticados ver instituciones activas
DROP POLICY IF EXISTS "institutions_authenticated_active" ON institutions;

CREATE POLICY "institutions_authenticated_active"
ON institutions
FOR SELECT
TO authenticated
USING (
    -- Admin ve todas
    is_admin()
    OR
    -- Otros usuarios ven las activas
    is_active = true
);

-- Verificar que las políticas se crearon correctamente
SELECT 
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'institutions';

-- TEST: Simular consulta pública (como landing page)
SET ROLE anon;
SELECT id, name, is_active FROM institutions;
RESET ROLE;
