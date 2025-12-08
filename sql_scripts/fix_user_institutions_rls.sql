-- fix_user_institutions_rls.sql
-- Fix RLS policies for user_institutions table to allow proper user assignment

-- Enable RLS
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own institution data" ON public.user_institutions;
DROP POLICY IF EXISTS "Global Admins can manage all" ON public.user_institutions;
DROP POLICY IF EXISTS "Campus Admins can manage own institution" ON public.user_institutions;
DROP POLICY IF EXISTS "Admins can manage user institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "View own user_institutions" ON public.user_institutions;

-- 1. SELECT Policy
-- Users can see their own assignments
-- Global admins can see all
-- Campus admins/Supervisors can see assignments for their institutions
CREATE POLICY "View user_institutions" ON public.user_institutions
FOR SELECT USING (
  auth.uid() = user_id -- Own data
  OR
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN ( -- Campus Admin / Supervisor seeing data for their inst
    SELECT ui.institution_id 
    FROM user_institutions ui
    WHERE ui.user_id = auth.uid()
  )
);

-- 2. INSERT Policy
-- Global admins can insert any
-- Campus admins/Supervisors can insert for their institutions
CREATE POLICY "Insert user_institutions" ON public.user_institutions
FOR INSERT WITH CHECK (
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN ( -- Campus Admin / Supervisor inserting into their inst
    SELECT ui.institution_id 
    FROM user_institutions ui
    WHERE ui.user_id = auth.uid()
  )
);

-- 3. UPDATE Policy
CREATE POLICY "Update user_institutions" ON public.user_institutions
FOR UPDATE USING (
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN ( -- Campus Admin / Supervisor updating their inst
    SELECT ui.institution_id 
    FROM user_institutions ui
    WHERE ui.user_id = auth.uid()
  )
);

-- 4. DELETE Policy
CREATE POLICY "Delete user_institutions" ON public.user_institutions
FOR DELETE USING (
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN ( -- Campus Admin / Supervisor deleting from their inst
    SELECT ui.institution_id 
    FROM user_institutions ui
    WHERE ui.user_id = auth.uid()
  )
);
