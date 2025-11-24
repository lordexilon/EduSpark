-- =====================================================
-- Script: Corregir Políticas RLS de Usuarios para Admin-Campus
-- Descripción: Asegura que admin-campus solo vea usuarios de su institución
-- Fecha: 2025-11-19
-- =====================================================

-- 1. Verificar políticas actuales en la tabla users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- 2. Eliminar políticas antiguas que puedan estar causando conflictos
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_institution_access" ON public.users;
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view users from same institution" ON public.users;

-- 3. Crear política para ADMIN GLOBAL (ve todos los usuarios)
CREATE POLICY "admin_view_all_users" ON public.users
  FOR SELECT
  USING (
    public.is_admin()
  );

-- 4. Crear política para ADMIN-CAMPUS y COORDINATOR (solo ven usuarios de su institución)
CREATE POLICY "admin_campus_view_institution_users" ON public.users
  FOR SELECT
  USING (
    -- Si el usuario es admin-campus o coordinator
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    -- Y el usuario consultado pertenece a la misma institución
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
        AND ui_target.is_primary = true
    )
  );

-- 5. Crear política para TEACHER (ve usuarios de su institución)
CREATE POLICY "teacher_view_institution_users" ON public.users
  FOR SELECT
  USING (
    public.is_teacher()
    AND
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
        AND ui_target.is_primary = true
    )
  );

-- 6. Crear política para que los usuarios vean su propio perfil
CREATE POLICY "users_view_own_profile" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
  );

-- 7. Política UPDATE para admin global
CREATE POLICY "admin_update_all_users" ON public.users
  FOR UPDATE
  USING (
    public.is_admin()
  );

-- 8. Política UPDATE para admin-campus y coordinator (solo usuarios de su institución)
CREATE POLICY "admin_campus_update_institution_users" ON public.users
  FOR UPDATE
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    EXISTS (
      SELECT 1 
      FROM public.user_institutions ui_current
      JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_current.institution_id
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.is_primary = true
        AND ui_target.user_id = users.id
        AND ui_target.is_primary = true
    )
  );

-- 9. Política para que usuarios actualicen su propio perfil
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
  );

-- 10. Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Tiene condición USING'
    ELSE 'Sin condición'
  END as tiene_condicion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- 11. Verificar que las funciones helper existen
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'is_admin_campus', 'is_coordinator', 'is_teacher', 'get_user_institution_id')
ORDER BY routine_name;

-- =====================================================
-- VERIFICACIÓN: Probar que funciona
-- =====================================================

-- Ejecutar como admin-campus para verificar que solo ve usuarios de su institución
-- (Esto debe ejecutarse después de hacer login como admin-campus)

/*
-- Verificar institución del usuario actual
SELECT public.get_user_institution_id() as mi_institucion;

-- Ver usuarios que debería ver (solo de mi institución)
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
ORDER BY r.name, u.last_name;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. Las políticas RLS se aplican automáticamente a todas las consultas
2. Si un admin-campus ve usuarios de otras instituciones, verificar:
   - Que el usuario admin-campus tenga institución asignada (user_institutions con is_primary = true)
   - Que las funciones helper (is_admin_campus, get_user_institution_id) existan
   - Que RLS esté habilitado en la tabla users: ALTER TABLE users ENABLE ROW LEVEL SECURITY;

3. Para verificar que un usuario tiene institución asignada:
   SELECT * FROM user_institutions WHERE user_id = 'USER_ID_AQUI' AND is_primary = true;

4. Para asignar institución a un usuario:
   INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
   VALUES ('USER_ID', INSTITUTION_ID, true, NOW())
   ON CONFLICT (user_id, institution_id) DO UPDATE SET is_primary = true;
*/
