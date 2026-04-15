-- Corregir políticas RLS para menu_features
-- El problema era que auth.role() devuelve 'authenticated', no el rol de la aplicación ('admin')

DROP POLICY IF EXISTS "admin_can_edit" ON public.menu_features;
DROP POLICY IF EXISTS "all_can_read" ON public.menu_features;

-- 1. Permitir lectura a todos los usuarios autenticados
CREATE POLICY "all_can_read"
ON public.menu_features FOR SELECT
TO authenticated
USING (true);

-- 2. Permitir edición SOLO a administradores (verificando la tabla users)
CREATE POLICY "admin_can_edit"
ON public.menu_features FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.role_id = (SELECT id FROM public.roles WHERE name = 'admin')
  )
);
