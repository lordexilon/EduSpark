-- emergency_fix_access.sql
-- Este script arregla el acceso INMEDIATAMENTE rompiendo el ciclo de permisos
-- Ejecútalo para volver a ser Admin

-- 1. Función de seguridad para leer instituciones sin causar recursión
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

-- 2. Reiniciar políticas de user_institutions usando la función segura
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Insert user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Update user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Delete user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Users can view own institution data" ON public.user_institutions;
DROP POLICY IF EXISTS "Global Admins can manage all" ON public.user_institutions;
DROP POLICY IF EXISTS "Campus Admins can manage own institution" ON public.user_institutions;

CREATE POLICY "View user_institutions" ON public.user_institutions
FOR SELECT USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator'))
  OR institution_id IN (SELECT public.get_auth_user_institutions())
);

CREATE POLICY "Insert user_institutions" ON public.user_institutions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator'))
  OR institution_id IN (SELECT public.get_auth_user_institutions())
);

CREATE POLICY "Update user_institutions" ON public.user_institutions
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator'))
  OR institution_id IN (SELECT public.get_auth_user_institutions())
);

CREATE POLICY "Delete user_institutions" ON public.user_institutions
FOR DELETE USING (
  EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator'))
  OR institution_id IN (SELECT public.get_auth_user_institutions())
);

-- 3. Asegurar que tu usuario sea Admin
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'albertovillalba@gmail.com';
