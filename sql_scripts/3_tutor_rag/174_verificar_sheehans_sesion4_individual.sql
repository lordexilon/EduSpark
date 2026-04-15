-- =====================================================
-- VERIFICACIÓN INDIVIDUAL: "Síndrome de Sheehan" en Sesión 4
-- Ejecutar cada consulta por separado
-- =====================================================

-- PASO 1: Obtener el ID de la sesión 4
-- Ejecutar esta consulta primero y guardar el session_id del resultado

SELECT 
  s.id AS session_id,
  s.title AS session_title,
  s.course_id
FROM sessions s
WHERE s.course_id = 12
ORDER BY s.starts_at ASC
LIMIT 1 OFFSET 3;

-- PASO 2: Verificar si "Sheehan" está en el título o descripción
-- Esta consulta es rápida porque busca en campos pequeños

SELECT 
  s.id AS session_id,
  s.title AS session_title,
  s.description AS session_description
FROM sessions s
WHERE s.course_id = 12
ORDER BY s.starts_at ASC
LIMIT 1 OFFSET 3;

-- PASO 3: Verificar chunks indexados (reemplazar SESSION_ID con el ID del PASO 1)
-- Esta consulta es rápida porque no busca en el contenido, solo en metadata

SELECT COUNT(*) AS chunks_indexados
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'sessionId' = 'REEMPLAZAR_CON_SESSION_ID';

-- PASO 4: Verificar si hay chunks con "Sheehan" (puede ser lenta)
-- Ejecutar SOLO si necesitas verificar chunks procesados
-- Si esta consulta tarda mucho, cancelarla y usar solo las anteriores

SELECT COUNT(*) AS chunks_con_sheehan
FROM course_content_chunks
WHERE course_id = 12
  AND content ILIKE '%Sheehan%'
LIMIT 1;

