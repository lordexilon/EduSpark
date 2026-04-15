-- Script para crear un usuario administrador de prueba
-- Ejecutar en el SQL Editor de Supabase

-- 1. Primero, crear el usuario en auth.users (esto normalmente se hace desde la interfaz de Supabase)
-- Para este ejemplo, asumimos que ya existe un usuario en auth.users con ID específico

-- 2. Insertar el usuario administrador en public.users
-- Reemplaza 'USER_ID_FROM_AUTH_USERS' con el ID real del usuario de auth.users

INSERT INTO public.users (id, email, first_name, last_name, role_id)
VALUES (
    'USER_ID_FROM_AUTH_USERS', -- Reemplazar con ID real
    'admin@eduspark.com',
    'Admin',
    'Sistema',
    1 -- ID del rol 'admin' (verificar en tabla roles)
)
ON CONFLICT (id) DO UPDATE SET
    role_id = 1,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- 3. Verificar que el usuario fue creado correctamente
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'admin@eduspark.com';

-- 4. Ver todos los roles disponibles
SELECT * FROM public.roles ORDER BY id;
