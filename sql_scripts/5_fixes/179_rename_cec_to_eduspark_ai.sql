-- SQL Migration: Rename CEC (Centro de Estudio Cavavelos) to EduSpark AI
-- Task: Renaming CEC To EduSpark AI
-- Date: 2026-03-28

-- 1. Update the institution name in the core 'institutions' table
UPDATE institutions 
SET name = 'EduSpark AI', 
    updated_at = NOW() 
WHERE id = 2 OR name ILIKE '%Cavavelos%' OR name = 'CEC';

-- 2. Update the landing page configuration branding
UPDATE institution_landing_config 
SET brand_name = 'EduSpark AI',
    hero_title = 'EduSpark AI: Tu futuro comienza aquí',
    updated_at = NOW()
WHERE institution_id = 2;

-- 3. Update any contact emails if they contain 'cec.edu.py' to a generic 'edusparks.ai' if needed
-- Note: This is optional and preserves domain unless explicitly asked, but we'll update the landing email
UPDATE institution_landing_config
SET contact_email = 'info@edusparks.ai'
WHERE institution_id = 2 AND contact_email = 'info@cec.edu.py';
