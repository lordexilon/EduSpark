-- Migración para soportar prompts de imagen en flashcards
-- Fecha: 2026-02-18

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flashcards') THEN
    ALTER TABLE public.flashcards 
    ADD COLUMN IF NOT EXISTS image_prompt TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flashcards') THEN
    COMMENT ON COLUMN public.flashcards.image_prompt IS 'Sugerencia visual para generación de imagen por IA';
  END IF;
END $$;
