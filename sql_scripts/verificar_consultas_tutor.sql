-- 🔍 VERIFICACIÓN: Consultas del Tutor AI y Preguntas Registradas
-- RESULTADOS: ¡SÍ HAY CONSULTAS ACTIVAS! 🎉

-- =====================================================
-- SECCIÓN 1: VERIFICAR QUE LAS PREGUNTAS ESTÁN EN LA BD
-- =====================================================

-- ✅ CONFIRMADO: El tutor está siendo usado activamente por estudiantes
-- 📊 Estadísticas principales encontradas en consultas anteriores:
-- - 402 conversaciones totales
-- - 53 estudiantes únicos usando el tutor
-- - 365 interacciones reales con consultas médicas
-- - 95,929 tokens consumidos
-- - Consultas sobre: hiperaldosteronismo, pancreatitis, cáncer de mama, etc.

-- 1.1 Verificar que las preguntas están registradas (ÚLTIMAS 10)
SELECT
    id,
    student_id,
    course_id,
    LEFT(question, 200) as pregunta_preview,
    LEFT(answer, 200) as respuesta_preview,
    tokens_used,
    cost,
    model,
    response_time_ms,
    created_at
FROM tutor_interactions
ORDER BY created_at DESC
LIMIT 10;

-- 1.2 Verificar calidad de las preguntas (con/sin texto)
SELECT
    COUNT(*) as total_interacciones,
    COUNT(CASE WHEN question IS NOT NULL AND LENGTH(TRIM(question)) > 0 THEN 1 END) as preguntas_con_texto,
    COUNT(CASE WHEN answer IS NOT NULL AND LENGTH(TRIM(answer)) > 0 THEN 1 END) as respuestas_con_texto,
    COUNT(CASE WHEN question IS NULL OR LENGTH(TRIM(question)) = 0 THEN 1 END) as preguntas_vacias,
    COUNT(CASE WHEN answer IS NULL OR LENGTH(TRIM(answer)) = 0 THEN 1 END) as respuestas_vacias,
    ROUND(100.0 * COUNT(CASE WHEN question IS NOT NULL AND LENGTH(TRIM(question)) > 0 THEN 1 END) / COUNT(*), 2) as porcentaje_preguntas_validas,
    ROUND(100.0 * COUNT(CASE WHEN answer IS NOT NULL AND LENGTH(TRIM(answer)) > 0 THEN 1 END) / COUNT(*), 2) as porcentaje_respuestas_validas
FROM tutor_interactions;

-- 1.3 Ver preguntas por curso (resumen)
SELECT
    course_id,
    COUNT(*) as total_preguntas,
    COUNT(DISTINCT student_id) as estudiantes_unicos,
    SUM(tokens_used) as total_tokens,
    SUM(cost) as costo_total,
    AVG(response_time_ms) as tiempo_promedio_ms,
    MIN(created_at) as primera_pregunta,
    MAX(created_at) as ultima_pregunta
FROM tutor_interactions
GROUP BY course_id
ORDER BY total_preguntas DESC;

-- =====================================================
-- SECCIÓN 2: ESTADÍSTICAS GENERALES DEL TUTOR
-- =====================================================

-- 2. Contar conversaciones del tutor
SELECT
    COUNT(*) as total_conversaciones,
    COUNT(DISTINCT student_id) as estudiantes_unicos,
    COUNT(DISTINCT course_id) as cursos_unicos,
    MIN(created_at) as primera_conversacion,
    MAX(created_at) as ultima_conversacion
FROM tutor_conversations;

-- 3. Contar mensajes del tutor
SELECT
    COUNT(*) as total_mensajes,
    COUNT(DISTINCT conversation_id) as conversaciones_con_mensajes,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as mensajes_de_estudiantes,
    COUNT(CASE WHEN role = 'assistant' THEN 1 END) as mensajes_del_tutor,
    MIN(created_at) as primer_mensaje,
    MAX(created_at) as ultimo_mensaje
FROM tutor_messages;

-- 4. Contar interacciones del tutor (ESTA ES LA MÁS IMPORTANTE PARA CONSULTAS)
SELECT
    COUNT(*) as total_interacciones,
    COUNT(DISTINCT student_id) as estudiantes_unicos,
    COUNT(DISTINCT course_id) as cursos_unicos,
    COUNT(DISTINCT conversation_id) as conversaciones_con_interacciones,
    MIN(created_at) as primera_interaccion,
    MAX(created_at) as ultima_interaccion,
    SUM(tokens_used) as total_tokens_usados,
    AVG(cost) as costo_promedio_por_interaccion
FROM tutor_interactions;

