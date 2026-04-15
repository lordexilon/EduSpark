-- Add institution_id to announcements
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS institution_id BIGINT REFERENCES institutions(id);

-- Add institution_id to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS institution_id BIGINT REFERENCES institutions(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_announcements_institution ON announcements(institution_id);
CREATE INDEX IF NOT EXISTS idx_conversations_institution ON conversations(institution_id);
