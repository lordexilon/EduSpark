-- Diagnostic Script: Check Visible Careers
-- Date: 2026-02-19
-- Description: Diagnoses why user sees careers from other institutions.

-- 1. Get info about the current user "Enzo" (Using the ID from the logs: 502233ed-a7cd-4362-82ce-94ac80e785dd)
DO $$
DECLARE
    target_user_id UUID := '502233ed-a7cd-4362-82ce-94ac80e785dd';
    user_role TEXT;
    inst_name TEXT;
    inst_id BIGINT;
    visible_careers_count INTEGER;
BEGIN
    -- Get Role
    SELECT r.name INTO user_role 
    FROM public.users u JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = target_user_id;

    -- Get Institution
    SELECT i.name, i.id INTO inst_name, inst_id
    FROM public.user_institutions ui 
    JOIN public.institutions i ON ui.institution_id = i.id 
    WHERE ui.user_id = target_user_id AND ui.is_primary = true;

    RAISE NOTICE 'User: Enzo (ID: %), Role: %, Institution: % (ID: %)', target_user_id, user_role, inst_name, inst_id;

    -- 2. Simulate RLS Check for Careers
    -- We can't actually impersonate in DO block easily for RLS, but we can check the data conditions manually
    
    -- Count careers linked to this institution
    SELECT COUNT(*) INTO visible_careers_count 
    FROM public.careers 
    WHERE institution_id = inst_id;
    
    RAISE NOTICE 'Careers directly linked to Institution %: %', inst_id, visible_careers_count;
    
    -- Count careers with NO institution (Global?)
    SELECT COUNT(*) INTO visible_careers_count 
    FROM public.careers 
    WHERE institution_id IS NULL;
    
    RAISE NOTICE 'Careers with NO Institution (NULL): %', visible_careers_count;
    
    -- List the careers visible (simulation)
    FOR visible_careers_count IN (SELECT id FROM public.careers) LOOP
        -- Just iterating to show we can access them if RLS was off
    END LOOP;
END $$;

-- 3. Actual Query to inspect data
SELECT id, name, code, institution_id 
FROM public.careers 
ORDER BY name;
