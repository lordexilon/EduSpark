-- =====================================================
-- Script 08: Datos de Ejemplo para Tutor Virtual
-- Datos de prueba para validar el sistema multi-agente
-- =====================================================

-- Insertar datos de ejemplo solo si las tablas existen
DO $$
BEGIN
    -- Verificar que las tablas principales existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutor_conversations') THEN
        RAISE NOTICE '❌ Las tablas del tutor virtual no existen. Ejecuta primero los scripts 05 y 06.';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Insertando datos de ejemplo para el tutor virtual...';

    -- Insertar configuración pedagógica de ejemplo
    INSERT INTO course_pedagogical_settings (
        course_id, 
        teacher_id, 
        teaching_style, 
        tone_preference, 
        detail_level, 
        use_examples, 
        encourage_questions, 
        voice_name, 
        voice_speed, 
        system_prompt_override
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001', -- course_id de ejemplo
        '550e8400-e29b-41d4-a716-446655440002', -- teacher_id de ejemplo
        'constructivista',
        'amigable',
        'medio',
        true,
        true,
        'Kore',
        1.0,
        'Eres un tutor especializado en biología que ayuda a los estudiantes a construir su conocimiento paso a paso.'
    ) ON CONFLICT (course_id) DO NOTHING;

    -- Insertar escala de calificación de ejemplo
    INSERT INTO course_grading_scales (
        course_id,
        teacher_id,
        name,
        scale
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        'Escala de Biología',
        '[
            {"grade": "A+", "minScore": 95, "maxScore": 100, "description": "Excelente comprensión"},
            {"grade": "A", "minScore": 90, "maxScore": 94, "description": "Muy buena comprensión"},
            {"grade": "B+", "minScore": 85, "maxScore": 89, "description": "Buena comprensión"},
            {"grade": "B", "minScore": 80, "maxScore": 84, "description": "Comprensión satisfactoria"},
            {"grade": "C", "minScore": 70, "maxScore": 79, "description": "Comprensión básica"},
            {"grade": "F", "minScore": 0, "maxScore": 69, "description": "Necesita mejorar"}
        ]'::jsonb
    ) ON CONFLICT (course_id) DO NOTHING;

    -- Insertar perfil de aprendizaje de ejemplo
    INSERT INTO student_learning_profiles (
        student_id,
        course_id,
        preferred_learning_style,
        difficulty_level,
        preferred_examples,
        topics_struggled,
        topics_mastered,
        interaction_count,
        avg_session_duration
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440003', -- student_id de ejemplo
        '550e8400-e29b-41d4-a716-446655440001',
        'visual',
        'medio',
        'practicos',
        '["fotosintesis", "genetica"]'::jsonb,
        '["celula", "ecosistemas"]'::jsonb,
        15,
        '00:25:30'::interval
    ) ON CONFLICT (student_id, course_id) DO NOTHING;

    -- Insertar conversación de ejemplo
    INSERT INTO tutor_conversations (
        student_id,
        course_id,
        started_at,
        last_activity_at,
        metadata
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440001',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '10 minutes',
        '{"session_type": "study", "difficulty": "medium"}'::jsonb
    ) ON CONFLICT DO NOTHING;

    -- Obtener el ID de la conversación para insertar mensajes
    DO $$
    DECLARE
        conv_id UUID;
    BEGIN
        SELECT id INTO conv_id FROM tutor_conversations 
        WHERE student_id = '550e8400-e29b-41d4-a716-446655440003' 
        AND course_id = '550e8400-e29b-41d4-a716-446655440001'
        LIMIT 1;

        IF conv_id IS NOT NULL THEN
            -- Insertar mensajes de ejemplo
            INSERT INTO tutor_messages (conversation_id, role, content, created_at) VALUES
            (conv_id, 'user', '¿Qué es la fotosíntesis?', NOW() - INTERVAL '2 hours'),
            (conv_id, 'assistant', 'La fotosíntesis es el proceso por el cual las plantas convierten la luz solar en energía química. Te explico paso a paso...', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'),
            (conv_id, 'user', '¿Puedes darme un ejemplo práctico?', NOW() - INTERVAL '1 hour'),
            (conv_id, 'assistant', '¡Por supuesto! Imagina que estás en un jardín. Cuando el sol brilla sobre las hojas de una planta, la clorofila captura esa energía...', NOW() - INTERVAL '1 hour' + INTERVAL '45 seconds'),
            (conv_id, 'user', '¿Qué pasa si no hay suficiente luz?', NOW() - INTERVAL '10 minutes'),
            (conv_id, 'assistant', 'Excelente pregunta. Sin suficiente luz, la fotosíntesis se ralentiza o se detiene. Esto es como intentar cargar tu teléfono sin electricidad...', NOW() - INTERVAL '10 minutes' + INTERVAL '20 seconds')
            ON CONFLICT DO NOTHING;
        END IF;
    END $$;

    -- Insertar materiales de curso de ejemplo
    INSERT INTO course_materials (
        course_id,
        title,
        content,
        type,
        metadata
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        'Introducción a la Fotosíntesis',
        'La fotosíntesis es un proceso fundamental en la vida de las plantas...',
        'text',
        '{"difficulty": "beginner", "topics": ["fotosintesis", "plantas"]}'::jsonb
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'Diagrama del Proceso de Fotosíntesis',
        'Un diagrama visual que muestra cómo funciona la fotosíntesis...',
        'image',
        '{"file_type": "png", "size": "large"}'::jsonb
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'Experimento de Fotosíntesis',
        'Instrucciones para realizar un experimento simple...',
        'text',
        '{"activity_type": "experiment", "duration": "30_minutes"}'::jsonb
    ) ON CONFLICT DO NOTHING;

    -- Insertar imágenes de curso de ejemplo
    INSERT INTO course_images (
        course_id,
        uploaded_by,
        image_url,
        image_type,
        file_size_bytes,
        mime_type,
        alt_text
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        'https://example.com/images/fotosintesis-diagram.png',
        'content',
        2048576,
        'image/png',
        'Diagrama del proceso de fotosíntesis'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        'https://example.com/images/plant-cell-structure.jpg',
        'content',
        1536000,
        'image/jpeg',
        'Estructura de una célula vegetal'
    ) ON CONFLICT DO NOTHING;

    -- Insertar métricas de uso de ejemplo
    INSERT INTO tutor_usage_metrics (
        conversation_id,
        student_id,
        course_id,
        metric_type,
        metric_value,
        metadata
    ) VALUES (
        (SELECT id FROM tutor_conversations WHERE student_id = '550e8400-e29b-41d4-a716-446655440003' LIMIT 1),
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440001',
        'response_time',
        2.5,
        '{"unit": "seconds"}'::jsonb
    ),
    (
        (SELECT id FROM tutor_conversations WHERE student_id = '550e8400-e29b-41d4-a716-446655440003' LIMIT 1),
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440001',
        'satisfaction',
        4.5,
        '{"scale": "1-5", "rating": "high"}'::jsonb
    ) ON CONFLICT DO NOTHING;

    -- Insertar configuraciones de agentes de ejemplo
    INSERT INTO agent_configurations (
        course_id,
        agent_type,
        configuration,
        is_active
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        'voice',
        '{"voice_name": "Kore", "speed": 1.0, "pitch": 1.0}'::jsonb,
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'rag',
        '{"search_limit": 5, "similarity_threshold": 0.7, "use_semantic_search": true}'::jsonb,
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'context',
        '{"max_context_length": 4000, "include_student_profile": true, "include_course_materials": true}'::jsonb,
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'coordinator',
        '{"max_iterations": 3, "timeout_seconds": 30, "fallback_enabled": true}'::jsonb,
        true
    ) ON CONFLICT (course_id, agent_type) DO NOTHING;

    RAISE NOTICE '✅ Datos de ejemplo insertados correctamente';
    RAISE NOTICE '';
    RAISE NOTICE 'Datos insertados:';
    RAISE NOTICE '- 1 configuración pedagógica';
    RAISE NOTICE '- 1 escala de calificación';
    RAISE NOTICE '- 1 perfil de estudiante';
    RAISE NOTICE '- 1 conversación con 6 mensajes';
    RAISE NOTICE '- 3 materiales de curso';
    RAISE NOTICE '- 2 imágenes de curso';
    RAISE NOTICE '- 2 métricas de uso';
    RAISE NOTICE '- 4 configuraciones de agentes';
    RAISE NOTICE '';
    RAISE NOTICE 'Puedes probar el sistema con estos datos de ejemplo.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error insertando datos de ejemplo: %', SQLERRM;
END $$;
