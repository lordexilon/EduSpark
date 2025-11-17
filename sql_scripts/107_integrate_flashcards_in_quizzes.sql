                                        -- 107_integrate_flashcards_in_quizzes.sql
                                        -- Integrar flashcards como preguntas dentro de quizzes/trivias
                                        -- Fecha: Enero 2025

                                        -- =====================================================
                                        -- VERIFICAR Y AGREGAR COLUMNAS DE OPCIONES MÚLTIPLES A FLASHCARDS
                                        -- =====================================================

                                        -- Agregar columnas para opciones múltiples si no existen
                                        ALTER TABLE public.flashcards
                                        ADD COLUMN IF NOT EXISTS is_multiple_choice BOOLEAN DEFAULT false;

                                         ALTER TABLE public.flashcards
                                         ADD COLUMN IF NOT EXISTS answer_options JSONB DEFAULT NULL;

                                        ALTER TABLE public.flashcards
                                        ADD COLUMN IF NOT EXISTS correct_answer_index INTEGER DEFAULT NULL;

                                        -- =====================================================
                                        -- AGREGAR RELACIÓN ENTRE QUESTIONS Y FLASHCARDS
                                        -- =====================================================

                                        -- Agregar columna para relacionar preguntas con flashcards
                                        ALTER TABLE public.questions
                                        ADD COLUMN IF NOT EXISTS flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE;

                                        -- Agregar índice para búsquedas rápidas
                                        CREATE INDEX IF NOT EXISTS idx_questions_flashcard ON public.questions(flashcard_id) WHERE flashcard_id IS NOT NULL;

                                        -- Comentario
                                        COMMENT ON COLUMN public.questions.flashcard_id IS 'Si está presente, esta pregunta es una flashcard. El contenido se obtiene de la tabla flashcards.';

                                        -- =====================================================
                                        -- FUNCIÓN: Crear pregunta desde flashcard
                                        -- =====================================================

                                        CREATE OR REPLACE FUNCTION create_question_from_flashcard(
                                            p_assessment_id UUID,
                                            p_flashcard_id UUID,
                                            p_points DECIMAL(5,2) DEFAULT NULL,
                                            p_order_index INTEGER DEFAULT NULL
                                        )
                                        RETURNS UUID AS $$
                                        DECLARE
                                            v_question_id UUID;
                                            v_flashcard RECORD;
                                            v_points DECIMAL(5,2);
                                            v_order_index INTEGER;
                                        BEGIN
                                            -- Obtener datos de la flashcard
                                            SELECT * INTO v_flashcard
                                            FROM public.flashcards
                                            WHERE id = p_flashcard_id AND is_active = true;
                                            
                                            IF NOT FOUND THEN
                                                RAISE EXCEPTION 'Flashcard no encontrada o inactiva: %', p_flashcard_id;
                                            END IF;
                                            
                                            -- Determinar puntos (usar points_value de la flashcard si no se especifica)
                                            v_points := COALESCE(p_points, v_flashcard.points_value, 1.0);
                                            
                                            -- Determinar order_index (último + 1 si no se especifica)
                                            IF p_order_index IS NULL THEN
                                                SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_order_index
                                                FROM public.questions
                                                WHERE assessment_id = p_assessment_id;
                                            ELSE
                                                v_order_index := p_order_index;
                                            END IF;
                                            
                                            -- Crear pregunta desde flashcard
                                            INSERT INTO public.questions (
                                                assessment_id,
                                                flashcard_id,
                                                question_text,
                                                question_type,
                                                options,
                                                correct_answer,
                                                points,
                                                order_index,
                                                explanation
                                            ) VALUES (
                                                p_assessment_id,
                                                p_flashcard_id,
                                                COALESCE(v_flashcard.front_text, v_flashcard.title, 'Flashcard'),
                                                CASE 
                                                    WHEN COALESCE(v_flashcard.is_multiple_choice, false) = true THEN 'flashcard_multiple_choice'
                                                    ELSE 'flashcard'
                                                END,
                                                CASE 
                                                    WHEN COALESCE(v_flashcard.is_multiple_choice, false) = true AND v_flashcard.answer_options IS NOT NULL THEN
                                                        jsonb_build_array(
                                                            jsonb_build_object(
                                                                'options', v_flashcard.answer_options,
                                                                'correct_index', v_flashcard.correct_answer_index
                                                            )
                                                        )
                                                    ELSE NULL
                                                END,
                                                CASE 
                                                    WHEN COALESCE(v_flashcard.is_multiple_choice, false) = true THEN
                                                        jsonb_build_object('index', v_flashcard.correct_answer_index)
                                                    ELSE
                                                        jsonb_build_object('text', v_flashcard.back_text)
                                                END,
                                                v_points,
                                                v_order_index,
                                                v_flashcard.back_text
                                            ) RETURNING id INTO v_question_id;
                                            
                                            RETURN v_question_id;
                                        END;
                                        $$ LANGUAGE plpgsql;

                                        -- =====================================================
                                        -- FUNCIÓN: Agregar múltiples flashcards a un quiz
                                        -- =====================================================

                                        CREATE OR REPLACE FUNCTION add_flashcards_to_assessment(
                                            p_assessment_id UUID,
                                            p_flashcard_ids UUID[],
                                            p_points_per_flashcard DECIMAL(5,2) DEFAULT NULL
                                        )
                                        RETURNS TABLE(question_id UUID, flashcard_id UUID) AS $$
                                        DECLARE
                                            v_flashcard_id UUID;
                                            v_question_id UUID;
                                            v_order_index INTEGER;
                                        BEGIN
                                            -- Obtener el último order_index
                                            SELECT COALESCE(MAX(order_index), 0) INTO v_order_index
                                            FROM public.questions
                                            WHERE assessment_id = p_assessment_id;
                                            
                                            -- Crear pregunta para cada flashcard
                                            FOREACH v_flashcard_id IN ARRAY p_flashcard_ids
                                            LOOP
                                                v_order_index := v_order_index + 1;
                                                
                                                SELECT create_question_from_flashcard(
                                                    p_assessment_id,
                                                    v_flashcard_id,
                                                    p_points_per_flashcard,
                                                    v_order_index
                                                ) INTO v_question_id;
                                                
                                                question_id := v_question_id;
                                                flashcard_id := v_flashcard_id;
                                                RETURN NEXT;
                                            END LOOP;
                                        END;
                                        $$ LANGUAGE plpgsql;

                                        -- =====================================================
                                        -- ACTUALIZAR FUNCIÓN DE CÁLCULO DE PUNTUACIÓN
                                        -- =====================================================

                                        -- La función calculate_attempt_score ya suma todos los points_earned
                                        -- de question_responses, incluyendo las flashcards, así que no necesita cambios

                                        -- =====================================================
                                        -- ACTUALIZAR TRIGGER PARA INCLUIR FLASHCARDS EN TOTAL_POINTS
                                        -- =====================================================

                                        -- Función para recalcular total_points de un assessment
                                        CREATE OR REPLACE FUNCTION recalculate_assessment_total_points(p_assessment_id UUID)
                                        RETURNS DECIMAL(5,2) AS $$
                                        DECLARE
                                            v_total_points DECIMAL(5,2);
                                        BEGIN
                                            -- Sumar puntos de todas las preguntas (incluyendo flashcards)
                                            SELECT COALESCE(SUM(points), 0) INTO v_total_points
                                            FROM public.questions
                                            WHERE assessment_id = p_assessment_id;
                                            
                                            -- Actualizar el assessment
                                            UPDATE public.assessments
                                            SET total_points = v_total_points
                                            WHERE id = p_assessment_id;
                                            
                                            RETURN v_total_points;
                                        END;
                                        $$ LANGUAGE plpgsql;

                                        -- Trigger para recalcular total_points cuando se agregan/eliminan preguntas
                                        CREATE OR REPLACE FUNCTION trigger_recalculate_total_points()
                                        RETURNS TRIGGER AS $$
                                        BEGIN
                                            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                                                PERFORM recalculate_assessment_total_points(NEW.assessment_id);
                                            ELSIF TG_OP = 'DELETE' THEN
                                                PERFORM recalculate_assessment_total_points(OLD.assessment_id);
                                            END IF;
                                            RETURN COALESCE(NEW, OLD);
                                        END;
                                        $$ LANGUAGE plpgsql;

                                        DROP TRIGGER IF EXISTS trigger_recalculate_assessment_points ON public.questions;
                                        CREATE TRIGGER trigger_recalculate_assessment_points
                                            AFTER INSERT OR UPDATE OF points OR DELETE ON public.questions
                                            FOR EACH ROW
                                            EXECUTE FUNCTION trigger_recalculate_total_points();

                                        -- =====================================================
                                        -- VISTA: Preguntas con información de flashcard
                                        -- =====================================================

                                        CREATE OR REPLACE VIEW questions_with_flashcards AS
                                        SELECT 
                                            q.*,
                                            f.id as flashcard_id_full,
                                            f.front_text as flashcard_front_text,
                                            f.front_image_url as flashcard_front_image,
                                            f.back_text as flashcard_back_text,
                                            f.back_image_url as flashcard_back_image,
                                            COALESCE(f.is_multiple_choice, false) as flashcard_is_multiple_choice,
                                            f.answer_options as flashcard_answer_options,
                                            f.correct_answer_index as flashcard_correct_index,
                                            f.points_value as flashcard_points_value
                                        FROM public.questions q
                                        LEFT JOIN public.flashcards f ON f.id = q.flashcard_id;

                                        -- =====================================================
                                        -- VERIFICACIÓN
                                        -- =====================================================

                                        DO $$
                                        BEGIN
                                            RAISE NOTICE '✅ Integración de flashcards en quizzes completada';
                                            RAISE NOTICE '';
                                            RAISE NOTICE '📋 CAMBIOS REALIZADOS:';
                                            RAISE NOTICE '   ✅ Columna flashcard_id agregada a questions';
                                            RAISE NOTICE '   ✅ Función create_question_from_flashcard() creada';
                                            RAISE NOTICE '   ✅ Función add_flashcards_to_assessment() creada';
                                            RAISE NOTICE '   ✅ Función recalculate_assessment_total_points() creada';
                                            RAISE NOTICE '   ✅ Trigger para recalcular total_points automáticamente';
                                            RAISE NOTICE '   ✅ Vista questions_with_flashcards creada';
                                            RAISE NOTICE '';
                                            RAISE NOTICE '💡 USO:';
                                            RAISE NOTICE '   1. Para agregar una flashcard a un quiz:';
                                            RAISE NOTICE '      SELECT create_question_from_flashcard(assessment_id, flashcard_id, puntos);';
                                            RAISE NOTICE '';
                                            RAISE NOTICE '   2. Para agregar múltiples flashcards:';
                                            RAISE NOTICE '      SELECT * FROM add_flashcards_to_assessment(assessment_id, ARRAY[flashcard_id1, flashcard_id2]);';
                                            RAISE NOTICE '';
                                            RAISE NOTICE '   3. El total_points del assessment se recalcula automáticamente';
                                            RAISE NOTICE '   4. Las flashcards se evalúan igual que las preguntas normales';
                                            RAISE NOTICE '   5. El puntaje se incluye en el cálculo final del quiz';
                                        END $$;

