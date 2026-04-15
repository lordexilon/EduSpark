-- 163_diagnose_material_access.sql
-- Diagnosticar acceso al material específico que falla

DO $$
DECLARE
    v_material_id UUID := '06958fd7-e6c6-4baa-8ed0-4310f59cd654';
    v_material_exists BOOLEAN;
    v_course_id BIGINT;
    v_teacher_id UUID;
    v_policy_rec RECORD;
BEGIN
    -- 1. Verificar si el material existe (bypass RLS)
    SELECT EXISTS (SELECT 1 FROM public.materials WHERE id = v_material_id) INTO v_material_exists;
    
    RAISE NOTICE 'Material % existe: %', v_material_id, v_material_exists;
    
    IF v_material_exists THEN
        -- 2. Obtener detalles del curso asociado
        SELECT course_id INTO v_course_id FROM public.materials WHERE id = v_material_id;
        RAISE NOTICE 'Course ID: %', v_course_id;
        
        IF v_course_id IS NOT NULL THEN
            SELECT teacher_id INTO v_teacher_id FROM public.courses WHERE id = v_course_id;
            RAISE NOTICE 'Teacher ID del curso: %', v_teacher_id;
            
            -- Aquí no podemos saber el auth.uid() exacto del usuario que falló, 
            -- pero podemos verificar si el teacher_id tiene rol admin-campus
            
            -- Verificar rol del teacher
            DECLARE
                v_role_name TEXT;
            BEGIN
                SELECT r.name INTO v_role_name
                FROM public.users u
                JOIN public.roles r ON u.role_id = r.id
                WHERE u.id = v_teacher_id;
                
                RAISE NOTICE 'Rol del teacher: %', v_role_name;
            END;
        ELSE
            RAISE NOTICE 'El material no tiene course_id asociado';
        END IF;
    END IF;
    
    -- 3. Verificar políticas RLS actuales
    RAISE NOTICE 'Políticas RLS en materials:';
    FOR v_policy_rec IN 
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'materials'
    LOOP
        RAISE NOTICE '% (%): %', v_policy_rec.policyname, v_policy_rec.cmd, v_policy_rec.qual;
    END LOOP;

END $$;
