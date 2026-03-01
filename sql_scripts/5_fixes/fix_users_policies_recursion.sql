-- fix_users_policies_recursion.sql
-- FIX CRÍTICO: Reparar recursión en políticas de la tabla 'users'
-- Este script reemplaza las políticas de 'users' con versiones seguras que no causan bucles infinitos.

-- 1. Asegurar que las funciones helper sean SECURITY DEFINER (Bypassean RLS)
-- Esto es fundamental para evitar que la verificación de permisos intente verificar permisos recursivamente.

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

CREATE OR REPLACE FUNCTION public.is_admin_campus()
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
    AND r.name = 'admin-campus'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor()
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
    AND r.name = 'supervisor'
  );
$$;

-- Función segura para obtener ID de institución
CREATE OR REPLACE FUNCTION public.get_auth_user_institution_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT institution_id 
    FROM public.user_institutions 
    WHERE user_id = auth.uid() 
    AND is_primary = true
    LIMIT 1;
$$;

-- 2. Limpiar TODAS las políticas existentes en 'users' para empezar de cero
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_institution_update" ON public.users;
DROP POLICY IF EXISTS "users_own_read" ON public.users;
DROP POLICY IF EXISTS "users_allow_insert" ON public.users;
DROP POLICY IF EXISTS "Students can view related users (teachers and classmates)" ON public.users;
DROP POLICY IF EXISTS "users_institution_access" ON public.users;
DROP POLICY IF EXISTS "supervisor_view_institution_users" ON public.users;
DROP POLICY IF EXISTS "supervisor_update_institution_users" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 3. Crear políticas SIMPLIFICADAS y SEGURAS

-- A. Admin Global ve todo
CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL USING (
  public.is_admin()
);

-- B. Usuarios ven su propio perfil
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (
  auth.uid() = id
);

-- C. Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (
  auth.uid() = id
);

-- D. Admin Campus y Supervisores ven usuarios de su institución
-- Usamos las funciones seguras para evitar recursión
CREATE POLICY "Campus Admins and Supervisors view institution users" ON public.users
FOR SELECT USING (
  (public.is_admin_campus() OR public.is_supervisor()) 
  AND 
  EXISTS (
    SELECT 1 FROM public.user_institutions ui_target
    WHERE ui_target.user_id = users.id
    AND ui_target.institution_id = public.get_auth_user_institution_id()
  )
);

-- E. Permitir INSERT público (necesario para registro/auth)
CREATE POLICY "Public can insert users" ON public.users
FOR INSERT WITH CHECK (true);

-- 4. Asegurar permisos en tabla roles (por si acaso)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read roles" ON public.roles;
CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);

-- 5. Re-confirmar tu usuario como admin
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'albertovillalba@gmail.com';
