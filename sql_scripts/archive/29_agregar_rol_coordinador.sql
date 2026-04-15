-- ============================================
-- AGREGAR ROL COORDINADOR
-- ============================================
-- Ejecutar este script ANTES de Fase 1 si el rol coordinator no existe
-- ============================================

-- Verificar si el rol existe, si no, agregarlo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'coordinator') THEN
    INSERT INTO public.roles (name, description)
    VALUES ('coordinator', 'Coordinador académico responsable de gestionar carreras y materias');
    
    RAISE NOTICE '✓ Rol coordinator agregado exitosamente';
  ELSE
    RAISE NOTICE 'ℹ️ Rol coordinator ya existe';
  END IF;
END $$;

-- Verificar resultado
SELECT id, name, description 
FROM public.roles 
WHERE name = 'coordinator';

