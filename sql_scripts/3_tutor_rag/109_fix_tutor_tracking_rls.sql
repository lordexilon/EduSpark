-- 109_fix_tutor_tracking_rls.sql
-- Corregir políticas RLS para permitir que los estudiantes inserten sus propias interacciones del tutor
-- y actualicen sus métricas de rendimiento

-- 1. Eliminar políticas existentes de INSERT para tutor_interactions
DROP POLICY IF EXISTS "System can insert tutor interactions" ON tutor_interactions;
DROP POLICY IF EXISTS "Students can insert their own tutor interactions" ON tutor_interactions;

-- 2. Crear política que permite a los estudiantes insertar sus propias interacciones
CREATE POLICY "Students can insert their own tutor interactions"
    ON tutor_interactions FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- 3. Verificar si existe un trigger que actualiza student_tutor_performance
-- Si existe, necesitamos permitir INSERT/UPDATE en esa tabla también

-- 4. Eliminar políticas existentes de INSERT/UPDATE para student_tutor_performance
DROP POLICY IF EXISTS "System can insert student performance" ON student_tutor_performance;
DROP POLICY IF EXISTS "System can update student performance" ON student_tutor_performance;
DROP POLICY IF EXISTS "Students can insert their own performance" ON student_tutor_performance;
DROP POLICY IF EXISTS "Students can update their own performance" ON student_tutor_performance;

-- 5. Crear políticas que permiten a los estudiantes insertar/actualizar sus propias métricas
CREATE POLICY "Students can insert their own performance"
    ON student_tutor_performance FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own performance"
    ON student_tutor_performance FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- 6. También permitir que el sistema (service role) pueda insertar/actualizar
-- Esto es útil si hay triggers o funciones que actualizan automáticamente
-- Nota: Esto requiere service_role, pero es seguro porque solo afecta a los datos del estudiante autenticado
-- En realidad, los triggers se ejecutan con los permisos del usuario que hace la inserción,
-- así que si un estudiante inserta, el trigger se ejecuta con sus permisos

-- 7. Verificar las políticas creadas
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
WHERE tablename IN ('tutor_interactions', 'student_tutor_performance')
ORDER BY tablename, policyname;

