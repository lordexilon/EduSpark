-- Add institution_id to announcements
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
    ALTER TABLE announcements 
    ADD COLUMN IF NOT EXISTS institution_id BIGINT REFERENCES institutions(id);
  END IF;
END $$;

-- Add institution_id to conversations
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER TABLE conversations 
    ADD COLUMN IF NOT EXISTS institution_id BIGINT REFERENCES institutions(id);
  END IF;
END $$;

-- Create index for performance
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
    CREATE INDEX IF NOT EXISTS idx_announcements_institution ON announcements(institution_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_institution ON conversations(institution_id);
  END IF;
END $$;
