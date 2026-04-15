-- Agregar columnas para soporte de Supabase Storage
ALTER TABLE processed_documents 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS original_source TEXT DEFAULT 'google_drive' CHECK (original_source IN ('google_drive', 'supabase', 'upload'));

-- Comentarios
COMMENT ON COLUMN processed_documents.storage_path IS 'Ruta relativa del archivo en el bucket de Supabase Storage';
COMMENT ON COLUMN processed_documents.original_source IS 'Origen del archivo: google_drive, supabase (migrado) o upload (nuevo)';

-- Notificación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla processed_documents actualizada con columnas storage_path y original_source';
END $$;
