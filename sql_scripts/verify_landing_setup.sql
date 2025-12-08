-- verify_landing_setup.sql
-- Script completo de verificación de estado de Landing Page
-- Ejecutar en Editor SQL de Supabase

-- 1. Verificar Instituciones y sus Configs
SELECT 
    i.id as inst_id,
    i.name as inst_name,
    c.id as config_id,
    c.brand_name,
    c.gallery_title,
    jsonb_array_length(c.gallery_images) as img_count
FROM institutions i
LEFT JOIN institution_landing_config c ON i.id = c.institution_id;

-- 2. Verificar Usuario Actual y su Institución (Simulado para el usuario que ejecuta)
-- Nota: auth.uid() funciona en el contexto de la sesión, aquí mostramos todos los usuarios admin/admin-campus
SELECT 
    u.email,
    r.name as role,
    ui.institution_id,
    i.name as institution_name
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN user_institutions ui ON u.id = ui.user_id
LEFT JOIN institutions i ON ui.institution_id = i.id
WHERE r.name IN ('admin', 'admin-campus', 'supervisor');

-- 3. Verificar Permisos de Tabla (RLS)
SELECT * FROM pg_policies WHERE tablename = 'institution_landing_config';

-- 4. Verificar Bucket
SELECT id, name, public, created_at FROM storage.buckets WHERE id = 'landing-page-images';
