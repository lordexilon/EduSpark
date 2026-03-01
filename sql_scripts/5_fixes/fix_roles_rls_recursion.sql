-- Drop existing policies to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Allow everyone to read roles
-- This prevents recursion because it doesn't query the table itself with a condition that triggers other policies
CREATE POLICY "Roles are viewable by everyone" 
ON public.roles FOR SELECT 
USING (true);

-- 2. INSERT/UPDATE/DELETE Policy: Only admins
-- We explicitly list the operations to exclude SELECT, preventing infinite recursion
-- when the subquery (SELECT ... FROM roles) runs.
CREATE POLICY "Admins can insert roles" 
ON public.roles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
  )
);

CREATE POLICY "Admins can update roles" 
ON public.roles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
  )
);

CREATE POLICY "Admins can delete roles" 
ON public.roles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
  )
);
