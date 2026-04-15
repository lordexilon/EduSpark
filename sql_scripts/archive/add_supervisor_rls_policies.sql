-- =====================================================
-- Script: Agregar Políticas RLS para Rol Supervisor
-- Descripción: Asegura que supervisores solo vean y gestionen usuarios de su institución
-- Fecha: 2025-12-01
-- =====================================================

-- 1. Verificar que el rol supervisor existe
SELECT 
  'Verificación de rol supervisor' as verificacion,
  id,
  name,
  description
FROM public.roles
WHERE name = 'supervisor';

-- 2. Crear función helper para verificar si es supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'supervisor'
  );
$$;

-- 3. Verificar políticas actuales en la tabla users
SELECT 
  'Políticas actuales de users' as verificacion,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- 4. Crear política SELECT para supervisor (solo ve usuarios de su institución)
DROP POLICY IF EXISTS "supervisor_view_institution_users" ON public.users;
CREATE POLICY "supervisor_view_institution_users" ON public.users
  FOR SELECT
  USING (
    -- Si el usuario es supervisor
    public.is_supervisor()
    AND
    -- Y el usuario consultado pertenece a la misma institución
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
    )
  );

-- 5. Crear política UPDATE para supervisor (solo puede actualizar usuarios de su institución)
DROP POLICY IF EXISTS "supervisor_update_institution_users" ON public.users;
CREATE POLICY "supervisor_update_institution_users" ON public.users
  FOR UPDATE
  USING (
    public.is_supervisor()
    AND
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
    )
  )
  WITH CHECK (
    public.is_supervisor()
    AND
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
    )
  );

-- 6. Verificar que las políticas se crearon correctamente
SELECT 
  'Políticas después de agregar supervisor' as verificacion,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%supervisor%' THEN '✅ Supervisor'
    WHEN policyname LIKE '%admin%' THEN '👑 Admin'
    WHEN policyname LIKE '%campus%' OR policyname LIKE '%coordinator%' THEN '🏛️ Admin Campus/Coordinator'
    WHEN policyname LIKE '%teacher%' THEN '👨‍🏫 Teacher'
    WHEN policyname LIKE '%own%' THEN '👤 Propio'
    ELSE '📋 General'
  END as tipo_politica
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY tipo_politica, policyname;

-- 7. Verificar que la función helper existe
SELECT 
  'Funciones helper' as verificacion,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_supervisor', 'is_admin', 'is_admin_campus', 'is_coordinator', 'is_teacher')
ORDER BY routine_name;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. Las políticas RLS se aplican automáticamente a todas las consultas
2. Si un supervisor ve usuarios de otras instituciones, verificar:
   - Que el usuario supervisor tenga institución asignada (user_institutions con is_primary = true)
   - Que la función helper is_supervisor() exista y funcione correctamente
   - Que RLS esté habilitado en la tabla users: ALTER TABLE users ENABLE ROW LEVEL SECURITY;

3. Para verificar que un supervisor tiene institución asignada:
   SELECT * FROM user_institutions WHERE user_id = 'USER_ID_AQUI' AND is_primary = true;

4. Para asignar institución a un supervisor:
   INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
   VALUES ('USER_ID', INSTITUTION_ID, true, NOW())
   ON CONFLICT (user_id, institution_id) DO UPDATE SET is_primary = true;

5. Las políticas de supervisor son similares a las de admin-campus y coordinator,
   pero específicas para el rol supervisor.
*/

