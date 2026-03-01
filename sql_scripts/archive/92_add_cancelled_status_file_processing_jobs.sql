-- Agregar 'cancelled' como estado válido para file_processing_jobs
-- Ejecutar en el SQL Editor de Supabase

-- Verificar el constraint actual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.file_processing_jobs'::regclass
AND contype = 'c'
AND conname LIKE '%status%';

-- Eliminar el constraint antiguo
ALTER TABLE public.file_processing_jobs
DROP CONSTRAINT IF EXISTS file_processing_jobs_status_check;

-- Crear nuevo constraint con 'cancelled' incluido
ALTER TABLE public.file_processing_jobs
ADD CONSTRAINT file_processing_jobs_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Verificar que el constraint se creó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.file_processing_jobs'::regclass
AND contype = 'c'
AND conname = 'file_processing_jobs_status_check';

