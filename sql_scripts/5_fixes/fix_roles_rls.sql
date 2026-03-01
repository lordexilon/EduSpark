-- Enable RLS on roles table if not already enabled
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to view roles (needed for login/auth flow)
CREATE POLICY "Roles are viewable by everyone" 
ON public.roles FOR SELECT 
USING (true);

-- Policy to allow only admins to insert/update/delete roles
CREATE POLICY "Admins can manage roles" 
ON public.roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin')
  )
);
