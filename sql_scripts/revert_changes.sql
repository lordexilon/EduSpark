-- revert_changes.sql
-- RESTAURACIÓN COMPLETA DE PERMISOS
-- Este script elimina las políticas complejas que causaron el error de "todos son estudiantes"
-- y restaura un estado base seguro y funcional.

-- 1. Función segura para verificar Admin (evita errores de recursión)
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

-- 2. LIMPIEZA DE user_institutions (Romper el ciclo de permisos)
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

-- Borrar todas las políticas creadas recientemente y las antiguas conflictivas
DROP POLICY IF EXISTS "View user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Insert user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Update user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Delete user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Users can view own institution data" ON public.user_institutions;
DROP POLICY IF EXISTS "Global Admins can manage all" ON public.user_institutions;
DROP POLICY IF EXISTS "Campus Admins can manage own institution" ON public.user_institutions;
DROP POLICY IF EXISTS "Admins can manage user institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "View own user_institutions" ON public.user_institutions;

-- Restaurar política SIMPLE: Ver tus propias instituciones O ser Admin Global
CREATE POLICY "View user_institutions" ON public.user_institutions
FOR SELECT USING (
  user_id = auth.uid() OR public.is_admin()
);

-- Restaurar política SIMPLE: Solo Admin Global puede modificar (Estado original seguro)
CREATE POLICY "Manage user_institutions" ON public.user_institutions
FOR ALL USING (
  public.is_admin()
);


-- 3. LIMPIEZA DE users (Restaurar visibilidad de perfil)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Borrar políticas conflictivas
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Campus Admins and Supervisors view institution users" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_institution_access" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_institution_update" ON public.users;
DROP POLICY IF EXISTS "users_own_read" ON public.users;
DROP POLICY IF EXISTS "users_allow_insert" ON public.users;
DROP POLICY IF EXISTS "Students can view related users (teachers and classmates)" ON public.users;
DROP POLICY IF EXISTS "supervisor_view_institution_users" ON public.users;
DROP POLICY IF EXISTS "supervisor_update_institution_users" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Restaurar políticas BÁSICAS y SEGURAS
-- A. Ver perfil: Uno mismo O Admin Global
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (
  id = auth.uid() OR public.is_admin()
);

-- B. Registro: Permitir insertar a cualquiera (necesario para sign up)
CREATE POLICY "Public can insert users" ON public.users
FOR INSERT WITH CHECK (true);

-- C. Actualizar: Solo uno mismo
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (
  id = auth.uid()
);

-- 4. Asegurar tu rol de Admin
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'albertovillalba@gmail.com';
