-- =====================================================
-- VERIFICAR CHUNKS CREADOS DESDE RETROALIMENTACIÓN
-- =====================================================

-- 1. Ver chunks creados desde feedback
SELECT 
    id,
    course_id,
    LEFT(content, 100) as content_preview,
    metadata->>'source' as source,
    metadata->>'original_question' as original_question,
    metadata->>'quality_score' as quality_score,
    metadata->>'created_from' as created_from,
    created_at
FROM course_content_chunks
WHERE metadata->>'source' = 'tutor_general_knowledge'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Contar chunks por fuente
SELECT 
    metadata->>'source' as source,
    COUNT(*) as total_chunks
FROM course_content_chunks
WHERE metadata->>'source' = 'tutor_general_knowledge'
GROUP BY metadata->>'source';

-- 3. Ver respuestas procesadas
SELECT 
    id,
    course_id,
    LEFT(question, 50) as question_preview,
    status,
    quality_score,
    created_at,
    processed_at
FROM tutor_general_knowledge_responses
WHERE status = 'processed'
ORDER BY processed_at DESC
LIMIT 10;

-- 4. Estadísticas generales
SELECT 
    status,
    COUNT(*) as total,
    AVG(quality_score) as avg_quality_score,
    SUM(tokens_used) as total_tokens,
    SUM(cost) as total_cost
FROM tutor_general_knowledge_responses
GROUP BY status
ORDER BY status;
