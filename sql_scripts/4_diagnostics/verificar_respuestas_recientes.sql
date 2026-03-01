-- =====================================================
-- VERIFICAR RESPUESTAS RECIENTES DE CONOCIMIENTO GENERAL
-- =====================================================

-- 1. Ver últimas respuestas guardadas (últimas 24 horas)
SELECT 
    id,
    course_id,
    LEFT(question, 80) as pregunta,
    LEFT(answer, 150) as respuesta_preview,
    rag_confidence,
    status,
    created_at
FROM tutor_general_knowledge_responses
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar si hay respuestas sobre "escala de tal" o "desnutrición"
SELECT 
    id,
    course_id,
    question,
    LEFT(answer, 200) as respuesta_preview,
    rag_confidence,
    status,
    created_at
FROM tutor_general_knowledge_responses
WHERE question ILIKE '%escala%' 
   OR question ILIKE '%desnutrición%'
   OR question ILIKE '%pediatría%'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver interacciones recientes del tutor
SELECT 
    ti.id,
    ti.course_id,
    LEFT(ti.question, 80) as pregunta,
    LEFT(ti.answer, 150) as respuesta_preview,
    ti.created_at
FROM tutor_interactions ti
WHERE ti.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY ti.created_at DESC
LIMIT 10;

-- 4. Contar respuestas por estado
SELECT 
    status,
    COUNT(*) as total,
    AVG(rag_confidence) as avg_confidence
FROM tutor_general_knowledge_responses
GROUP BY status
ORDER BY status;
