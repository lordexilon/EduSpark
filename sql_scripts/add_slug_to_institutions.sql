-- add_slug_to_institutions.sql
-- Agregar columna slug a la tabla institutions para URLs amigables
-- Ejecutar en Editor SQL de Supabase

-- 1. Agregar columna slug
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Crear índice único (opcional pero recomendado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);

-- 3. Actualizar slugs existentes basados en el nombre (por defecto)
-- Convierte "Nombre Ejemplo" a "nombre-ejemplo"
UPDATE public.institutions 
SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) 
WHERE slug IS NULL;

-- 4. Asignar explícitamente el slug 'cec' a la institución ID 2 ("Centro de Estudio Cavavelos")
-- Esto permitirá acceder mediante /cec
UPDATE public.institutions SET slug = 'cec' WHERE id = 2;

-- Verificación
SELECT id, name, slug FROM public.institutions;
