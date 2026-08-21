-- Restore the identity tables required by the EduSpark frontend.
-- This is safe for an existing local database: it only creates missing objects
-- and synchronizes auth.users into public.users.

CREATE TABLE IF NOT EXISTS public.roles (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (id, name, description) VALUES
    (1, 'student', 'Estudiante'),
    (2, 'teacher', 'Docente'),
    (3, 'admin', 'Administrador')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    role_id INTEGER REFERENCES public.roles(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    avatar_url TEXT,
    identity_document VARCHAR(50),
    identity_document_type VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_institutions (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, institution_id)
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.institutions, public.roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_institutions TO authenticated;

DROP POLICY IF EXISTS "authenticated_read_institutions" ON public.institutions;
CREATE POLICY "authenticated_read_institutions" ON public.institutions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_roles" ON public.roles;
CREATE POLICY "authenticated_read_roles" ON public.roles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_read_own_profile" ON public.users;
CREATE POLICY "users_read_own_profile" ON public.users
    FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
CREATE POLICY "users_update_own_profile" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "user_institutions_read_own" ON public.user_institutions;
CREATE POLICY "user_institutions_read_own" ON public.user_institutions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        COALESCE((NEW.raw_user_meta_data ->> 'role_id')::INTEGER, 1),
        NEW.email_confirmed_at IS NOT NULL
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, created_at, updated_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(au.raw_user_meta_data ->> 'last_name', ''),
    CASE WHEN au.email = 'albertovillalba@gmail.com' THEN 3 ELSE 1 END,
    au.email_confirmed_at IS NOT NULL,
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();

INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
SELECT u.id, 1, true
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id
)
ON CONFLICT (user_id, institution_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
