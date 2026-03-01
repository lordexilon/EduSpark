-- =====================================================
-- TEST: Verificar funciones desde contexto de frontend
-- =====================================================
-- Este script debe ejecutarse DESDE EL FRONTEND usando una llamada RPC
-- o desde el SQL Editor con autenticación activa
-- 
-- IMPORTANTE: Este script solo funciona cuando hay un usuario autenticado
-- No funciona en el SQL Editor sin autenticación

-- =====================================================
-- 1. VERIFICAR auth.uid() Y JWT
-- =====================================================

SELECT 
    'Auth context' as test_type,
    auth.uid() as auth_uid,
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid as jwt_user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN '✅ auth.uid() disponible'
        WHEN (current_setting('request.jwt.claims', true)::json->>'sub')::uuid IS NOT NULL THEN '✅ JWT disponible'
        ELSE '❌ No hay contexto de autenticación'
    END as auth_status;

-- =====================================================
-- 2. VERIFICAR FUNCIONES HELPER
-- =====================================================

SELECT 
    'Funciones helper' as test_type,
    public.is_admin_or_manager_safe() as is_admin_or_manager,
    public.is_admin_campus_safe() as is_admin_campus,
    public.is_coordinator_safe() as is_coordinator,
    CASE 
        WHEN public.is_admin_or_manager_safe() THEN '✅ Funciona'
        ELSE '❌ No funciona'
    END as function_status;

-- =====================================================
-- 3. VERIFICAR ROL DEL USUARIO DIRECTAMENTE
-- =====================================================

SELECT 
    'Rol del usuario' as test_type,
    u.id as user_id,
    u.email,
    r.name as role_name,
    u.is_active,
    CASE 
        WHEN r.name IN ('admin', 'admin-campus', 'coordinator') THEN '✅ Rol administrativo'
        ELSE '❌ Rol no administrativo'
    END as role_status
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE u.id = COALESCE(auth.uid(), (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- =====================================================
-- 4. TEST DE ACCESO A CURSO
-- =====================================================

-- Reemplaza 12 con el ID del curso que quieres probar
SELECT 
    'Test acceso curso 12' as test_type,
    c.id,
    c.title,
    c.teacher_id,
    COALESCE(auth.uid(), (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) as current_user_id,
    (c.teacher_id = COALESCE(auth.uid(), (current_setting('request.jwt.claims', true)::json->>'sub')::uuid)) as is_owner,
    public.is_admin_or_manager_safe() as is_admin_or_manager,
    -- Simular evaluación de políticas
    (public.is_admin_or_manager_safe() OR (c.teacher_id = COALESCE(auth.uid(), (current_setting('request.jwt.claims', true)::json->>'sub')::uuid))) as would_pass_rls
FROM public.courses c
WHERE c.id = 12;

-- =====================================================
-- 5. RECOMENDACIÓN
-- =====================================================

DO $$
DECLARE
    v_user_id UUID;
    v_role_name TEXT;
    v_is_admin_or_manager BOOLEAN;
BEGIN
    -- Obtener user_id
    v_user_id := COALESCE(auth.uid(), (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '❌ ERROR: No hay contexto de autenticación';
        RAISE NOTICE '   Este script debe ejecutarse desde el frontend';
        RAISE NOTICE '   o desde el SQL Editor con un usuario autenticado';
        RAISE NOTICE '========================================';
        RETURN;
    END IF;
    
    -- Obtener rol
    SELECT r.name INTO v_role_name
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = v_user_id;
    
    -- Verificar función
    v_is_admin_or_manager := public.is_admin_or_manager_safe();
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESULTADO DEL TEST:';
    RAISE NOTICE '  Usuario: %', v_user_id;
    RAISE NOTICE '  Rol: %', v_role_name;
    RAISE NOTICE '  is_admin_or_manager_safe(): %', v_is_admin_or_manager;
    RAISE NOTICE '';
    
    IF v_is_admin_or_manager THEN
        RAISE NOTICE '✅ Las funciones funcionan correctamente';
        RAISE NOTICE '   Deberías poder editar cursos';
    ELSE
        RAISE NOTICE '❌ Las funciones NO funcionan';
        RAISE NOTICE '   Verifica que el script 156 se ejecutó correctamente';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

