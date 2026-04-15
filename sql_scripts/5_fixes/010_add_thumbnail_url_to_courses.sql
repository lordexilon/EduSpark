-- 010_add_thumbnail_url_to_courses.sql
-- Agrega la columna thumbnail_url a la tabla courses para parametrizar las imágenes
-- de las tarjetas de curso en los dashboards.

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Comentario explicativo
COMMENT ON COLUMN public.courses.thumbnail_url IS 'URL de la imagen de portada o miniatura del curso';

-- Verificar si se agregó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'thumbnail_url'
    ) THEN
        RAISE NOTICE '✅ Columna thumbnail_url agregada correctamente a la tabla courses';
    ELSE
        RAISE NOTICE '❌ No se pudo agregar la columna thumbnail_url';
    END IF;
END $$;
