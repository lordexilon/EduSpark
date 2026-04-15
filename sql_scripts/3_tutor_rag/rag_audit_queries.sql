-- =====================================================
-- AUDITORÍA DEL SISTEMA RAG - Queries de Verificación
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2024-12-22
-- =====================================================

-- =====================================================
-- 1. RESUMEN GENERAL DEL SISTEMA RAG
-- =====================================================
SELECT 
  '📊 RESUMEN GENERAL' as seccion,
  (SELECT COUNT(DISTINCT course_id) FROM course_content_chunks) as cursos_con_chunks,
  (SELECT COUNT(*) FROM course_content_chunks) as total_chunks,
  (SELECT COUNT(*) FROM course_content_chunks WHERE embedding IS NOT NULL) as chunks_con_embedding,
  (SELECT COUNT(*) FROM course_content_chunks WHERE embedding IS NULL) as chunks_sin_embedding,
  (SELECT COUNT(DISTINCT metadata->>'material_id') FROM course_content_chunks WHERE metadata->>'material_id' IS NOT NULL) as materiales_procesados;

-- =====================================================
-- 2. DOCUMENTOS PROCESADOS POR CURSO
-- =====================================================
SELECT 
  c.id as curso_id,
  c.title as curso_nombre,
  COUNT(DISTINCT ccc.id) as total_chunks,
  COUNT(DISTINCT ccc.metadata->>'material_id') as materiales_procesados,
  COUNT(DISTINCT CASE WHEN ccc.embedding IS NOT NULL THEN ccc.id END) as chunks_con_embedding,
  ROUND(
    COUNT(DISTINCT CASE WHEN ccc.embedding IS NOT NULL THEN ccc.id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT ccc.id), 0) * 100, 2
  ) as porcentaje_embeddings
FROM courses c
LEFT JOIN course_content_chunks ccc ON ccc.course_id = c.id
GROUP BY c.id, c.title
ORDER BY total_chunks DESC;

-- =====================================================
-- 3. CHUNKS CON INFORMACIÓN DE PÁGINAS
-- =====================================================
SELECT 
  '📄 CHUNKS CON PÁGINAS' as seccion,
  COUNT(*) as chunks_con_paginas,
  COUNT(CASE WHEN metadata->>'pageStart' IS NOT NULL THEN 1 END) as con_pageStart,
  COUNT(CASE WHEN metadata->>'pageEnd' IS NOT NULL THEN 1 END) as con_pageEnd,
  COUNT(CASE WHEN metadata->>'page_start' IS NOT NULL THEN 1 END) as con_page_start,
  COUNT(CASE WHEN metadata->>'page_end' IS NOT NULL THEN 1 END) as con_page_end,
  COUNT(CASE WHEN metadata->>'pageStart' IS NULL AND metadata->>'page_start' IS NULL THEN 1 END) as sin_info_paginas
FROM course_content_chunks;

-- =====================================================
-- 4. MUESTRA DE METADATA DE CHUNKS (primeros 10)
-- =====================================================
SELECT 
  id,
  course_id,
  chunk_index,
  LEFT(content, 100) as contenido_preview,
  metadata->>'material_id' as material_id,
  metadata->>'pageStart' as page_start,
  metadata->>'pageEnd' as page_end,
  metadata->>'sourceFileId' as source_file_id,
  metadata->>'pdfType' as pdf_type,
  metadata->>'category' as categoria,
  CASE WHEN embedding IS NOT NULL THEN '✅' ELSE '❌' END as tiene_embedding
FROM course_content_chunks
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 5. MATERIALES CON Y SIN CHUNKS PROCESADOS
-- =====================================================
SELECT 
  m.id as material_id,
  m.title as material_titulo,
  m.course_id,
  c.title as curso_nombre,
  m.rag_status,
  m.kind,
  m.category,
  m.processed_at,
  COUNT(ccc.id) as chunks_count,
  CASE 
    WHEN COUNT(ccc.id) = 0 THEN '❌ Sin chunks'
    WHEN COUNT(ccc.id) > 0 AND COUNT(NULLIF(ccc.embedding IS NULL, false)) > 0 THEN '⚠️ Faltan embeddings'
    ELSE '✅ Completo'
  END as estado
