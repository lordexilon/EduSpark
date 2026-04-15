-- Insert initial landing page configuration for Centro de Estudio Cavavelos
-- Based on the hardcoded data from InstitutionLandingPage.tsx

INSERT INTO institution_landing_config (
    institution_id,
    brand_name,
    logo_url,
    hero_title,
    hero_subtitle,
    hero_image_url,
    hero_button_text,
    philosophy_title,
    philosophy_content,
    notification_text,
    notification_enabled,
    primary_color,
    secondary_color,
    gallery_images,
    featured_students,
    contact_email,
    contact_phone,
    contact_whatsapp,
    contact_address,
    calendar_embed_url
) VALUES (
    2, -- institution_id for Centro de Estudio Cavavelos
    'Centro de Estudio Cavavelos',
    'https://mckfscukxcqwntpjagar.supabase.co/storage/v1/object/public/course-media/institutions/institution-2-1763567459694.webp',
    'Educación a Distancia de Calidad',
    'Formación profesional flexible y accesible para todos',
    NULL, -- hero_image_url (can be added later)
    'Inscríbete Ahora',
    'Nuestra Filosofía',
    'En el Centro de Estudio Cavavelos, creemos que la educación a distancia es una herramienta poderosa que complementa y enriquece la formación presencial. Nuestro enfoque se centra en brindar flexibilidad sin comprometer la calidad educativa, permitiendo que cada estudiante avance a su propio ritmo mientras mantiene un alto nivel de excelencia académica.',
    NULL, -- notification_text
    false, -- notification_enabled
    '#2563eb', -- primary_color (blue)
    '#1e40af', -- secondary_color (darker blue)
    '[]'::jsonb, -- gallery_images (empty array, can be populated later)
    '[]'::jsonb, -- featured_students (empty array, can be populated later)
    'info@cec.edu.py',
    '+595 21 123456',
    '+595981234567',
    'Asunción, Paraguay',
    NULL -- calendar_embed_url
)
ON CONFLICT (institution_id) DO UPDATE SET
    brand_name = EXCLUDED.brand_name,
    logo_url = EXCLUDED.logo_url,
    hero_title = EXCLUDED.hero_title,
    hero_subtitle = EXCLUDED.hero_subtitle,
    philosophy_title = EXCLUDED.philosophy_title,
    philosophy_content = EXCLUDED.philosophy_content,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    updated_at = NOW();
