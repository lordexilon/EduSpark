-- Script para sincronizar usuarios de auth.users a public.users
-- Ejecutar en el SQL Editor de Supabase

-- 1. Ver usuarios en auth.users
SELECT id, email, raw_user_meta_data, created_at 
FROM auth.users 
ORDER BY created_at DESC LIMIT 5;

-- 2. Insertar usuarios faltantes en public.users
INSERT INTO public.users (id, email, first_name, last_name, role_id)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE((au.raw_user_meta_data->>'role_id')::integer, 3) -- Default: student
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 3. Verificar usuarios insertados
SELECT * FROM public.users ORDER BY created_at DESC LIMIT 5;