FROM materials m
LEFT JOIN courses c ON c.id = m.course_id
LEFT JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.kind = 'pdf' OR m.purpose IN ('rag', 'both')
GROUP BY m.id, m.title, m.course_id, c.title, m.rag_status, m.kind, m.category, m.processed_at
ORDER BY chunks_count ASC, m.course_id;

-- =====================================================
-- 6. MATERIALES PENDIENTES DE PROCESAMIENTO
-- =====================================================
SELECT 
  m.id,
  m.title,
  m.course_id,
  c.title as curso_nombre,
  m.kind,
  m.rag_status,
  m.created_at,
  m.metadata->>'sourceFileId' as drive_file_id
FROM materials m
LEFT JOIN courses c ON c.id = m.course_id
WHERE m.rag_status IN ('pending', 'failed')
  AND (m.kind = 'pdf' OR m.purpose IN ('rag', 'both'))
ORDER BY m.created_at DESC;

-- =====================================================
-- 7. VERIFICAR ASOCIACIÓN UNIDAD/SESIÓN EN CHUNKS
-- =====================================================
SELECT 
  ccc.course_id,
  ccc.unit_id,
  ccc.session_id,
  u.title as unidad_nombre,
  s.title as sesion_nombre,
  COUNT(*) as chunks_count
FROM course_content_chunks ccc
LEFT JOIN course_units u ON u.id = ccc.unit_id
LEFT JOIN sessions s ON s.id = ccc.session_id
WHERE ccc.unit_id IS NOT NULL OR ccc.session_id IS NOT NULL
GROUP BY ccc.course_id, ccc.unit_id, ccc.session_id, u.title, s.title
ORDER BY ccc.course_id, chunks_count DESC;

-- =====================================================
-- 8. VERIFICAR DOCUMENT_COURSE_ASSIGNMENTS (Multi-curso)
-- =====================================================
SELECT 
  'Asignaciones documento-curso' as seccion,
  COUNT(*) as total_asignaciones,
  COUNT(DISTINCT document_id) as documentos_asignados,
  COUNT(DISTINCT course_id) as cursos_con_asignaciones
FROM document_course_assignments;

-- Detalle de asignaciones
SELECT 
  dca.document_id,
  pd.title as documento_titulo,
  dca.course_id,
  c.title as curso_nombre
FROM document_course_assignments dca
LEFT JOIN processed_documents pd ON pd.id = dca.document_id
LEFT JOIN courses c ON c.id = dca.course_id
ORDER BY dca.course_id;

-- =====================================================
-- 9. VERIFICAR JOBS DE PROCESAMIENTO (file_processing_jobs)
-- =====================================================
SELECT 
  status,
  COUNT(*) as cantidad,
  MAX(updated_at) as ultima_actualizacion
FROM file_processing_jobs
GROUP BY status
ORDER BY cantidad DESC;

-- Jobs recientes (últimos 10)
SELECT 
  id,
  status,
  file_name,
  material_id,
  created_at,
  updated_at
FROM file_processing_jobs
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 10. PROBAR BÚSQUEDA RAG (modificar término según necesidad)
-- =====================================================
-- Nota: Cambiar 'término de prueba' y el course_id según el curso a auditar
/*
SELECT * FROM search_course_content_chunks_text_clean(
  'neonatal',  -- Término de búsqueda
  12,          -- course_id
  5,           -- límite de resultados
  0.01         -- umbral mínimo de relevancia
);
*/

-- =====================================================
-- 11. VERIFICAR FUNCIONES RPC DISPONIBLES
-- =====================================================
SELECT 
  p.proname as funcion,
  pg_get_function_arguments(p.oid) as argumentos
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%search%chunk%'
ORDER BY p.proname;

-- =====================================================
-- 12. ESTADÍSTICAS DE EMBEDDINGS POR CURSO
-- =====================================================
SELECT 
  course_id,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as con_embedding,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as sin_embedding,
  ROUND(AVG(LENGTH(content))) as avg_content_length
FROM course_content_chunks
GROUP BY course_id
ORDER BY total_chunks DESC;