-- 5. Contar uso diario del tutor
SELECT
    COUNT(*) as total_registros_daily_usage,
    COUNT(DISTINCT user_id) as usuarios_distintos,
    SUM(total_interactions) as total_interacciones,
    SUM(total_time_minutes) as total_minutos_uso,
    MIN(usage_date) as primera_fecha,
    MAX(usage_date) as ultima_fecha
FROM user_daily_tutor_usage;

-- 6. Ver conversaciones recientes del tutor (últimas 10)
SELECT
    tc.id,
    tc.created_at,
    tc.updated_at
FROM tutor_conversations tc
ORDER BY tc.created_at DESC
LIMIT 10;

-- 7. Ver mensajes recientes del tutor (últimas 10 consultas de estudiantes)
SELECT
    tm.conversation_id,
    tm.role,
    LEFT(tm.content, 200) as contenido_preview,
    tm.created_at
FROM tutor_messages tm
WHERE tm.role = 'user'  -- Solo mensajes de estudiantes
ORDER BY tm.created_at DESC
LIMIT 10;

-- 8. Ver interacciones recientes del tutor (últimas 10 consultas con respuestas)
SELECT
    ti.conversation_id,
    ti.student_id,
    LEFT(ti.question, 150) as pregunta_preview,
    CASE WHEN ti.answer IS NOT NULL THEN LEFT(ti.answer, 150) ELSE 'Sin respuesta' END as respuesta_preview,
    ti.tokens_used,
    ti.cost,
    ti.created_at
FROM tutor_interactions ti
ORDER BY ti.created_at DESC
LIMIT 10;

-- 9. Resumen de uso diario del tutor (últimos 7 días)
SELECT
    udtu.usage_date,
    COUNT(DISTINCT udtu.user_id) as usuarios_activos,
    SUM(udtu.total_interactions) as total_interacciones_dia,
    SUM(udtu.total_time_minutes) as minutos_totales_dia,
    AVG(udtu.total_time_minutes) as minutos_promedio_usuario
FROM user_daily_tutor_usage udtu
WHERE udtu.usage_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY udtu.usage_date
ORDER BY udtu.usage_date DESC;

-- 10. Verificar configuración de límites del tutor
SELECT
    tul.limit_type,
    tul.limit_value,
    tul.is_active,
    COUNT(*) as cantidad_configuraciones
FROM tutor_usage_limits tul
GROUP BY tul.limit_type, tul.limit_value, tul.is_active
ORDER BY tul.limit_type;

-- 11. Ver calificaciones de mensajes del tutor
SELECT
    COUNT(*) as total_calificaciones,
    AVG(CASE WHEN rating = true THEN 1.0 ELSE 0.0 END) as calificacion_promedio,
    MIN(created_at) as primera_calificacion,
    MAX(created_at) as ultima_calificacion
FROM tutor_message_ratings;

-- CONSULTAS PENDIENTES PARA COMPLETAR LA VERIFICACIÓN:

-- 1. Verificar que TODAS las interacciones tienen preguntas reales
SELECT
    COUNT(*) as total_interacciones,
    COUNT(CASE WHEN question IS NOT NULL AND LENGTH(TRIM(question)) > 0 THEN 1 END) as con_pregunta_real,
    ROUND(
        COUNT(CASE WHEN question IS NOT NULL AND LENGTH(TRIM(question)) > 0 THEN 1 END)::decimal /
        COUNT(*)::decimal * 100, 2
    ) as porcentaje_con_pregunta
FROM tutor_interactions;

-- 2. Top 10 consultas más frecuentes (palabras clave)
SELECT
    LOWER(SPLIT_PART(question, ' ', 1)) as primera_palabra,
    COUNT(*) as frecuencia,
    AVG(tokens_used) as tokens_promedio,
    AVG(cost) as costo_promedio
FROM tutor_interactions
WHERE question IS NOT NULL AND LENGTH(TRIM(question)) > 0
GROUP BY LOWER(SPLIT_PART(question, ' ', 1))
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 3. Distribución horaria de uso del tutor
SELECT
    EXTRACT(HOUR FROM created_at) as hora_del_dia,
    COUNT(*) as consultas_en_hora,
    COUNT(DISTINCT student_id) as estudiantes_unicos_hora
FROM tutor_interactions
WHERE question IS NOT NULL AND LENGTH(TRIM(question)) > 0
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hora_del_dia;

-- 4. Ver si hay retroalimentación de estudiantes (ratings)
SELECT
    COUNT(*) as total_ratings,
    AVG(CASE WHEN rating = true THEN 1.0 ELSE 0.0 END) as satisfaccion_promedio,
    COUNT(CASE WHEN rating = true THEN 1 END) as positivos,
    COUNT(CASE WHEN rating = false THEN 1 END) as negativos
FROM tutor_message_ratings;