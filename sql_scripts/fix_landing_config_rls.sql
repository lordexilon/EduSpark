-- Fix RLS policies for institution_landing_config table

-- 1. Enable RLS on institution_landing_config table (if not already enabled)
ALTER TABLE institution_landing_config ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public can view landing configs" ON institution_landing_config;
DROP POLICY IF EXISTS "Admins can manage landing configs" ON institution_landing_config;

-- 3. Allow public read access (for displaying landing pages)
CREATE POLICY "Public can view landing configs"
ON institution_landing_config
FOR SELECT
USING (true);

-- 4. Allow admins to manage landing configs
-- Full admins (role_id = 3) can manage all institutions
-- Admin-campus (role_id = 5) can only manage their own institution
CREATE POLICY "Admins can manage landing configs"
ON institution_landing_config
FOR ALL
USING (
  -- Full admin can manage all
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role_id = 3
  )
  OR
  -- Admin-campus can only manage their institution
  (
    institution_id IN (
      SELECT institution_id 
      FROM user_institutions 
      WHERE user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role_id = 5
    )
  )
);
