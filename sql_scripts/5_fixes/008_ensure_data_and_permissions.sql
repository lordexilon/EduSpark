-- =====================================================
-- FIX FINAL: Garantizar Datos y Acceso para Admin Campus
-- =====================================================

DO $$
DECLARE
    v_inst_id INTEGER := 2; -- ID de tu institución (Cacavelos)
    v_course_id UUID;
    v_user_id UUID;
    v_teacher_id UUID;
BEGIN
    -- 1. Obtener tu ID de usuario (ejecutando como usuario autenticado o tomando uno admin)
    -- Para este script SQL manual, intentaremos buscar un teacher o admin de la institución
    SELECT user_id INTO v_teacher_id 
    FROM user_institutions 
    WHERE institution_id = v_inst_id 
    LIMIT 1;

    IF v_teacher_id IS NULL THEN
        RAISE NOTICE 'No se encontró profesor para la institución %', v_inst_id;
        -- Intentar usar auth.uid() si está disponible, sino fallar
        v_teacher_id := auth.uid();
    END IF;

    -- 2. Asegurar que existe al menos UN curso activo
    INSERT INTO courses (
        title, 
        code, 
        description, 
        institution_id, 
        teacher_id, 
        status
    ) VALUES (
        'Curso Demo Tutor IA',
        'DEMO-001',
        'Curso generado automáticamente para validar la visibilidad del Tutor.',
        v_inst_id,
        v_teacher_id,
        'active'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_course_id;

    -- Si no se insertó (ya existía o conflicto no capturado), buscar uno existente
    IF v_course_id IS NULL THEN
        SELECT id INTO v_course_id FROM courses 
        WHERE institution_id = v_inst_id AND status = 'active'
        LIMIT 1;
    END IF;

    RAISE NOTICE 'Usando Curso ID: %', v_course_id;

    -- 3. Asegurar que tiene configuración pedagógica (Tutor visible)
    IF v_course_id IS NOT NULL THEN
        INSERT INTO course_pedagogical_settings (
            course_id,
            teacher_id,
            voice_name,
            tone_preference
        ) VALUES (
            v_course_id,
            v_teacher_id,
            'Athena', -- Nombre del tutor que debería aparecer
            'motivador'
        )
        ON CONFLICT (course_id) DO UPDATE 
        SET voice_name = 'Athena';
        
        RAISE NOTICE '✅ Configuración de Tutor asegurada para el curso.';
    END IF;

END $$;

-- 4. REFUERZO DE PÓLIZA (Hard Fix)
-- Crear una política que NO dependa de funciones complejas para admin-campus solo por si acaso
DROP POLICY IF EXISTS "admin_campus_simple_select" ON public.courses;

CREATE POLICY "admin_campus_simple_select" ON public.courses
FOR SELECT
TO authenticated
USING (
    -- Si el usuario tiene institución X en user_institutions, puede ver cursos de institución X
    institution_id IN (
        SELECT institution_id 
        FROM public.user_institutions 
        WHERE user_id = auth.uid()
    )
    AND
    -- Y el usuario tiene rol admin-campus (verificando en roles/users)
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name IN ('admin-campus', 'coordinator', 'supervisor')
    )
);

RAISE NOTICE '✅ Política de acceso directo aplicada.';
