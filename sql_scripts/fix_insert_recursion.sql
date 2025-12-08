-- fix_insert_recursion.sql
-- FIX: Infinite recursion on INSERT for user_institutions
-- El problema es que al insertar, la política intenta verificar el rol, pero el rol depende de la lectura de la misma tabla.

-- 1. Asegurar funciones seguras (ya deberían estar, pero por si acaso)
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

-- 2. Eliminar políticas conflictivas de user_institutions
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Global manages institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Campus Admin/Supervisor sees own institution" ON public.user_institutions;
DROP POLICY IF EXISTS "Users see own assignments" ON public.user_institutions;
DROP POLICY IF EXISTS "Insert user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Update user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "Delete user_institutions" ON public.user_institutions;

-- 3. Crear políticas separadas y explícitas para evitar ambigüedad

-- A. SELECT (Lectura)
CREATE POLICY "Read user_institutions" ON public.user_institutions
FOR SELECT USING (
  -- Admin Global ve todo
  (SELECT public.get_my_role()) IN ('admin', 'coordinator')
  OR
  -- Admin Campus/Supervisor ve su institución
  institution_id = (SELECT public.get_my_institution_id())
  OR
  -- Usuario ve sus propias asignaciones
  user_id = auth.uid()
);

-- B. INSERT (Creación) - AQUÍ ESTABA EL PROBLEMA
-- Usamos WITH CHECK que valida la fila NUEVA, no la existente
CREATE POLICY "Insert user_institutions" ON public.user_institutions
FOR INSERT WITH CHECK (
  -- Admin Global puede insertar en cualquier lado
  (SELECT public.get_my_role()) IN ('admin', 'coordinator')
  OR
  -- Admin Campus/Supervisor solo en su institución
  institution_id = (SELECT public.get_my_institution_id())
);

-- C. UPDATE (Modificación)
CREATE POLICY "Update user_institutions" ON public.user_institutions
FOR UPDATE USING (
  (SELECT public.get_my_role()) IN ('admin', 'coordinator')
  OR
  institution_id = (SELECT public.get_my_institution_id())
);

-- D. DELETE (Eliminación)
CREATE POLICY "Delete user_institutions" ON public.user_institutions
FOR DELETE USING (
  (SELECT public.get_my_role()) IN ('admin', 'coordinator')
  OR
  institution_id = (SELECT public.get_my_institution_id())
);
