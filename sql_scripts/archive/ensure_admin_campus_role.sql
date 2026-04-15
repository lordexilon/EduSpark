-- sql_scripts/ensure_admin_campus_role.sql
-- Script para asegurar que el rol admin-campus existe
-- Ejecutar en el SQL Editor de Supabase

-- Insertar rol admin-campus si no existe
INSERT INTO public.roles (name, description)
VALUES ('admin-campus', 'Administrador de campus/institución')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;

-- Verificar que el rol existe
SELECT id, name, description 
FROM public.roles 
WHERE name = 'admin-campus';

-- Mostrar todos los roles para referencia
SELECT id, name, description 
FROM public.roles 
ORDER BY id;

