-- sql_scripts/add_material_categories.sql
-- Agregar categorías de materiales y campos relacionados

-- Agregar columna de categoría a materials si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.materials 
    ADD COLUMN category text CHECK (category IN ('book', 'bibliography', 'syllabus', 'other'));
    
    COMMENT ON COLUMN public.materials.category IS 
    'Categoría del material: book (libro), bibliography (bibliografía), syllabus (temario), other (otro)';
  END IF;
END $$;

-- Agregar columna de estado de procesamiento RAG
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'rag_status'
  ) THEN
    ALTER TABLE public.materials 
    ADD COLUMN rag_status text DEFAULT 'pending' CHECK (rag_status IN ('pending', 'processing', 'completed', 'failed'));
    
    COMMENT ON COLUMN public.materials.rag_status IS 
    'Estado del procesamiento RAG: pending, processing, completed, failed';
  END IF;
END $$;

-- Agregar columna de job_id de Firestore para tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'processing_job_id'
  ) THEN
    ALTER TABLE public.materials 
    ADD COLUMN processing_job_id text;
    
    COMMENT ON COLUMN public.materials.processing_job_id IS 
    'ID del trabajo de procesamiento en Firestore para tracking';
  END IF;
END $$;

-- Agregar índice para búsqueda por categoría y estado
CREATE INDEX IF NOT EXISTS idx_materials_category_rag 
ON public.materials(course_id, category, rag_status);

-- Agregar columna metadata a course_content_chunks si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_content_chunks' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.course_content_chunks 
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN public.course_content_chunks.metadata IS 
    'Metadata del chunk incluye: sourceFileName, pageStart, pageEnd, chunkIndex, pdfType, ocrUsed, category (book|bibliography|syllabus|other)';
  ELSE
    -- Si ya existe, solo actualizar el comentario
    COMMENT ON COLUMN public.course_content_chunks.metadata IS 
    'Metadata del chunk incluye: sourceFileName, pageStart, pageEnd, chunkIndex, pdfType, ocrUsed, category (book|bibliography|syllabus|other)';
  END IF;
END $$;

