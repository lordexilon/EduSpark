-- check_landing_data.sql
-- Diagnóstico de datos de configuración de landing page
-- Ejecutar en Editor SQL

SELECT 
    i.id as institution_id,
    i.name as institution_name,
    c.id as config_id,
    c.brand_name,
    c.gallery_title,
    c.gallery_description,
    c.gallery_images
FROM institutions i
LEFT JOIN institution_landing_config c ON i.id = c.institution_id;
