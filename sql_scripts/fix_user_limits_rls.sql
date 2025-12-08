-- fix_user_limits_rls.sql
-- Corregir políticas RLS para user_query_limits
-- Permitir que administradores y admin-campus puedan gestionar límites de otros usuarios

-- =====================================================
-- 1. ELIMINAR POLÍTICAS ANTIGUAS (si existen)
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all limits" ON public.user_query_limits;
DROP POLICY IF EXISTS "Campus admins can manage limits for their institution" ON public.user_query_limits;
DROP POLICY IF EXISTS "Admins can view all limits" ON public.user_query_limits; -- Posible nombre antiguo
DROP POLICY IF EXISTS "Admins can update all limits" ON public.user_query_limits; -- Posible nombre antiguo

-- =====================================================
-- 2. CREAR NUEVAS POLÍTICAS
-- =====================================================

-- Política para Administradores Globales (admin, coordinator)
-- Tienen acceso total a todos los registros
CREATE POLICY "Admins can manage all limits"
    ON public.user_query_limits
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON r.id = u.role_id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'coordinator')
        )
    );

-- Política para Administradores de Campus y Supervisores
-- Tienen acceso solo a usuarios de su misma institución
CREATE POLICY "Campus admins can manage limits for their institution"
    ON public.user_query_limits
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users u_auth
            JOIN public.roles r_auth ON r_auth.id = u_auth.role_id
            JOIN public.user_institutions ui_auth ON ui_auth.user_id = u_auth.id
            JOIN public.user_institutions ui_target ON ui_target.institution_id = ui_auth.institution_id
            WHERE u_auth.id = auth.uid()
            AND r_auth.name IN ('admin-campus', 'supervisor')
            AND ui_target.user_id = public.user_query_limits.user_id
        )
    );

-- =====================================================
-- 3. VERIFICAR POLÍTICAS
-- =====================================================
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'user_query_limits'
ORDER BY policyname;
