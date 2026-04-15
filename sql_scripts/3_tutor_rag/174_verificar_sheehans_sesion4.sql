-- =====================================================
-- VERIFICACIÓN: Buscar "Síndrome de Sheehan" en Sesión 4
-- VERSIÓN ULTRA-OPTIMIZADA: Consultas simples y rápidas
-- Ejecutar cada consulta por separado si hay problemas de timeout
-- =====================================================

-- =====================================================
-- CONSULTA 1: Identificar la sesión 4 (MUY RÁPIDA)
-- =====================================================

SELECT 
  s.id AS session_id,
  s.title AS session_title,
  s.course_id,
  s.unit_id
FROM sessions s
WHERE s.course_id = 12
ORDER BY s.starts_at ASC
LIMIT 1 OFFSET 3;

-- =====================================================
-- CONSULTA 2: Verificar en title y description (RÁPIDA)
-- Ejecutar SOLO esta consulta primero
-- =====================================================

SELECT 
  s.id AS session_id,
  s.title AS session_title,
  CASE WHEN s.title ILIKE '%Sheehan%' THEN 'SÍ' ELSE 'NO' END AS en_title,
  CASE WHEN s.description ILIKE '%Sheehan%' THEN 'SÍ' ELSE 'NO' END AS en_description
FROM sessions s
WHERE s.course_id = 12
ORDER BY s.starts_at ASC
LIMIT 1 OFFSET 3;

-- =====================================================
-- CONSULTA 3: Verificar content_html de la sesión 4 específica (RÁPIDA)
-- Usar el session_id obtenido de la CONSULTA 1: 1b3423e1-b7eb-4a7d-af2e-a640f8a98a9b
-- =====================================================

SELECT 
  s.id AS session_id,
  s.title AS session_title,
  CASE 
    WHEN s.content_html ILIKE '%Sheehan%' THEN '✅ SÍ encontrado en content_html'
    ELSE '❌ NO encontrado en content_html'
  END AS resultado,
  LENGTH(COALESCE(s.content_html, '')) AS content_html_length,
  -- Si encuentra, mostrar posición aproximada
  CASE 
    WHEN s.content_html ILIKE '%Sheehan%' THEN POSITION(LOWER('sheehan') IN LOWER(s.content_html))
    ELSE NULL
  END AS posicion_en_content
FROM sessions s
WHERE s.id = '1b3423e1-b7eb-4a7d-af2e-a640f8a98a9b';

-- =====================================================
-- CONSULTA 4: Buscar chunks con "Sheehan" usando LIMIT y filtros (MÁS RÁPIDA)
-- Esta consulta está optimizada para evitar timeout
-- =====================================================

-- Opción A: Solo contar (más rápida)
SELECT COUNT(*) AS total_chunks_con_sheehan
FROM course_content_chunks
WHERE course_id = 12
  AND content ILIKE '%Sheehan%'
LIMIT 1000; -- Limitar búsqueda a primeros 1000 registros

-- Opción B: Si necesitas ver los chunks, usar esta (puede ser más lenta)
/*
SELECT 
  id,
  metadata->>'sourceFileName' AS archivo_fuente,
  metadata->>'pageStart' AS pagina_inicio,
  metadata->>'pageEnd' AS pagina_fin,
  LEFT(content, 200) AS contenido_preview
FROM course_content_chunks
WHERE course_id = 12
  AND content ILIKE '%Sheehan%'
ORDER BY created_at DESC
LIMIT 10;
*/

-- =====================================================
-- CONSULTA 5: Verificar chunks indexados para sesión 4 (RÁPIDA)
-- Usando el session_id conocido: 1b3423e1-b7eb-4a7d-af2e-a640f8a98a9b
-- =====================================================

SELECT 
  COUNT(*) AS chunks_indexados_para_sesion,
  COUNT(CASE WHEN content ILIKE '%Sheehan%' THEN 1 END) AS chunks_con_sheehan
FROM course_content_chunks
WHERE course_id = 12
  AND (
    metadata->>'sessionId' = '1b3423e1-b7eb-4a7d-af2e-a640f8a98a9b'
    OR metadata->>'session_id' = '1b3423e1-b7eb-4a7d-af2e-a640f8a98a9b'
  );
