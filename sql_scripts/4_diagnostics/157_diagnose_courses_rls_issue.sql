-- =====================================================
-- DIAGNÓSTICO: Problema de RLS en courses
-- =====================================================
-- Este script diagnostica por qué el UPDATE no funciona
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. VERIFICAR USUARIO ACTUAL Y ROL
-- =====================================================

SELECT 
    'Usuario actual' as check_type,
    auth.uid() as user_id,
    (SELECT email FROM public.users WHERE id = auth.uid()) as user_email,
    (SELECT r.name FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid()) as user_role;

-- =====================================================
-- 2. VERIFICAR FUNCIONES HELPER
-- =====================================================

SELECT 
    'Funciones helper' as check_type,
    public.is_admin_or_manager_safe() as is_admin_or_manager,
    public.is_admin_campus_safe() as is_admin_campus,
    public.is_coordinator_safe() as is_coordinator,
    public.is_admin() as is_admin_old;

-- =====================================================
-- 3. VERIFICAR POLÍTICAS RLS EXISTENTES
-- =====================================================

SELECT 
    'Políticas RLS' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- =====================================================
-- 4. VERIFICAR ACCESO A UN CURSO ESPECÍFICO
-- =====================================================

-- Reemplaza 12 con el ID del curso que quieres probar
SELECT 
    'Acceso a curso 12' as check_type,
    id,
    title,
    teacher_id,
    auth.uid() as current_user_id,
    (teacher_id = auth.uid()) as is_owner,
    public.is_admin_or_manager_safe() as is_admin_or_manager,
    -- Simular evaluación de políticas
    (public.is_admin_or_manager_safe() OR (teacher_id = auth.uid())) as would_pass_rls
FROM public.courses
WHERE id = 12;

-- =====================================================
-- 5. TEST DE UPDATE SIMULADO
-- =====================================================

-- Verificar si podemos "ver" el curso (USING)
SELECT 
    'Test USING (SELECT)' as test_type,
    COUNT(*) as courses_visible
FROM public.courses
WHERE id = 12;

-- Verificar si podemos "actualizar" el curso (WITH CHECK)
-- Esto simula lo que hace el WITH CHECK
SELECT 
    'Test WITH CHECK (UPDATE simulado)' as test_type,
    CASE 
        WHEN public.is_admin_or_manager_safe() THEN '✅ PASS (admin/manager)'
        WHEN EXISTS (SELECT 1 FROM public.courses WHERE id = 12 AND teacher_id = auth.uid()) THEN '✅ PASS (owner)'
        ELSE '❌ FAIL (no access)'
    END as check_result;

-- =====================================================
-- 6. VERIFICAR SI HAY CONFLICTOS DE POLÍTICAS
-- =====================================================

-- En PostgreSQL RLS, múltiples políticas se combinan con OR
-- Si hay dos políticas y ambas fallan, el acceso se deniega
SELECT 
    'Análisis de políticas' as check_type,
    'courses_admin_all' as policy_name,
    public.is_admin_or_manager_safe() as policy_result,
    CASE WHEN public.is_admin_or_manager_safe() THEN '✅ PASS' ELSE '❌ FAIL' END as status
UNION ALL
SELECT 
    'Análisis de políticas' as check_type,
    'courses_owner_rw' as policy_name,
    (EXISTS (SELECT 1 FROM public.courses WHERE id = 12 AND teacher_id = auth.uid())) as policy_result,
    CASE WHEN EXISTS (SELECT 1 FROM public.courses WHERE id = 12 AND teacher_id = auth.uid()) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- =====================================================
-- 7. RECOMENDACIÓN
-- =====================================================

DO $$
DECLARE
    v_user_role TEXT;
    v_is_admin_or_manager BOOLEAN;
    v_is_owner BOOLEAN;
BEGIN
    -- Obtener rol del usuario
    SELECT r.name INTO v_user_role
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid();
    
    -- Verificar funciones
    v_is_admin_or_manager := public.is_admin_or_manager_safe();
    v_is_owner := EXISTS (SELECT 1 FROM public.courses WHERE id = 12 AND teacher_id = auth.uid());
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNÓSTICO COMPLETO:';
    RAISE NOTICE '  Usuario: %', auth.uid();
    RAISE NOTICE '  Rol: %', v_user_role;
    RAISE NOTICE '  is_admin_or_manager_safe(): %', v_is_admin_or_manager;
    RAISE NOTICE '  Es dueño del curso 12: %', v_is_owner;
    RAISE NOTICE '';
    
    IF v_is_admin_or_manager THEN
        RAISE NOTICE '✅ Deberías poder editar cursos';
        RAISE NOTICE '   Si no puedes, verifica que la política courses_admin_all existe';
    ELSIF v_is_owner THEN
        RAISE NOTICE '✅ Deberías poder editar el curso 12 (eres dueño)';
    ELSE
        RAISE NOTICE '❌ NO deberías poder editar cursos';
        RAISE NOTICE '   - No eres admin/manager';
        RAISE NOTICE '   - No eres dueño del curso';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

