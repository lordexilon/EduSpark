-- add_slug_to_institutions_v2.sql
-- Versión corregida para manejar nombres duplicados y evitar errores de "unique constraint"
-- Ejecutar en Editor SQL de Supabase

-- 1. Agregar columna slug si no existe
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Eliminar el índice si existe para evitar conflictos durante la actualización
DROP INDEX IF EXISTS idx_institutions_slug;

-- 3. Asignar explícitamente el slug 'cec' a la institución ID 2
UPDATE public.institutions 
SET slug = 'cec' 
WHERE id = 2;

-- 4. Actualizar el resto de slugs
-- Para garantizar unicidad (ej: hay varios "EduSpark University"), concatenamos el ID
-- Ejemplo: "eduspark-university-5"
UPDATE public.institutions 
SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) || '-' || id
WHERE slug IS NULL;

-- 5. Crear índice único ahora que los datos están limpios y son únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);

-- Verificación
SELECT id, name, slug FROM public.institutions;
