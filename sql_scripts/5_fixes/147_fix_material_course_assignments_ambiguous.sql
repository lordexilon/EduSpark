-- =====================================================
-- Script: 147_fix_material_course_assignments_ambiguous.sql
-- Fecha: Enero 2025
-- Descripción: Corregir ambigüedad en políticas RLS de material_course_assignments
-- =====================================================
--
-- PROBLEMA:
-- El error "column reference 'course_id' is ambiguous" ocurría cuando PostgreSQL
-- no podía determinar de qué tabla provenía course_id en las políticas RLS durante
-- la evaluación de INSERTs en la función assign_material_to_courses.
--
-- CAUSA RAÍZ:
-- Las políticas RLS con JOINs complejos y múltiples referencias a course_id causaban
-- ambigüedad cuando PostgreSQL evaluaba las políticas durante operaciones INSERT.
-- Esto ocurría especialmente en funciones SECURITY DEFINER que insertan datos.
--
-- SOLUCIÓN:
-- Se implementaron funciones auxiliares que encapsulan la lógica de verificación de
-- permisos, eliminando JOINs complejos de las políticas RLS y pasando course_id
-- explícitamente como parámetro, evitando cualquier ambigüedad.
--
-- BENEFICIOS:
-- 1. Elimina ambigüedad: course_id se pasa explícitamente como parámetro
-- 2. Mejora rendimiento: funciones pueden ser optimizadas y cacheadas
-- 3. Código más limpio: políticas RLS más simples y legibles
-- 4. Mantenibilidad: lógica de permisos centralizada en funciones reutilizables
--
-- FUNCIONES CREADAS:
-- - is_course_teacher(p_course_id INTEGER): Verifica si el usuario es profesor del curso
-- - has_institution_access_to_course(p_course_id INTEGER): Verifica acceso de institución
--
-- POLÍTICAS ACTUALIZADAS:
-- - teachers_manage_material_assignments: Usa is_course_teacher()
-- - institution_access_material_assignments: Usa has_institution_access_to_course()
--
-- FUNCIÓN ACTUALIZADA:
-- - assign_material_to_courses: Mejorada para usar INSERT...SELECT y evitar ambigüedad
--
-- =====================================================

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función auxiliar para verificar si el usuario es profesor del curso
-- Parámetros:
--   p_course_id: ID del curso a verificar
-- Retorna: TRUE si el usuario actual es profesor del curso, FALSE en caso contrario
CREATE OR REPLACE FUNCTION public.is_course_teacher(p_course_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE courses.id = p_course_id
      AND courses.teacher_id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
  );
$$;

COMMENT ON FUNCTION public.is_course_teacher(INTEGER) IS 
'Verifica si el usuario autenticado es profesor del curso especificado. 
Usado en políticas RLS para evitar ambigüedad en referencias a course_id.';

-- Función auxiliar para verificar acceso de institución
-- Parámetros:
--   p_course_id: ID del curso a verificar
-- Retorna: TRUE si el usuario tiene acceso de institución (admin-campus o coordinator)
--          y pertenece a la misma institución que el curso, FALSE en caso contrario
CREATE OR REPLACE FUNCTION public.has_institution_access_to_course(p_course_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    JOIN public.user_institutions ui ON ui.user_id = u.id
    JOIN public.courses c ON c.id = p_course_id
    WHERE u.id = COALESCE(
      NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
      auth.uid()
    )
      AND r.name IN ('admin-campus', 'coordinator')
      AND u.is_active = true
      AND c.institution_id = ui.institution_id
  );
$$;

COMMENT ON FUNCTION public.has_institution_access_to_course(INTEGER) IS 
'Verifica si el usuario autenticado tiene acceso de institución al curso especificado.
Solo usuarios con roles admin-campus o coordinator de la misma institución del curso
tienen acceso. Usado en políticas RLS para evitar ambigüedad.';

-- =====================================================
-- ACTUALIZACIÓN DE POLÍTICAS RLS
-- =====================================================

-- 1. Política para profesores: gestionar asignaciones de sus propios cursos
-- Reemplaza la política anterior que tenía JOINs complejos con funciones auxiliares
DROP POLICY IF EXISTS "teachers_manage_material_assignments" ON public.material_course_assignments;
CREATE POLICY "teachers_manage_material_assignments"
ON public.material_course_assignments
FOR ALL
TO authenticated
USING (
  public.is_course_teacher(material_course_assignments.course_id)
)
WITH CHECK (
  public.is_course_teacher(material_course_assignments.course_id)
);

