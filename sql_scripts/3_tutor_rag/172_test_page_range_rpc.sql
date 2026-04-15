-- =====================================================
-- TEST Y VERIFICACIÓN DE LA FUNCIÓN get_chunks_in_page_range
-- Ejecutar después de aplicar los cambios para verificar que todo funciona
-- =====================================================

-- 1. Verificar que la función existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_chunks_in_page_range'
  ) THEN
    RAISE NOTICE '✅ La función get_chunks_in_page_range existe';
  ELSE
    RAISE EXCEPTION '❌ ERROR: La función get_chunks_in_page_range NO existe';
  END IF;
END $$;

-- 2. Verificar la firma de la función (debe incluir embedding)
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'get_chunks_in_page_range';

-- 3. Verificar que hay chunks con información de páginas en algún curso
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT course_id) as cursos_con_chunks,
  COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_con_pageStart,
  COUNT(CASE WHEN metadata->>'pageEnd' IS NOT NULL THEN 1 END) as chunks_con_pageEnd,
  COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL AND metadata->>'pageEnd' IS NOT NULL THEN 1 END) as chunks_con_paginacion_completa
FROM course_content_chunks;

-- 4. Mostrar ejemplo de chunks con paginación (primeros 5)
SELECT 
  id,
  course_id,
  metadata->>'pageStart' as page_start,
  metadata->>'pageEnd' as page_end,
  metadata->>'sourceFileName' as file_name,
  metadata->>'materialId' as material_id,
  LEFT(content, 100) as content_preview
FROM course_content_chunks
WHERE metadata->>'pageStart' IS NOT NULL
  AND metadata->>'pageEnd' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 5. Probar la función con un curso de ejemplo (si hay datos)
-- NOTA: Reemplaza el course_id con un ID real de tu base de datos
DO $$
DECLARE
  v_test_course_id INTEGER;
  v_chunk_count INTEGER;
  v_sample_result RECORD;
BEGIN
  -- Obtener el primer curso que tenga chunks con paginación
  SELECT DISTINCT course_id::INTEGER
  INTO v_test_course_id
  FROM course_content_chunks
  WHERE metadata->>'pageStart' IS NOT NULL
    AND metadata->>'pageEnd' IS NOT NULL
  LIMIT 1;

  IF v_test_course_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontraron cursos con chunks que tengan información de páginas.';
    RAISE NOTICE '   Esto es normal si no has procesado PDFs aún.';
    RETURN;
  END IF;

  RAISE NOTICE '📋 Probando función con course_id: %', v_test_course_id;

  -- Probar con un rango de páginas (ejemplo: páginas 1-50)
  SELECT COUNT(*)
  INTO v_chunk_count
  FROM get_chunks_in_page_range(
    p_course_id := v_test_course_id,
    p_page_start := 1,
    p_page_end := 50,
    p_limit := 10
  );

  RAISE NOTICE '✅ Función ejecutada exitosamente. Chunks encontrados en páginas 1-50: %', v_chunk_count;

  -- Mostrar un resultado de ejemplo
  SELECT *
  INTO v_sample_result
  FROM get_chunks_in_page_range(
    p_course_id := v_test_course_id,
    p_page_start := 1,
    p_page_end := 50,
    p_limit := 1
  )
  LIMIT 1;

  IF v_sample_result.id IS NOT NULL THEN
    RAISE NOTICE '✅ Ejemplo de resultado:';
    RAISE NOTICE '   - ID: %', v_sample_result.id;
    RAISE NOTICE '   - PageStart: %', v_sample_result.metadata->>'pageStart';
    RAISE NOTICE '   - PageEnd: %', v_sample_result.metadata->>'pageEnd';
    RAISE NOTICE '   - Tiene embedding: %', CASE WHEN v_sample_result.embedding IS NOT NULL THEN 'Sí' ELSE 'No' END;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR al probar la función: %', SQLERRM;
    RAISE NOTICE '   Detalles: %', SQLSTATE;
END $$;

-- 6. Resumen final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE VERIFICACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Si todos los tests pasaron, la función está lista para usar.';
  RAISE NOTICE '';
  RAISE NOTICE 'Para probar manualmente con un curso específico:';
  RAISE NOTICE 'SELECT * FROM get_chunks_in_page_range(';
  RAISE NOTICE '  p_course_id := [TU_COURSE_ID],';
  RAISE NOTICE '  p_page_start := 1,';
  RAISE NOTICE '  p_page_end := 50,';
  RAISE NOTICE '  p_limit := 10';
  RAISE NOTICE ');';
  RAISE NOTICE '========================================';
END $$;

