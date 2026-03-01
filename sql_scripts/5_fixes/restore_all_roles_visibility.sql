-- restore_all_roles_visibility.sql
-- RESTAURACIÓN COMPLETA Y SEGURA DE TODOS LOS ROLES
-- Este script asegura que cada rol vea lo que debe ver, sin recursión.

-- 1. Funciones de Seguridad (Inmunes a RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.name 
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_institution_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT institution_id 
  FROM user_institutions 
  WHERE user_id = auth.uid() 
  AND is_primary = true 
  LIMIT 1;
$$;

-- 2. Limpiar Políticas de USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Campus Admins and Supervisors view institution users" ON public.users;
DROP POLICY IF EXISTS "Public can insert users" ON public.users;

-- 3. Definir Políticas Nuevas

-- A. ADMIN GLOBAL: Ve todo
CREATE POLICY "Admin Global sees all" ON public.users
FOR ALL USING (
  (SELECT public.get_my_role()) IN ('admin', 'coordinator')
);

-- B. ADMIN CAMPUS y SUPERVISOR: Ven usuarios de su misma institución
CREATE POLICY "Campus Admin/Supervisor sees institution" ON public.users
FOR SELECT USING (
  (SELECT public.get_my_role()) IN ('admin-campus', 'supervisor')
  AND
  EXISTS (
    SELECT 1 FROM user_institutions ui
    WHERE ui.user_id = users.id
    AND ui.institution_id = (SELECT public.get_my_institution_id())
  )
);

-- C. TEACHER, STUDENT, COORDINATOR: Ven su propio perfil
CREATE POLICY "Users see own profile" ON public.users
FOR SELECT USING (
  id = auth.uid()
);

-- D. TODOS: Pueden actualizar su propio perfil
CREATE POLICY "Users update own profile" ON public.users
FOR UPDATE USING (
  id = auth.uid()
);

-- E. PUBLICO: Registro
CREATE POLICY "Public insert" ON public.users
FOR INSERT WITH CHECK (true);


-- 4. Limpiar Políticas de USER_INSTITUTIONS
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Manage user_institutions" ON public.user_institutions;

-- A. ADMIN GLOBAL: Ve y gestiona todo
CREATE POLICY "Admin Global manages institutions" ON public.user_institutions
FOR ALL USING (
  (SELECT public.get_my_role()) IN ('admin', 'coordinator')
);

-- B. ADMIN CAMPUS y SUPERVISOR: Ven su propia institución
CREATE POLICY "Campus Admin/Supervisor sees own institution" ON public.user_institutions
FOR SELECT USING (
  institution_id = (SELECT public.get_my_institution_id())
);

-- C. TODOS: Ven sus propias asignaciones
CREATE POLICY "Users see own assignments" ON public.user_institutions
FOR SELECT USING (
  user_id = auth.uid()
);

-- 5. Restaurar tu usuario Admin
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'albertovillalba@gmail.com';
