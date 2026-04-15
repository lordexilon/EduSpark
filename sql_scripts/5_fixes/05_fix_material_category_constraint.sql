-- Script para corregir el constraint de categoría en materials
-- Este script maneja el caso donde la columna category ya existe sin constraint

-- Primero, eliminar el constraint si existe (por si acaso)
DO $$
BEGIN
  -- Intentar eliminar constraint si existe
  ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_category_check;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- El constraint no existe, continuar
END $$;

-- Si la columna existe pero no tiene constraint, agregarlo
DO $$
BEGIN
  -- Verificar si la columna existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'category'
  ) THEN
    -- Agregar constraint a la columna existente
    ALTER TABLE public.materials 
    ADD CONSTRAINT materials_category_check 
    CHECK (category IS NULL OR category IN ('book', 'bibliography', 'syllabus', 'exam', 'pamphlet', 'other'));
  ELSE
    -- Si la columna no existe, crearla con el constraint
    ALTER TABLE public.materials 
    ADD COLUMN category TEXT 
    CONSTRAINT materials_category_check 
    CHECK (category IS NULL OR category IN ('book', 'bibliography', 'syllabus', 'exam', 'pamphlet', 'other'));
  END IF;
END $$;

-- Verificar que el constraint se aplicó correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'materials' 
    AND constraint_name = 'materials_category_check'
  ) THEN
    RAISE EXCEPTION 'No se pudo crear el constraint materials_category_check';
  END IF;
END $$;

-- Comentario para documentación
COMMENT ON COLUMN public.materials.category IS 'Categoría del material: book (libro), bibliography (bibliografía), syllabus (temario), exam (examen), pamphlet (folleto), other (otro)';

