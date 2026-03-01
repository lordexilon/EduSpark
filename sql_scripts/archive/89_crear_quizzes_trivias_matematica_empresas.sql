-- =====================================================
-- Script para crear Quizzes y Trivias del curso
-- "Matematica para Empresas 1" (course_id = 1)
-- =====================================================
-- Basado en las 4 unidades del curso:
-- 1. Expresiones Algebraicas
-- 2. Ecuaciones Lineales - Sistemas de Ecuaciones
-- 3. Progresiones Aritméticas y Geométricas
-- 4. Teoría de Conjuntos
-- =====================================================

DO $$
DECLARE
    v_course_id INTEGER;
    v_unit_1_id UUID;
    v_unit_2_id UUID;
    v_unit_3_id UUID;
    v_unit_4_id UUID;
    v_trivia_id UUID;
    v_quiz_1_id UUID;
    v_quiz_2_id UUID;
    v_quiz_3_id UUID;
    v_quiz_4_id UUID;
BEGIN
    -- Obtener el ID del curso "Matematica para Empresas 1"
    SELECT id INTO v_course_id
    FROM courses
    WHERE title ILIKE '%Matematica para Empresas%' OR title ILIKE '%Matemática para Empresas%'
    LIMIT 1;

    -- Si no se encuentra, usar course_id = 1 como fallback
    IF v_course_id IS NULL THEN
        v_course_id := 1;
    END IF;

    RAISE NOTICE 'Curso encontrado: ID = %', v_course_id;

    -- Obtener IDs de las unidades (asumiendo que existen)
    SELECT id INTO v_unit_1_id FROM course_units WHERE course_id = v_course_id AND number = 1 LIMIT 1;
    SELECT id INTO v_unit_2_id FROM course_units WHERE course_id = v_course_id AND number = 2 LIMIT 1;
    SELECT id INTO v_unit_3_id FROM course_units WHERE course_id = v_course_id AND number = 3 LIMIT 1;
    SELECT id INTO v_unit_4_id FROM course_units WHERE course_id = v_course_id AND number = 4 LIMIT 1;

    -- =====================================================
    -- TRIVIA GENERAL DEL CURSO
    -- =====================================================
    INSERT INTO assessments (
        id, course_id, unit_id, title, description, assessment_type,
        instructions, time_limit, max_attempts, passing_score, is_published,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        v_course_id,
        NULL, -- Trivia general, no está asociada a una unidad específica
        'Trivia General: Matemática para Empresas I',
        'Una trivia divertida para repasar conceptos generales del curso de Matemática para Empresas I. ¡Pon a prueba tus conocimientos!',
        'trivia',
        'Responde las preguntas de manera rápida y divertida. Esta trivia no tiene límite de intentos y está diseñada para reforzar tu aprendizaje de manera lúdica.',
        15, -- 15 minutos
        NULL, -- Intentos ilimitados
        50.0, -- Aprobar con 50%
        true, -- Publicado
        NOW(),
        NOW()
    ) RETURNING id INTO v_trivia_id;

    RAISE NOTICE 'Trivia general creada: ID = %', v_trivia_id;

    -- Preguntas de la Trivia General
    INSERT INTO questions (id, assessment_id, question_text, question_type, options, correct_answer, points, order_index, created_at)
    VALUES
        -- Pregunta 1: Verdadero/Falso
        (gen_random_uuid(), v_trivia_id, 'El álgebra es una rama de las matemáticas que utiliza símbolos y letras para representar números.', 'true_false', 
         '{"true": "Verdadero", "false": "Falso"}'::jsonb, 
         'true'::jsonb, 1.0, 1, NOW()),
        
        -- Pregunta 2: Opción Múltiple
        (gen_random_uuid(), v_trivia_id, '¿Qué representa una variable en el contexto empresarial?', 'multiple_choice',
         '{"A": "Un número fijo", "B": "Un número desconocido que puede variar", "C": "Una operación matemática", "D": "Un resultado final"}'::jsonb,
         '"B"'::jsonb, 1.0, 2, NOW()),
        
        -- Pregunta 3: Opción Múltiple
        (gen_random_uuid(), v_trivia_id, 'En la expresión algebraica I = px, ¿qué representa I?', 'multiple_choice',
         '{"A": "Inversión", "B": "Ingresos", "C": "Interés", "D": "Impuestos"}'::jsonb,
         '"B"'::jsonb, 1.0, 3, NOW()),
        
        -- Pregunta 4: Verdadero/Falso
        (gen_random_uuid(), v_trivia_id, 'Los términos semejantes tienen las mismas variables con los mismos exponentes.', 'true_false',
         '{"true": "Verdadero", "false": "Falso"}'::jsonb,
         'true'::jsonb, 1.0, 4, NOW()),
        
        -- Pregunta 5: Opción Múltiple
        (gen_random_uuid(), v_trivia_id, '¿Cuántas unidades tiene el curso de Matemática para Empresas I?', 'multiple_choice',
         '{"A": "2", "B": "3", "C": "4", "D": "5"}'::jsonb,
         '"C"'::jsonb, 1.0, 5, NOW());

    -- =====================================================
    -- QUIZ 1: EXPRESIONES ALGEBRAICAS
    -- =====================================================
    IF v_unit_1_id IS NOT NULL THEN
        INSERT INTO assessments (
            id, course_id, unit_id, title, description, assessment_type,
            instructions, time_limit, max_attempts, passing_score, is_published,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_course_id,
            v_unit_1_id,
            'Quiz Unidad 1: Expresiones Algebraicas',
            'Evalúa tu comprensión de los conceptos y procedimientos básicos del álgebra, operaciones con expresiones algebraicas y descomposición factorial.',
            'quiz',
            'Lee cada pregunta cuidadosamente. Este quiz evalúa tu dominio de expresiones algebraicas, operaciones básicas y factorización. Tienes 30 minutos para completarlo.',
            30, -- 30 minutos
            3, -- 3 intentos máximos
            70.0, -- Aprobar con 70%
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO v_quiz_1_id;

        RAISE NOTICE 'Quiz Unidad 1 creado: ID = %', v_quiz_1_id;

        -- Preguntas del Quiz 1
        INSERT INTO questions (id, assessment_id, question_text, question_type, options, correct_answer, points, order_index, created_at)
        VALUES
            -- Pregunta 1: Opción Múltiple
            (gen_random_uuid(), v_quiz_1_id, '¿Qué es una constante en el contexto empresarial?', 'multiple_choice',
             '{"A": "Un número que puede variar", "B": "Un número que no cambia, como costos fijos o tasas de interés", "C": "Una variable independiente", "D": "El resultado de una operación"}'::jsonb,
             '"B"'::jsonb, 2.0, 1, NOW()),
            
            -- Pregunta 2: Opción Múltiple
            (gen_random_uuid(), v_quiz_1_id, 'En la expresión 3x + 5x, ¿cuál es el resultado?', 'multiple_choice',
             '{"A": "8x", "B": "15x", "C": "8x²", "D": "15x²"}'::jsonb,
             '"A"'::jsonb, 2.0, 2, NOW()),
            
            -- Pregunta 3: Verdadero/Falso
            (gen_random_uuid(), v_quiz_1_id, 'En la expresión 2x² - 4x², el resultado es -2x².', 'true_false',
             '{"true": "Verdadero", "false": "Falso"}'::jsonb,
             'true'::jsonb, 2.0, 3, NOW()),
            
            -- Pregunta 4: Opción Múltiple
            (gen_random_uuid(), v_quiz_1_id, 'Si una empresa tiene costos de materiales 3x y mano de obra 2x + 100, ¿cuál es el costo total?', 'multiple_choice',
             '{"A": "5x + 100", "B": "6x + 100", "C": "5x", "D": "6x"}'::jsonb,
             '"A"'::jsonb, 3.0, 4, NOW()),
            
            -- Pregunta 5: Opción Múltiple
            (gen_random_uuid(), v_quiz_1_id, 'Al aplicar la propiedad distributiva en 3x(2x + 5), obtenemos:', 'multiple_choice',
             '{"A": "6x + 15", "B": "6x² + 15x", "C": "5x + 8", "D": "6x² + 15"}'::jsonb,
             '"B"'::jsonb, 3.0, 5, NOW()),
            
            -- Pregunta 6: Respuesta Corta
            (gen_random_uuid(), v_quiz_1_id, '¿Qué es un término semejante? (Responde en una frase corta)', 'short_answer',
             NULL,
             '["Términos que tienen las mismas variables con los mismos exponentes", "términos con las mismas variables y exponentes", "términos semejantes tienen mismas variables y exponentes"]'::jsonb,
             3.0, 6, NOW());
    END IF;

    -- =====================================================
    -- QUIZ 2: ECUACIONES LINEALES - SISTEMAS DE ECUACIONES
    -- =====================================================
    IF v_unit_2_id IS NOT NULL THEN
        INSERT INTO assessments (
            id, course_id, unit_id, title, description, assessment_type,
            instructions, time_limit, max_attempts, passing_score, is_published,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_course_id,
            v_unit_2_id,
            'Quiz Unidad 2: Ecuaciones Lineales y Sistemas',
            'Evalúa tu capacidad para resolver ecuaciones lineales y sistemas de ecuaciones lineales con dos incógnitas, tanto analítica como gráficamente.',
            'quiz',
            'Resuelve cada ecuación y sistema de ecuaciones. Muestra tu trabajo cuando sea posible. Tienes 35 minutos para completar este quiz.',
            35,
            3,
            70.0,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO v_quiz_2_id;

        RAISE NOTICE 'Quiz Unidad 2 creado: ID = %', v_quiz_2_id;

        -- Preguntas del Quiz 2
        INSERT INTO questions (id, assessment_id, question_text, question_type, options, correct_answer, points, order_index, created_at)
        VALUES
            -- Pregunta 1: Opción Múltiple
            (gen_random_uuid(), v_quiz_2_id, '¿Cuál es la solución de la ecuación 2x + 5 = 13?', 'multiple_choice',
             '{"A": "x = 4", "B": "x = 5", "C": "x = 6", "D": "x = 7"}'::jsonb,
             '"A"'::jsonb, 2.0, 1, NOW()),
            
            -- Pregunta 2: Opción Múltiple
            (gen_random_uuid(), v_quiz_2_id, 'Un sistema de ecuaciones lineales con dos incógnitas puede tener:', 'multiple_choice',
             '{"A": "Solo una solución", "B": "Una solución, infinitas soluciones, o ninguna solución", "C": "Siempre infinitas soluciones", "D": "Siempre una única solución"}'::jsonb,
             '"B"'::jsonb, 3.0, 2, NOW()),
            
            -- Pregunta 3: Verdadero/Falso
            (gen_random_uuid(), v_quiz_2_id, 'Una ecuación lineal tiene la forma ax + b = 0, donde a y b son constantes.', 'true_false',
             '{"true": "Verdadero", "false": "Falso"}'::jsonb,
             'true'::jsonb, 2.0, 3, NOW()),
            
            -- Pregunta 4: Respuesta Corta
            (gen_random_uuid(), v_quiz_2_id, 'Resuelve la ecuación: 3x - 7 = 14. ¿Cuál es el valor de x?', 'short_answer',
             NULL,
             '["7", "x = 7"]'::jsonb,
             3.0, 4, NOW()),
            
            -- Pregunta 5: Opción Múltiple
            (gen_random_uuid(), v_quiz_2_id, 'Si en un sistema de ecuaciones las dos ecuaciones son paralelas, ¿cuántas soluciones tiene?', 'multiple_choice',
             '{"A": "Una solución", "B": "Infinitas soluciones", "C": "Ninguna solución", "D": "Dos soluciones"}'::jsonb,
             '"C"'::jsonb, 3.0, 5, NOW());
    END IF;

    -- =====================================================
    -- QUIZ 3: PROGRESIONES ARITMÉTICAS Y GEOMÉTRICAS
    -- =====================================================
    IF v_unit_3_id IS NOT NULL THEN
        INSERT INTO assessments (
            id, course_id, unit_id, title, description, assessment_type,
            instructions, time_limit, max_attempts, passing_score, is_published,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_course_id,
            v_unit_3_id,
            'Quiz Unidad 3: Progresiones Aritméticas y Geométricas',
            'Evalúa tu comprensión de las progresiones aritméticas y geométricas, sus fórmulas y su aplicación en modelización de situaciones empresariales.',
            'quiz',
            'Aplica las fórmulas de progresiones para resolver problemas. Algunos problemas requieren modelización empresarial. Tienes 30 minutos.',
            30,
            3,
            70.0,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO v_quiz_3_id;

        RAISE NOTICE 'Quiz Unidad 3 creado: ID = %', v_quiz_3_id;

        -- Preguntas del Quiz 3
        INSERT INTO questions (id, assessment_id, question_text, question_type, options, correct_answer, points, order_index, created_at)
        VALUES
            -- Pregunta 1: Opción Múltiple
            (gen_random_uuid(), v_quiz_3_id, 'En una progresión aritmética, la diferencia entre términos consecutivos es:', 'multiple_choice',
             '{"A": "Variable", "B": "Constante", "C": "Creciente", "D": "Decreciente"}'::jsonb,
             '"B"'::jsonb, 2.0, 1, NOW()),
            
            -- Pregunta 2: Opción Múltiple
            (gen_random_uuid(), v_quiz_3_id, 'En una progresión geométrica, cada término se obtiene:', 'multiple_choice',
             '{"A": "Sumando una constante al término anterior", "B": "Multiplicando el término anterior por una constante", "C": "Dividiendo el término anterior por una constante", "D": "Restando una constante al término anterior"}'::jsonb,
             '"B"'::jsonb, 2.0, 2, NOW()),
            
            -- Pregunta 3: Verdadero/Falso
            (gen_random_uuid(), v_quiz_3_id, 'Las progresiones geométricas son útiles para modelar crecimiento exponencial en contextos empresariales.', 'true_false',
             '{"true": "Verdadero", "false": "Falso"}'::jsonb,
             'true'::jsonb, 2.0, 3, NOW()),
            
            -- Pregunta 4: Respuesta Corta
            (gen_random_uuid(), v_quiz_3_id, 'Si una progresión aritmética tiene primer término a₁ = 5 y diferencia d = 3, ¿cuál es el tercer término a₃?', 'short_answer',
             NULL,
             '["11", "a₃ = 11"]'::jsonb,
             3.0, 4, NOW()),
            
            -- Pregunta 5: Opción Múltiple
            (gen_random_uuid(), v_quiz_3_id, '¿Qué tipo de progresión sería más apropiada para modelar el crecimiento de una inversión con interés compuesto?', 'multiple_choice',
             '{"A": "Progresión aritmética", "B": "Progresión geométrica", "C": "Ambas son igualmente apropiadas", "D": "Ninguna de las dos"}'::jsonb,
             '"B"'::jsonb, 3.0, 5, NOW());
    END IF;

    -- =====================================================
    -- QUIZ 4: TEORÍA DE CONJUNTOS
    -- =====================================================
    IF v_unit_4_id IS NOT NULL THEN
        INSERT INTO assessments (
            id, course_id, unit_id, title, description, assessment_type,
            instructions, time_limit, max_attempts, passing_score, is_published,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_course_id,
            v_unit_4_id,
            'Quiz Unidad 4: Teoría de Conjuntos',
            'Evalúa tu comprensión de la clasificación de conjuntos, sus operaciones y su aplicación en la resolución de problemas empresariales.',
            'quiz',
            'Aplica las operaciones de conjuntos (unión, intersección, diferencia) para resolver problemas. Tienes 30 minutos.',
            30,
            3,
            70.0,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO v_quiz_4_id;

        RAISE NOTICE 'Quiz Unidad 4 creado: ID = %', v_quiz_4_id;

        -- Preguntas del Quiz 4
        INSERT INTO questions (id, assessment_id, question_text, question_type, options, correct_answer, points, order_index, created_at)
        VALUES
            -- Pregunta 1: Opción Múltiple
            (gen_random_uuid(), v_quiz_4_id, 'La operación de intersección de dos conjuntos A y B incluye:', 'multiple_choice',
             '{"A": "Todos los elementos de A y B", "B": "Solo los elementos que están en A y también en B", "C": "Solo los elementos que están en A pero no en B", "D": "Solo los elementos que están en B pero no en A"}'::jsonb,
             '"B"'::jsonb, 2.0, 1, NOW()),
            
            -- Pregunta 2: Opción Múltiple
            (gen_random_uuid(), v_quiz_4_id, 'La unión de dos conjuntos A y B incluye:', 'multiple_choice',
             '{"A": "Solo los elementos comunes", "B": "Todos los elementos que están en A o en B (o en ambos)", "C": "Solo los elementos de A", "D": "Solo los elementos de B"}'::jsonb,
             '"B"'::jsonb, 2.0, 2, NOW()),
            
            -- Pregunta 3: Verdadero/Falso
            (gen_random_uuid(), v_quiz_4_id, 'Un conjunto vacío es un conjunto que no tiene elementos.', 'true_false',
             '{"true": "Verdadero", "false": "Falso"}'::jsonb,
             'true'::jsonb, 2.0, 3, NOW()),
            
            -- Pregunta 4: Opción Múltiple
            (gen_random_uuid(), v_quiz_4_id, 'Si A = {1, 2, 3} y B = {3, 4, 5}, entonces A ∩ B (intersección) es:', 'multiple_choice',
             '{"A": "{1, 2, 3, 4, 5}", "B": "{3}", "C": "{1, 2}", "D": "{4, 5}"}'::jsonb,
             '"B"'::jsonb, 3.0, 4, NOW()),
            
            -- Pregunta 5: Respuesta Corta
            (gen_random_uuid(), v_quiz_4_id, 'Si A = {1, 2, 3} y B = {3, 4, 5}, ¿cuál es A ∪ B (unión)? (Escribe el conjunto entre llaves)', 'short_answer',
             NULL,
             '["{1, 2, 3, 4, 5}", "{1,2,3,4,5}"]'::jsonb,
             3.0, 5, NOW());
    END IF;

    RAISE NOTICE '✅ Script completado exitosamente!';
    RAISE NOTICE '📊 Resumen:';
    RAISE NOTICE '   - 1 Trivia general creada';
    IF v_unit_1_id IS NOT NULL THEN RAISE NOTICE '   - Quiz Unidad 1 (Expresiones Algebraicas) creado'; END IF;
    IF v_unit_2_id IS NOT NULL THEN RAISE NOTICE '   - Quiz Unidad 2 (Ecuaciones Lineales) creado'; END IF;
    IF v_unit_3_id IS NOT NULL THEN RAISE NOTICE '   - Quiz Unidad 3 (Progresiones) creado'; END IF;
    IF v_unit_4_id IS NOT NULL THEN RAISE NOTICE '   - Quiz Unidad 4 (Teoría de Conjuntos) creado'; END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE;
END $$;

-- Verificación: Mostrar los assessments creados
SELECT 
    a.id,
    a.title,
    a.assessment_type,
    a.is_published,
    cu.number as unidad_numero,
    cu.title as unidad_titulo
FROM assessments a
LEFT JOIN course_units cu ON a.unit_id = cu.id
WHERE a.course_id = (
    SELECT id FROM courses 
    WHERE title ILIKE '%Matematica para Empresas%' OR title ILIKE '%Matemática para Empresas%'
    LIMIT 1
)
OR a.course_id = 1
ORDER BY 
    CASE WHEN cu.number IS NULL THEN 0 ELSE cu.number END,
    a.created_at;

