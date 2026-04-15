-- Fix RLS policies for messages table

-- 1. Enable RLS on messages table (if not already enabled)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- 3. Create policy to allow users to view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);

-- 4. Create policy to allow users to insert messages in their conversations
CREATE POLICY "Users can insert messages in their conversations"
ON messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  conversation_id IN (
    SELECT id FROM conversations
    WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);

-- 5. Create policy to allow users to update their own messages (for marking as read)
CREATE POLICY "Users can update their own messages"
ON messages
FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);
