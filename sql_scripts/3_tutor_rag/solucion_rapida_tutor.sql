-- Solución rápida: Corregir course_id en chunks para que coincida con materials
-- ⚠️ IMPORTANTE: Revisa los resultados antes de ejecutar el UPDATE

-- PASO 1: Ver qué necesita corregirse
SELECT 
  m.id as material_id,
  m.title,
  m.course_id as course_id_correcto,
  ccc.course_id as course_id_actual_en_chunks,
  COUNT(ccc.id) as chunks_a_corregir,
  CASE 
    WHEN m.course_id = ccc.course_id THEN '✅ No necesita corrección'
    WHEN ccc.course_id IS NULL THEN '⚠️ Necesita course_id'
    ELSE '❌ Necesita corrección'
  END as accion_necesaria
FROM materials m
INNER JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title, m.course_id, ccc.course_id
ORDER BY accion_necesaria DESC;

-- PASO 2: CORRECCIÓN - Actualizar course_id en chunks para que coincida con materials
-- ⚠️ Solo ejecuta esto si el PASO 1 muestra que hay discrepancias
UPDATE course_content_chunks ccc
SET course_id = m.course_id
FROM materials m
WHERE ccc.metadata->>'material_id' = m.id::text
  AND m.rag_status = 'completed'
  AND (ccc.course_id IS NULL OR ccc.course_id != m.course_id);

-- PASO 3: Verificar corrección
SELECT 
  'Verificación post-corrección' as seccion,
  m.id as material_id,
  m.title,
  m.course_id as material_course_id,
  ccc.course_id as chunk_course_id,
  COUNT(ccc.id) as chunks_count,
  CASE 
    WHEN m.course_id = ccc.course_id THEN '✅ Correcto'
    ELSE '❌ Aún incorrecto'
  END as estado
FROM materials m
INNER JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title, m.course_id, ccc.course_id
ORDER BY estado, m.course_id;

-- PASO 4: Si algunos chunks no tienen material_id en metadata, agregarlo
-- Esto puede pasar si el procesamiento fue anterior a cuando agregamos material_id
UPDATE course_content_chunks ccc
SET metadata = jsonb_set(
  COALESCE(ccc.metadata, '{}'::jsonb),
  '{material_id}',
  to_jsonb(m.id::text)
)
FROM materials m
WHERE ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId'
  AND ccc.metadata->>'material_id' IS NULL
  AND m.rag_status = 'completed';

-- PASO 5: Resumen final
SELECT 
  'Resumen final' as seccion,
  COUNT(DISTINCT m.id) as materiales_procesados,
  COUNT(ccc.id) as total_chunks,
  COUNT(DISTINCT ccc.course_id) as cursos_con_chunks,
  COUNT(DISTINCT CASE WHEN m.course_id = ccc.course_id THEN m.id END) as materiales_correctamente_vinculados
FROM materials m
INNER JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed';

