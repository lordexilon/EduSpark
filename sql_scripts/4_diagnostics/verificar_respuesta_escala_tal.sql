-- =====================================================
-- VERIFICAR RESPUESTA SOBRE ESCALA DE TAL
-- =====================================================

-- 1. Ver si se guardó la respuesta sobre escala de tal
SELECT 
    id,
    course_id,
    question,
    LEFT(answer, 300) as respuesta_preview,
    rag_confidence,
    status,
    created_at
FROM tutor_general_knowledge_responses
WHERE question ILIKE '%escala%tal%' 
   OR question ILIKE '%desnutrición%severa%'
   OR question ILIKE '%pediatría%8%años%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver interacciones recientes sobre este tema
SELECT 
    ti.id,
    ti.course_id,
    LEFT(ti.question, 100) as pregunta,
    LEFT(ti.answer, 200) as respuesta_preview,
    ti.created_at
FROM tutor_interactions ti
WHERE ti.question ILIKE '%escala%tal%'
   OR ti.question ILIKE '%desnutrición%'
ORDER BY ti.created_at DESC
LIMIT 5;

-- 3. Verificar calidad de respuestas guardadas
SELECT 
    status,
    COUNT(*) as total,
    AVG(rag_confidence) as avg_confidence,
    AVG(LENGTH(answer)) as avg_length
FROM tutor_general_knowledge_responses
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;
