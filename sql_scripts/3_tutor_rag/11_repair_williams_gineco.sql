
-- Reparar estado RAG de Williams Gineco.pdf
-- Ejecutar este comando en el editor SQL de Supabase

-- 1. Verificar el material
SELECT id, title, rag_status, metadata FROM materials WHERE title = 'Williams Gineco.pdf';

-- 2. Si el material existe y el tutor ya responde bien, marcarlo como completado manualmente
UPDATE materials 
SET 
  rag_status = 'completed',
  processed_at = NOW(),
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"ragProcessed": true, "manualFix": true}'::jsonb
WHERE title = 'Williams Gineco.pdf' AND rag_status = 'failed';

-- 3. Marcar también los jobs relacionados como completados para evitar que la UI los muestre como fallidos
UPDATE file_processing_jobs
SET status = 'completed'
WHERE file_name = 'Williams Gineco.pdf' AND status = 'failed';

-- 4. Opcional: Si los chunks no aparecen contados, es por el tema del casing (materialId vs material_id)
-- Este comando actualiza los chunks ya existentes para que la UI los cuente
UPDATE course_content_chunks
SET metadata = metadata || jsonb_build_object('material_id', (SELECT id FROM materials WHERE title = 'Williams Gineco.pdf'))
WHERE metadata->>'sourceFileName' = 'Williams Gineco.pdf'
AND (metadata->>'material_id' IS NULL OR metadata->>'material_id' = '');
