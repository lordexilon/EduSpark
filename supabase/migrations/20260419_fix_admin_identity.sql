-- Migración: Reparación de Identidad de Administrador y Estabilización de Auditoría
-- Objetivo: Asegurar que el administrador actual esté en public.users para que los joins de auditoría no fallen.

BEGIN;

-- 1. Asegurar que el rol 'admin' tenga el ID correcto (usualmente 1 en este sistema)
-- (No cambiamos IDs, solo verificamos nombres)

-- 2. Insertar/Actualizar el perfil del administrador actual si falta
-- Nota: Usamos el ID que vemos en tu consola: b72dabe7-9ace-4e50-aa17-f770c5c94c0e
INSERT INTO public.users (id, email, first_name, last_name, role_id, is_active)
VALUES (
    'b72dabe7-9ace-4e50-aa17-f770c5c94c0e', 
    'admin@eduspark.com', -- Email genérico si no lo sabemos, se actualizará al loguear
    'Admin', 
    'Sistema', 
    (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1),
    true
)
ON CONFLICT (id) DO UPDATE SET 
    role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1),
    is_active = true;

-- 3. Vincular a la institución por defecto si no tiene una
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
SELECT 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e', id, true 
FROM public.institutions 
WHERE id = 5 -- La que aparece en tu log
ON CONFLICT (user_id, institution_id) DO NOTHING;

-- 4. Ajustar la vista de auditoría para que sea más robusta ante nulos
-- (Ya lo corregimos en el frontend, esto es solo preventivo en la relación FK)
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey,
ADD CONSTRAINT audit_logs_actor_id_fkey 
    FOREIGN KEY (actor_id) 
    REFERENCES public.users(id) 
    ON DELETE SET NULL;

COMMIT;
