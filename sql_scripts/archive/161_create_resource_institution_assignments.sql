-- =====================================================
-- SISTEMA DE ASIGNACIÓN DE RECURSOS A INSTITUCIONES
-- =====================================================
-- Este script crea tablas para asignar recursos (carreras, materias, etc.)
-- a instituciones, permitiendo que el admin cree recursos globales
-- y luego los asigne a instituciones específicas
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. VERIFICAR Y AGREGAR institution_id A TABLAS EXISTENTES
-- =====================================================

-- Agregar institution_id a careers si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'careers' 
    AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.careers 
    ADD COLUMN institution_id INTEGER REFERENCES public.institutions(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_careers_institution ON public.careers(institution_id);
    
    RAISE NOTICE '✅ Columna institution_id agregada a careers';
  ELSE
    RAISE NOTICE 'ℹ️ Columna institution_id ya existe en careers';
  END IF;
END $$;

-- Agregar institution_id a subjects si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subjects' 
    AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.subjects 
    ADD COLUMN institution_id INTEGER REFERENCES public.institutions(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_subjects_institution ON public.subjects(institution_id);
    
    RAISE NOTICE '✅ Columna institution_id agregada a subjects';
  ELSE
    RAISE NOTICE 'ℹ️ Columna institution_id ya existe en subjects';
  END IF;
END $$;

-- =====================================================
-- 2. CREAR TABLA DE ASIGNACIÓN DE CARRERAS A INSTITUCIONES
-- =====================================================
-- Permite que una carrera esté disponible para múltiples instituciones

CREATE TABLE IF NOT EXISTS public.career_institution_assignments (
  id SERIAL PRIMARY KEY,
  career_id INTEGER NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  institution_id INTEGER NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(career_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_career_institution_assignments_career 
  ON public.career_institution_assignments(career_id);
CREATE INDEX IF NOT EXISTS idx_career_institution_assignments_institution 
  ON public.career_institution_assignments(institution_id);

-- =====================================================
-- 3. CREAR TABLA DE ASIGNACIÓN DE MATERIAS A INSTITUCIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subject_institution_assignments (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  institution_id INTEGER NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(subject_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_institution_assignments_subject 
  ON public.subject_institution_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_institution_assignments_institution 
  ON public.subject_institution_assignments(institution_id);

-- =====================================================
-- 4. CREAR FUNCIONES PARA ASIGNAR RECURSOS
-- =====================================================

-- Función para asignar carrera a institución
CREATE OR REPLACE FUNCTION public.assign_career_to_institution(
  p_career_id INTEGER,
  p_institution_id INTEGER,
  p_assigned_by UUID DEFAULT auth.uid(),
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id INTEGER;
BEGIN
  -- Verificar permisos: solo admin puede asignar
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden asignar recursos a instituciones';
  END IF;
  
  -- Insertar o actualizar asignación
  INSERT INTO public.career_institution_assignments (
    career_id,
    institution_id,
    assigned_by,
    notes,
    is_active
  )
  VALUES (
    p_career_id,
    p_institution_id,
    p_assigned_by,
    p_notes,
    true
  )
  ON CONFLICT (career_id, institution_id) 
  DO UPDATE SET
    is_active = true,
    assigned_by = p_assigned_by,
    assigned_at = NOW(),
    notes = COALESCE(p_notes, career_institution_assignments.notes)
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$;

-- Función para asignar materia a institución
CREATE OR REPLACE FUNCTION public.assign_subject_to_institution(
  p_subject_id INTEGER,
  p_institution_id INTEGER,
  p_assigned_by UUID DEFAULT auth.uid(),
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id INTEGER;
BEGIN
  -- Verificar permisos: solo admin puede asignar
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden asignar recursos a instituciones';
  END IF;
  
  -- Insertar o actualizar asignación
  INSERT INTO public.subject_institution_assignments (
    subject_id,
    institution_id,
    assigned_by,
    notes,
    is_active
  )
  VALUES (
    p_subject_id,
    p_institution_id,
    p_assigned_by,
    p_notes,
    true
  )
  ON CONFLICT (subject_id, institution_id) 
  DO UPDATE SET
    is_active = true,
    assigned_by = p_assigned_by,
    assigned_at = NOW(),
    notes = COALESCE(p_notes, subject_institution_assignments.notes)
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$;

-- Función para obtener carreras asignadas a una institución
CREATE OR REPLACE FUNCTION public.get_careers_for_institution(p_institution_id INTEGER)
RETURNS TABLE (
  career_id INTEGER,
  career_name TEXT,
  career_code TEXT,
  is_assigned BOOLEAN,
  assignment_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.code,
    COALESCE(cia.is_active, false) as is_assigned,
    cia.id as assignment_id
  FROM public.careers c
  LEFT JOIN public.career_institution_assignments cia 
    ON cia.career_id = c.id 
    AND cia.institution_id = p_institution_id
    AND cia.is_active = true
  ORDER BY c.name;
END;
$$;

-- Función para obtener materias asignadas a una institución
CREATE OR REPLACE FUNCTION public.get_subjects_for_institution(p_institution_id INTEGER)
RETURNS TABLE (
  subject_id INTEGER,
  subject_name TEXT,
  subject_code TEXT,
  career_id INTEGER,
  is_assigned BOOLEAN,
  assignment_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.code,
    s.career_id,
    COALESCE(sia.is_active, false) as is_assigned,
    sia.id as assignment_id
  FROM public.subjects s
  LEFT JOIN public.subject_institution_assignments sia 
    ON sia.subject_id = s.id 
    AND sia.institution_id = p_institution_id
    AND sia.is_active = true
  ORDER BY s.name;
END;
$$;

-- =====================================================
-- 5. CREAR POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS en las tablas de asignación
ALTER TABLE public.career_institution_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_institution_assignments ENABLE ROW LEVEL SECURITY;

-- Admin ve todas las asignaciones
CREATE POLICY "career_institution_assignments_admin_all" 
  ON public.career_institution_assignments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-campus y coordinator ven asignaciones de su institución
CREATE POLICY "career_institution_assignments_institution_access" 
  ON public.career_institution_assignments
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator()) AND
    public.get_user_institution_id() IS NOT NULL AND
    institution_id = public.get_user_institution_id()
  );

-- Admin ve todas las asignaciones de materias
CREATE POLICY "subject_institution_assignments_admin_all" 
  ON public.subject_institution_assignments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-campus y coordinator ven asignaciones de materias de su institución
CREATE POLICY "subject_institution_assignments_institution_access" 
  ON public.subject_institution_assignments
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator()) AND
    public.get_user_institution_id() IS NOT NULL AND
    institution_id = public.get_user_institution_id()
  );

-- =====================================================
-- 6. OTORGAR PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.assign_career_to_institution(INTEGER, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_subject_to_institution(INTEGER, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_careers_for_institution(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subjects_for_institution(INTEGER) TO authenticated;

-- =====================================================
-- 7. VERIFICACIÓN
-- =====================================================

SELECT 
    'Tablas creadas' as check_type,
    table_name,
    CASE 
        WHEN table_name IN ('career_institution_assignments', 'subject_institution_assignments') 
        THEN '✅ Creada'
        ELSE 'ℹ️ Ya existía'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('career_institution_assignments', 'subject_institution_assignments');

SELECT 
    'Funciones creadas' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'assign_career_to_institution',
    'assign_subject_to_institution',
    'get_careers_for_institution',
    'get_subjects_for_institution'
  )
ORDER BY routine_name;

-- =====================================================
-- 8. NOTA IMPORTANTE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Sistema de asignación de recursos creado';
    RAISE NOTICE '';
    RAISE NOTICE 'Funcionalidades:';
    RAISE NOTICE '  1. Admin puede crear carreras/materias sin institución';
    RAISE NOTICE '  2. Admin puede asignar recursos a instituciones';
    RAISE NOTICE '  3. Admin-campus ve solo recursos asignados a su institución';
    RAISE NOTICE '';
    RAISE NOTICE 'Funciones disponibles:';
    RAISE NOTICE '  - assign_career_to_institution(career_id, institution_id)';
    RAISE NOTICE '  - assign_subject_to_institution(subject_id, institution_id)';
    RAISE NOTICE '  - get_careers_for_institution(institution_id)';
    RAISE NOTICE '  - get_subjects_for_institution(institution_id)';
    RAISE NOTICE '========================================';
END $$;

