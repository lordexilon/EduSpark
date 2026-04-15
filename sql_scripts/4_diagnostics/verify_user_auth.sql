-- Verificar existencia de usuario albertovillalba@gmail.com en Supabase

-- 1. Verificar en la tabla de usuarios (public.users)
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    is_active,
    created_at,
    updated_at
FROM public.users
WHERE email = 'albertovillalba@gmail.com';

-- 2. Verificar en auth.users (tabla de autenticación de Supabase)
-- NOTA: Esta consulta solo funciona con permisos de service_role
SELECT 
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at,
    banned_until,
    deleted_at
FROM auth.users
WHERE email = 'albertovillalba@gmail.com';

-- 3. Verificar si el usuario tiene un rol asignado
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.id as role_id,
    r.name as role_name,
    u.is_active
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'albertovillalba@gmail.com';

-- 4. Verificar si hay problemas con el email (espacios, mayúsculas, etc.)
SELECT 
    id,
    email,
    LOWER(TRIM(email)) as normalized_email,
    LENGTH(email) as email_length,
    is_active
FROM public.users
WHERE LOWER(TRIM(email)) = 'albertovillalba@gmail.com';

-- 5. Buscar emails similares (en caso de typo)
SELECT 
    id,
    email,
    first_name,
    last_name,
    is_active
FROM public.users
WHERE email ILIKE '%albertovillalba%'
   OR email ILIKE '%alberto%villalba%';

