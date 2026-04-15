-- =====================================================
-- DIAGNÓSTICO Y SOLUCIÓN: Usuario sin acceso a documentos
-- =====================================================

-- 1. Verificar si el usuario actual existe en la tabla users
SELECT 
    'Usuario en auth.users' as check_type,
    id,
    email,
    created_at
FROM auth.users
WHERE id = auth.uid();

-- 2. Verificar si el usuario existe en public.users
SELECT 
    'Usuario en public.users' as check_type,
    u.id,
    u.email,
    u.role_id,
    r.name as role_name,
    u.is_active
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.id = auth.uid();

-- 3. Verificar si el usuario tiene institución asignada
SELECT 
    'Institución del usuario' as check_type,
    ui.user_id,
    ui.institution_id,
    ui.is_primary,
    i.name as institution_name
FROM public.user_institutions ui
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE ui.user_id = auth.uid();

-- 4. Verificar qué documentos debería poder ver
-- (esto fallará si no tiene institución, pero nos dirá el problema)
SELECT 
    'Documentos visibles' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN public.is_admin_safe() THEN 'Admin - todos los documentos'
        WHEN public.is_admin_campus_safe() AND public.get_user_institution_id() IS NOT NULL THEN 'Admin-campus - documentos de institución ' || public.get_user_institution_id()
        WHEN public.is_coordinator_safe() AND public.get_user_institution_id() IS NOT NULL THEN 'Coordinator - documentos de institución ' || public.get_user_institution_id()
        ELSE 'Sin acceso - verificar rol e institución'
    END as access_reason
FROM processed_documents
WHERE 
    public.is_admin_safe()
    OR (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
    OR (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
    OR (institution_id = public.get_user_institution_id());

-- 5. Verificar valores de las funciones helper
SELECT 
    'Funciones helper' as check_type,
    public.is_admin_safe() as is_admin,
    public.is_admin_campus_safe() as is_admin_campus,
    public.is_coordinator_safe() as is_coordinator,
    public.get_user_institution_id() as institution_id;

-- =====================================================
-- SOLUCIÓN: Si el usuario no tiene institución asignada
-- =====================================================

-- Si el usuario es admin, admin-campus o coordinator pero no tiene institución:
-- Opción A: Asignar institución 1 (ajustar según necesites)
/*
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
VALUES (auth.uid(), 1, true)
ON CONFLICT (user_id, institution_id) DO UPDATE SET is_primary = true;
*/

-- Opción B: Si el usuario no existe en public.users, crearlo desde auth.users
/*
INSERT INTO public.users (id, email, role_id, is_active)
SELECT 
    au.id,
    au.email,
    (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1), -- Ajustar rol según necesites
    true
FROM auth.users au
WHERE au.id = auth.uid()
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Después de ejecutar las soluciones, ejecutar esto para verificar:
/*
SELECT 
    u.id,
    u.email,
    r.name as role_name,
    ui.institution_id,
    i.name as institution_name,
    public.is_admin_safe() as can_see_all,
    public.get_user_institution_id() as my_institution_id,
    (SELECT COUNT(*) FROM processed_documents WHERE institution_id = public.get_user_institution_id()) as documents_in_my_institution
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.id = auth.uid();
*/

