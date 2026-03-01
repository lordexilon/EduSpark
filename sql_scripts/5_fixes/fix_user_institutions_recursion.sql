-- fix_user_institutions_recursion.sql
-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER function

-- 1. Create a helper function to get current user's institutions bypassing RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_institutions()
RETURNS SETOF integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT institution_id 
    FROM public.user_institutions 
    WHERE user_id = auth.uid();
$$;

-- 2. Update policies to use the function
DROP POLICY IF EXISTS "View user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Insert user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Update user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Delete user_institutions" ON public.user_institutions;

-- SELECT Policy
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
  institution_id IN (SELECT public.get_auth_user_institutions()) -- Campus Admin / Supervisor
);

-- INSERT Policy
CREATE POLICY "Insert user_institutions" ON public.user_institutions
FOR INSERT WITH CHECK (
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN (SELECT public.get_auth_user_institutions()) -- Campus Admin / Supervisor
);

-- UPDATE Policy
CREATE POLICY "Update user_institutions" ON public.user_institutions
FOR UPDATE USING (
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN (SELECT public.get_auth_user_institutions()) -- Campus Admin / Supervisor
);

-- DELETE Policy
CREATE POLICY "Delete user_institutions" ON public.user_institutions
FOR DELETE USING (
  EXISTS ( -- Global Admin
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  )
  OR
  institution_id IN (SELECT public.get_auth_user_institutions()) -- Campus Admin / Supervisor
);
