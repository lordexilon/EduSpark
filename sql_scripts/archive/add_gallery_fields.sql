-- add_gallery_fields.sql
-- Add gallery_title and gallery_description columns to institution_landing_config table
-- Run in Supabase SQL Editor

ALTER TABLE public.institution_landing_config
ADD COLUMN IF NOT EXISTS gallery_title TEXT DEFAULT 'Nuestra Casa de Estudios',
ADD COLUMN IF NOT EXISTS gallery_description TEXT DEFAULT 'Un ambiente diseñado para el aprendizaje y la convivencia';

-- Update existing records with default values if they are null (just in case)
UPDATE public.institution_landing_config
SET gallery_title = 'Nuestra Casa de Estudios'
WHERE gallery_title IS NULL;

UPDATE public.institution_landing_config
SET gallery_description = 'Un ambiente diseñado para el aprendizaje y la convivencia'
WHERE gallery_description IS NULL;
