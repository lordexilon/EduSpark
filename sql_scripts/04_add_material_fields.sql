-- Script para agregar campos adicionales a la tabla materials
-- para mejor organización de materiales RAG y de descarga

-- Agregar campo rag_status para rastrear el estado de procesamiento RAG
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS rag_status TEXT CHECK (rag_status IN ('pending', 'processing', 'completed', 'failed', NULL));

-- Agregar campo category para categorizar materiales (book, bibliography, syllabus, exam, pamphlet, other)
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('book', 'bibliography', 'syllabus', 'exam', 'pamphlet', 'other', NULL));

-- Agregar campo purpose para distinguir entre materiales para RAG y para descargar
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS purpose TEXT CHECK (purpose IN ('rag', 'download', 'both', NULL)) DEFAULT 'download';

-- Agregar campo processed_at para rastrear cuándo se completó el procesamiento RAG
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Agregar campo rag_error para almacenar mensajes de error del procesamiento
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS rag_error TEXT;

-- Crear índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_materials_rag_status ON public.materials(rag_status) WHERE rag_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_purpose ON public.materials(purpose);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_course_purpose ON public.materials(course_id, purpose);

-- Comentarios para documentación
COMMENT ON COLUMN public.materials.rag_status IS 'Estado del procesamiento RAG: pending, processing, completed, failed';
COMMENT ON COLUMN public.materials.category IS 'Categoría del material: book (libro), bibliography (bibliografía), syllabus (temario), exam (examen), pamphlet (folleto), other (otro)';
COMMENT ON COLUMN public.materials.purpose IS 'Propósito del material: rag (solo para RAG), download (solo descarga), both (ambos)';
COMMENT ON COLUMN public.materials.processed_at IS 'Fecha y hora en que se completó el procesamiento RAG';
COMMENT ON COLUMN public.materials.rag_error IS 'Mensaje de error si el procesamiento RAG falló';