-- 2. Política para administradores de campus y coordinadores: acceso por institución
-- Reemplaza la política anterior que tenía JOINs complejos con funciones auxiliares
DROP POLICY IF EXISTS "institution_access_material_assignments" ON public.material_course_assignments;
CREATE POLICY "institution_access_material_assignments"
ON public.material_course_assignments
FOR ALL
TO authenticated
USING (
  public.has_institution_access_to_course(material_course_assignments.course_id)
)
WITH CHECK (
  public.has_institution_access_to_course(material_course_assignments.course_id)
);

-- =====================================================
-- ACTUALIZACIÓN DE FUNCIÓN PRINCIPAL
-- =====================================================

-- 3. Función assign_material_to_courses: Asignar material a múltiples cursos
-- Mejorada para usar INSERT...SELECT y evitar ambigüedad en políticas RLS
-- 
-- Parámetros:
--   p_material_id: UUID del material a asignar
--   p_course_ids: Array de IDs de cursos a los que asignar el material
--   p_assigned_by: UUID del usuario que realiza la asignación
--   p_notes: Notas opcionales sobre la asignación
--
-- Retorna: Tabla con resultados por cada curso:
--   - success: TRUE si la asignación fue exitosa
--   - course_id: ID del curso procesado
--   - course_title: Título del curso
--   - error_message: Mensaje de error si hubo algún problema
--
-- Notas:
--   - La función verifica permisos antes de insertar
--   - Las políticas RLS también se evalúan automáticamente
--   - Usa INSERT...SELECT con NOT EXISTS para evitar duplicados
--   - Maneja errores por curso individualmente sin detener el proceso completo
CREATE OR REPLACE FUNCTION public.assign_material_to_courses(
    p_material_id UUID,
    p_course_ids INTEGER[],
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    course_id INTEGER,
    course_title TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_id INTEGER;
    v_course_title TEXT;
    v_course_teacher_id UUID;
    v_user_id UUID;
    v_mca_course_id INTEGER;
BEGIN
    -- Obtener el ID del usuario actual una sola vez
    v_user_id := COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
    );
    
    FOREACH v_course_id IN ARRAY p_course_ids
    LOOP
        BEGIN
            -- Verificar que el curso existe y obtener título y teacher_id
            SELECT c.title, c.teacher_id INTO v_course_title, v_course_teacher_id
            FROM public.courses c
            WHERE c.id = v_course_id;
            
            IF v_course_title IS NULL THEN
                RETURN QUERY SELECT false, v_course_id, NULL::TEXT, 'Curso no encontrado'::TEXT;
                CONTINUE;
            END IF;
            
            -- Verificar permisos: el usuario debe ser el profesor del curso
            IF v_course_teacher_id != v_user_id THEN
                RETURN QUERY SELECT false, v_course_id, v_course_title, 'No tiene permisos para asignar a este curso'::TEXT;
                CONTINUE;
            END IF;
            
            -- Usar variable local para evitar ambigüedad
            v_mca_course_id := v_course_id;
            
            -- Insertar asignación usando INSERT...SELECT para mayor control
            INSERT INTO public.material_course_assignments (
                material_id, 
                course_id, 
                assigned_by, 
                notes
            )
            SELECT 
                p_material_id::UUID, 
                v_mca_course_id::INTEGER, 
                p_assigned_by::UUID, 
                p_notes::TEXT
            WHERE NOT EXISTS (
                SELECT 1 
                FROM public.material_course_assignments mca
                WHERE mca.material_id = p_material_id
                  AND mca.course_id = v_mca_course_id
            );
            
            RETURN QUERY SELECT true, v_course_id, v_course_title, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT false, v_course_id, NULL::TEXT, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.assign_material_to_courses(UUID, INTEGER[], UUID, TEXT) IS 
'Asigna un material a múltiples cursos. 
Corregido para evitar ambigüedad en políticas RLS usando funciones auxiliares.
La función verifica permisos antes de insertar y maneja errores por curso individualmente.
Retorna resultados detallados para cada curso procesado.';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- 
-- VERIFICACIÓN POST-EJECUCIÓN:
-- 1. Verificar que las funciones auxiliares se crearon correctamente:
--    SELECT proname FROM pg_proc WHERE proname IN ('is_course_teacher', 'has_institution_access_to_course');
--
-- 2. Verificar que las políticas RLS se actualizaron:
--    SELECT policyname FROM pg_policies WHERE tablename = 'material_course_assignments';
--
-- 3. Probar la función con un material y curso válidos:
--    SELECT * FROM assign_material_to_courses(
--      'material-uuid'::uuid,
--      ARRAY[1]::integer[],
--      'user-uuid'::uuid,
--      'Notas de prueba'::text
--    );
--
-- NOTAS IMPORTANTES:
-- - Este script es idempotente: puede ejecutarse múltiples veces sin problemas
-- - Las funciones auxiliares son reutilizables en otras políticas RLS si es necesario
-- - Si se necesita agregar más roles con acceso, actualizar has_institution_access_to_course()
-- =====================================================

