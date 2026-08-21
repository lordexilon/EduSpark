-- Migración: Reparación de Identidad de Administrador y Estabilización de Auditoría
-- Objetivo: Asegurar que el administrador actual esté en public.users para que los joins de auditoría no fallen.
-- NOTA: public.users es creado por el ORM de la app (Prisma/Knex), no por migraciones de Supabase.

DO $$
BEGIN
    -- Solo ejecutar si public.users existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE 'Table public.users does not exist yet (created by app ORM), skipping admin identity fix';
        RETURN;
    END IF;

    -- 1. Insertar/Actualizar el perfil del administrador actual si falta
    BEGIN
        INSERT INTO public.users (id, email, first_name, last_name, role_id, is_active)
        VALUES (
            'b72dabe7-9ace-4e50-aa17-f770c5c94c0e', 
            'admin@eduspark.com',
            'Admin', 
            'Sistema', 
            (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1),
            true
        )
        ON CONFLICT (id) DO UPDATE SET 
            role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1),
            is_active = true;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not insert into public.users: %', SQLERRM;
    END;

    -- 2. Vincular a la institución por defecto si no tiene una
    BEGIN
        INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
        SELECT 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e', id, true 
        FROM public.institutions 
        WHERE id = 5
        ON CONFLICT (user_id, institution_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not insert into user_institutions: %', SQLERRM;
    END;

    -- 3. Ajustar la FK de auditoría
    BEGIN
        ALTER TABLE public.audit_logs 
        DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey,
        ADD CONSTRAINT audit_logs_actor_id_fkey 
            FOREIGN KEY (actor_id) 
            REFERENCES public.users(id) 
            ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not alter audit_logs FK: %', SQLERRM;
    END;
END;
$$;
