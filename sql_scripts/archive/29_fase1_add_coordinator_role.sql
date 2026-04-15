-- ============================================
-- FASE 1: AGREGAR ROL COORDINADOR
-- ============================================
-- Este script verifica y crea el rol 'coordinator' 
-- si no existe, necesario para las políticas RLS
-- ============================================

-- Verificar si el rol coordinator existe
DO $$
BEGIN
  -- Si no existe, insertarlo
  IF NOT EXISTS (
    SELECT 1 FROM public.roles WHERE name = 'coordinator'
  ) THEN
    INSERT INTO public.roles (name, description)
    VALUES ('coordinator', 'Coordinador de carrera');
    
    RAISE NOTICE '✓ Rol coordinator creado';
  ELSE
    RAISE NOTICE '✓ Rol coordinator ya existe';
  END IF;
END $$;

-- Verificar todos los roles
SELECT id, name, description 
FROM public.roles 
ORDER BY id;

