-- Migración para soportar prompts de imagen en flashcards
-- Fecha: 2026-02-18

ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS image_prompt TEXT;

COMMENT ON COLUMN public.flashcards.image_prompt IS 'Sugerencia visual para generación de imagen por IA';
