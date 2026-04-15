-- =====================================================
-- Script para agregar columnas de permisos a la tabla materials
-- Permite controlar descarga, visualización e impresión de materiales
-- =====================================================

-- Agregar columnas de permisos si no existen
DO $$
BEGIN
  -- Columna allow_download (permitir descarga)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'allow_download'
  ) THEN
    ALTER TABLE public.materials 
    ADD COLUMN allow_download boolean DEFAULT true;
    
    COMMENT ON COLUMN public.materials.allow_download IS 'Permite descargar el material. Por defecto true.';
  END IF;

  -- Columna allow_view (permitir visualización en plataforma)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'allow_view'
  ) THEN
    ALTER TABLE public.materials 
    ADD COLUMN allow_view boolean DEFAULT true;
    
    COMMENT ON COLUMN public.materials.allow_view IS 'Permite visualizar el material en la plataforma. Por defecto true.';
  END IF;

  -- Columna allow_print (permitir impresión)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'allow_print'
  ) THEN
    ALTER TABLE public.materials 
    ADD COLUMN allow_print boolean DEFAULT true;
    
    COMMENT ON COLUMN public.materials.allow_print IS 'Permite imprimir el material. Por defecto true.';
  END IF;
END $$;

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'materials'
  AND column_name IN ('allow_download', 'allow_view', 'allow_print')
ORDER BY column_name;

