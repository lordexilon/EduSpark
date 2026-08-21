-- 1. Crear la tabla (copiar el contenido del archivo SQL)
-- Archivo: sql_scripts/6_platform/201_platform_config_admin_only.sql

-- 2. Luego actualizar tu email de admin:
UPDATE public.platform_config
SET value = 'albertovillalba@gmail.com'
WHERE key = 'ADMIN_USER_EMAIL';