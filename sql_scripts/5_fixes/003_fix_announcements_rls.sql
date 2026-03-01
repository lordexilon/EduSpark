-- Corrige la política RLS para permitir que admin-campus y supervisor creen avisos
-- Anteriormente solo permitía admin, teacher y coordinator

BEGIN;

-- Eliminar la política anterior restrictiva
DROP POLICY IF EXISTS "Teachers and admins can create announcements" ON public.announcements;

-- Crear nueva política más inclusiva usando nombres de roles para mayor seguridad y claridad
CREATE POLICY "Staff can create announcements"
ON public.announcements FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'teacher', 'admin-campus', 'coordinator', 'supervisor')
    )
);

-- Asegurarse también de que puedan actualizar sus propios avisos (la política existente ya cubre esto por author_id)
-- "Authors can update their announcements" USING (author_id = auth.uid())

-- Asegurarse de que puedan eliminar sus propios avisos (la política existente ya cubre esto)
-- "Authors and admins can delete announcements"

COMMIT;
