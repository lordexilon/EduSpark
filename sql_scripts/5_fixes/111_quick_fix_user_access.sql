-- =====================================================
-- SOLUCIÓN RÁPIDA: Asignar institución al usuario actual
-- =====================================================
-- Este script asigna la institución 1 al usuario actual
-- (ajusta el institution_id según necesites)

-- 1. Verificar usuario actual
SELECT 
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- 2. Verificar si existe en public.users
DO $$
DECLARE
    v_user_exists BOOLEAN;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE NOTICE 'Usuario no existe en public.users. Creándolo...';
        
        -- Crear usuario en public.users desde auth.users
        INSERT INTO public.users (id, email, role_id, is_active)
        SELECT 
            au.id,
            au.email,
            (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1), -- Cambiar 'admin' por el rol que necesites
            true
        FROM auth.users au
        WHERE au.id = v_user_id
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Usuario creado en public.users';
    ELSE
        RAISE NOTICE 'Usuario ya existe en public.users';
    END IF;
END $$;

-- 3. Asignar institución al usuario (institución 1)
-- Si necesitas otra institución, cambia el 1 por el ID correcto
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
VALUES (auth.uid(), 1, true)
ON CONFLICT (user_id, institution_id) 
DO UPDATE SET is_primary = true;

-- 4. Verificar resultado
SELECT 
    'Usuario configurado' as status,
    u.id,
    u.email,
    r.name as role_name,
    ui.institution_id,
    i.name as institution_name,
    public.is_admin_safe() as is_admin,
    public.is_admin_campus_safe() as is_admin_campus,
    public.is_coordinator_safe() as is_coordinator,
    public.get_user_institution_id() as my_institution_id
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.id = auth.uid();

-- 5. Verificar acceso a documentos
SELECT 
    'Documentos accesibles' as check_type,
    COUNT(*) as count
FROM processed_documents
WHERE 
    public.is_admin_safe()
    OR (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
    OR (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
    OR (institution_id = public.get_user_institution_id());

-- Notificación final
DO $$
BEGIN
    RAISE NOTICE '✅ Script completado';
    RAISE NOTICE '   - Usuario verificado/creado en public.users';
    RAISE NOTICE '   - Institución asignada';
    RAISE NOTICE '   - Verifica los resultados arriba para confirmar acceso';
END $$;

