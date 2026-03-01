-- 143_fix_tutor_rls_policies.sql
-- Corregir políticas RLS para tutor_interactions y student_tutor_performance
-- Permitir que estudiantes autenticados puedan insertar sus propias interacciones

-- =====================================================
-- 1. HABILITAR RLS EN LAS TABLAS
-- =====================================================
ALTER TABLE IF EXISTS public.tutor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_tutor_performance ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ELIMINAR POLÍTICAS EXISTENTES (si existen)
-- =====================================================
DROP POLICY IF EXISTS "Students can insert their own tutor interactions" ON public.tutor_interactions;
DROP POLICY IF EXISTS "Students can view their own tutor interactions" ON public.tutor_interactions;
DROP POLICY IF EXISTS "Teachers can view interactions in their courses" ON public.tutor_interactions;
DROP POLICY IF EXISTS "Admins can view all tutor interactions" ON public.tutor_interactions;
DROP POLICY IF EXISTS "System can insert tutor interactions" ON public.tutor_interactions;

DROP POLICY IF EXISTS "Students can insert their own performance" ON public.student_tutor_performance;
DROP POLICY IF EXISTS "Students can update their own performance" ON public.student_tutor_performance;
DROP POLICY IF EXISTS "Students can view their own performance" ON public.student_tutor_performance;
DROP POLICY IF EXISTS "Teachers can view performance metrics in their courses" ON public.student_tutor_performance;
DROP POLICY IF EXISTS "Admins can view all performance metrics" ON public.student_tutor_performance;
DROP POLICY IF EXISTS "System can insert student performance" ON public.student_tutor_performance;
DROP POLICY IF EXISTS "System can update student performance" ON public.student_tutor_performance;

-- =====================================================
-- 3. POLÍTICAS PARA tutor_interactions
-- =====================================================

-- Estudiantes pueden INSERTAR sus propias interacciones
CREATE POLICY "Students can insert their own tutor interactions"
    ON public.tutor_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Estudiantes pueden VER sus propias interacciones
CREATE POLICY "Students can view their own tutor interactions"
    ON public.tutor_interactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Docentes pueden VER interacciones de sus cursos
CREATE POLICY "Teachers can view interactions in their courses"
    ON public.tutor_interactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = tutor_interactions.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores pueden VER todas las interacciones
CREATE POLICY "Admins can view all tutor interactions"
    ON public.tutor_interactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON r.id = u.role_id
            WHERE u.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =====================================================
-- 4. POLÍTICAS PARA student_tutor_performance
-- =====================================================

-- Estudiantes pueden INSERTAR sus propias métricas
CREATE POLICY "Students can insert their own performance"
    ON public.student_tutor_performance
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Estudiantes pueden ACTUALIZAR sus propias métricas
CREATE POLICY "Students can update their own performance"
    ON public.student_tutor_performance
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Estudiantes pueden VER sus propias métricas
CREATE POLICY "Students can view their own performance"
    ON public.student_tutor_performance
    FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Docentes pueden VER métricas de sus cursos
CREATE POLICY "Teachers can view performance metrics in their courses"
    ON public.student_tutor_performance
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = student_tutor_performance.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores pueden VER todas las métricas
CREATE POLICY "Admins can view all performance metrics"
    ON public.student_tutor_performance
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON r.id = u.role_id
            WHERE u.id = auth.uid()
            AND r.name = 'admin'
        )
    );

-- =====================================================
-- 5. PERMISOS PARA FUNCIÓN RPC update_user_query_usage
-- =====================================================
-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.update_user_query_usage(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_query_usage(UUID, NUMERIC) TO anon;

-- =====================================================
-- 6. POLÍTICAS PARA user_query_limits (si existe la tabla)
-- =====================================================
-- Habilitar RLS si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_query_limits') THEN
        ALTER TABLE public.user_query_limits ENABLE ROW LEVEL SECURITY;
        
        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "Users can view their own limits" ON public.user_query_limits;
        DROP POLICY IF EXISTS "Users can update their own limits" ON public.user_query_limits;
        DROP POLICY IF EXISTS "Users can insert their own limits" ON public.user_query_limits;
        
        -- Crear políticas
        CREATE POLICY "Users can view their own limits"
            ON public.user_query_limits
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own limits"
            ON public.user_query_limits
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own limits"
            ON public.user_query_limits
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- =====================================================
-- 7. VERIFICAR POLÍTICAS CREADAS
-- =====================================================
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('tutor_interactions', 'student_tutor_performance', 'user_query_limits')
ORDER BY tablename, policyname;

