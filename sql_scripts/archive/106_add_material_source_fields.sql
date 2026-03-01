-- =====================================================
-- AGREGAR CAMPOS DE ORIGEN A MATERIALS
-- =====================================================
-- Este script agrega campos para distinguir entre materiales
-- almacenados en buckets (para procesamiento RAG) y Google Drive (solo visualización)

-- Agregar campos al metadata JSONB si no existen
-- Los materiales pueden tener:
-- metadata.source: 'bucket' | 'google_drive'
-- metadata.sourceFileId: ID del archivo en Google Drive (si aplica)
-- metadata.bucketPath: Ruta en el bucket de Supabase (si aplica)
-- metadata.processed: true/false (si está procesado para RAG)
-- metadata.processedDocumentId: ID en processed_documents (si está procesado)

-- Nota: Como metadata es JSONB, no necesitamos agregar columnas,
-- pero podemos crear índices para búsquedas eficientes

-- Crear índice B-tree para búsquedas por source en metadata (igualdad exacta)
-- B-tree es más eficiente que GIN para búsquedas de igualdad en campos TEXT extraídos de JSONB
CREATE INDEX IF NOT EXISTS idx_materials_metadata_source 
ON materials ((metadata->>'source'));

-- Crear índice B-tree para búsquedas por processed en metadata
CREATE INDEX IF NOT EXISTS idx_materials_metadata_processed 
ON materials ((metadata->>'processed'));

-- Crear índice GIN completo sobre metadata para búsquedas complejas en JSONB
-- Este índice permite búsquedas más complejas en todo el objeto JSONB
CREATE INDEX IF NOT EXISTS idx_materials_metadata_gin 
ON materials USING GIN (metadata);

-- Función helper para obtener materiales por source
CREATE OR REPLACE FUNCTION get_materials_by_source(p_source TEXT)
RETURNS TABLE (
  id UUID,
  course_id INTEGER,
  title TEXT,
  kind TEXT,
  url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.course_id,
    m.title,
    m.kind,
    m.url,
    m.metadata,
    m.created_at
  FROM materials m
  WHERE m.metadata->>'source' = p_source
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION get_materials_by_source IS 'Obtiene materiales filtrados por origen (bucket o google_drive)';
COMMENT ON INDEX idx_materials_metadata_source IS 'Índice para búsquedas eficientes por source en metadata';
COMMENT ON INDEX idx_materials_metadata_processed IS 'Índice para búsquedas eficientes por processed en metadata';

-- Notificación
DO $$
BEGIN
    RAISE NOTICE 'Campos de origen agregados a materials (via metadata JSONB)';
    RAISE NOTICE 'Indices GIN creados para búsquedas eficientes';
END $$;

