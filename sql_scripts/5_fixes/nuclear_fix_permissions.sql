-- nuclear_fix_permissions.sql
-- SOLUCIÓN DEFINITIVA PARA PERMISOS Y RECURSIÓN
-- Este script utiliza funciones SECURITY DEFINER para evitar cualquier ciclo de RLS.

-- 1. Función segura para verificar si es Admin (Bypassea RLS de users)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
    AND r.name IN ('admin', 'coordinator')
  );
$$;

-- 2. Función segura para obtener instituciones del usuario (Bypassea RLS de user_institutions)
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

-- 3. Limpiar TODAS las políticas de user_institutions
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Insert user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Update user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Delete user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Users can view own institution data" ON public.user_institutions;
DROP POLICY IF EXISTS "Global Admins can manage all" ON public.user_institutions;
DROP POLICY IF EXISTS "Campus Admins can manage own institution" ON public.user_institutions;
DROP POLICY IF EXISTS "Admins can manage user institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "View own user_institutions" ON public.user_institutions;

-- 4. Crear nuevas políticas usando SOLO las funciones seguras
-- SELECT
CREATE POLICY "View user_institutions" ON public.user_institutions
FOR SELECT USING (
  auth.uid() = user_id -- Ver propias
  OR public.is_admin() -- Admin global
  OR institution_id IN (SELECT public.get_auth_user_institutions()) -- Admin Campus/Supervisor
);

-- INSERT
CREATE POLICY "Insert user_institutions" ON public.user_institutions
FOR INSERT WITH CHECK (
  public.is_admin() -- Admin global
  OR institution_id IN (SELECT public.get_auth_user_institutions()) -- Admin Campus/Supervisor
);

-- UPDATE
CREATE POLICY "Update user_institutions" ON public.user_institutions
FOR UPDATE USING (
  public.is_admin() -- Admin global
  OR institution_id IN (SELECT public.get_auth_user_institutions()) -- Admin Campus/Supervisor
);

-- DELETE
CREATE POLICY "Delete user_institutions" ON public.user_institutions
FOR DELETE USING (
  public.is_admin() -- Admin global
  OR institution_id IN (SELECT public.get_auth_user_institutions()) -- Admin Campus/Supervisor
);

-- 5. RESTAURAR TU USUARIO A ADMIN
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'albertovillalba@gmail.com';

-- 6. Verificación rápida
SELECT email, role_id FROM users WHERE email = 'albertovillalba@gmail.com';
