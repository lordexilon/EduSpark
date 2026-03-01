-- =====================================================
-- VERIFICAR: Archivos procesados para el curso 12
-- Detectar si se procesó el archivo incorrecto
-- =====================================================

-- 1. Ver todos los archivos únicos procesados para el curso 12
SELECT DISTINCT
  c.metadata->>'file_name' as archivo_procesado,
  COUNT(DISTINCT c.id) as total_chunks,
  MIN(c.metadata->>'pageStart') as pagina_inicio_min,
  MAX(c.metadata->>'pageEnd') as pagina_fin_max,
  COUNT(DISTINCT c.metadata->>'material_id') as materiales_diferentes
FROM course_content_chunks c
WHERE c.course_id = 12
GROUP BY c.metadata->>'file_name'
ORDER BY total_chunks DESC
LIMIT 20;

-- 2. Buscar específicamente archivos relacionados con "Williams" o "Ginecología"
SELECT DISTINCT
  c.metadata->>'file_name' as archivo_procesado,
  COUNT(DISTINCT c.id) as total_chunks,
  MIN(c.metadata->>'pageStart') as pagina_inicio_min,
  MAX(c.metadata->>'pageEnd') as pagina_fin_max
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND (
    c.metadata->>'file_name' ILIKE '%williams%'
    OR c.metadata->>'file_name' ILIKE '%ginecolog%'
    OR c.metadata->>'file_name' ILIKE '%cancer%'
    OR c.metadata->>'file_name' ILIKE '%mamario%'
  )
GROUP BY c.metadata->>'file_name'
ORDER BY total_chunks DESC
LIMIT 10;

-- 3. Ver chunks alrededor de página 350 y su archivo origen
SELECT 
  c.metadata->>'file_name' as archivo_procesado,
  c.metadata->>'pageStart' as pagina_inicio,
  c.metadata->>'pageEnd' as pagina_fin,
  c.metadata->>'material_id' as material_id,
  LEFT(c.content, 200) as contenido_preview,
  COUNT(*) OVER (PARTITION BY c.metadata->>'file_name') as total_chunks_archivo
FROM course_content_chunks c
WHERE 
  c.course_id = 12
  AND (
    (c.metadata->>'pageStart' >= '340' AND c.metadata->>'pageStart' <= '360')
    OR (c.metadata->>'pageEnd' >= '340' AND c.metadata->>'pageEnd' <= '360')
  )
ORDER BY 
  c.metadata->>'file_name',
  CAST(c.metadata->>'pageStart' AS INTEGER)
LIMIT 20;

-- 4. Verificar si hay materiales registrados con esos nombres de archivo
SELECT 
  m.id,
  m.title,
  m.course_id,
  COUNT(DISTINCT c.id) as chunks_asociados
FROM course_materials m
LEFT JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::TEXT AND c.course_id = 12
WHERE 
  m.course_id = 12
  OR m.title ILIKE '%williams%'
  OR m.title ILIKE '%ginecolog%'
  OR m.title ILIKE '%neonatal%'
GROUP BY m.id, m.title, m.course_id
ORDER BY m.title
LIMIT 30;
