-- Crear tabla para trabajos de procesamiento de archivos (RAG)
CREATE TABLE IF NOT EXISTS public.file_processing_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    course_id BIGINT REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) DEFAULT auth.uid(),
    bucket_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Eliminar políticas existentes si existen (para poder recrearlas)
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.file_processing_jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.file_processing_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.file_processing_jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.file_processing_jobs;

-- Permitir ver sus propios trabajos
CREATE POLICY "Users can view their own jobs" ON public.file_processing_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- Permitir insertar trabajos (para el usuario autenticado)
CREATE POLICY "Users can insert their own jobs" ON public.file_processing_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir actualizar sus propios trabajos (opcional, por si necesitan cancelar)
CREATE POLICY "Users can update their own jobs" ON public.file_processing_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Permitir eliminar sus propios trabajos
CREATE POLICY "Users can delete own jobs" ON public.file_processing_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_user_id ON public.file_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_status ON public.file_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_material_id ON public.file_processing_jobs(material_id);
