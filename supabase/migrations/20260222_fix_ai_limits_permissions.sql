-- MODIFICACIÓN DE POLÍTICAS DE RLS PARA AI_LIMITS
-- Objetivo: Restringir el acceso total solo a Administradores Globales (admin)
-- y evitar que admin-campus pueda modificar límites globales.

-- 1. Eliminar la política anterior sobre-permisiva
DROP POLICY IF EXISTS "Admins full access" ON public.ai_limits;

-- 2. Crear política para Administradores Globales (Acceso Total)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE POLICY "Global Admins full access" ON public.ai_limits FOR ALL
            USING (
                auth.uid() IN (
                    SELECT u.id FROM public.users u
                    JOIN public.roles r ON u.role_id = r.id
                    WHERE r.name = 'admin'
                )
            );
    ELSE
        CREATE POLICY "Global Admins full access" ON public.ai_limits FOR ALL
            USING (true);
    END IF;
END;
$$;

-- 3. Crear política para Administradores de Campus (Sólo lectura de su institución - Proyectado)
-- Por ahora solo permitimos lectura si el scope es su institución o si es para visualización general
-- pero sin permisos de edición global.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE POLICY "Campus Admins view access" ON public.ai_limits FOR SELECT
            USING (
                auth.uid() IN (
                    SELECT u.id FROM public.users u
                    JOIN public.roles r ON u.role_id = r.id
                    WHERE r.name = 'admin-campus'
                ) 
                AND (
                    scope = 'institution' AND scope_id IN (SELECT institution_id FROM public.users WHERE id = auth.uid())
                    OR scope = 'global'
                )
            );
    ELSE
        CREATE POLICY "Campus Admins view access" ON public.ai_limits FOR SELECT
            USING (true);
    END IF;
END;
$$;

-- NOTA: Esto asegura que el botón de "Cerrar Grifo Global" falle en el backend para un admin-campus
-- incluso si logra saltarse la validación del frontend.
