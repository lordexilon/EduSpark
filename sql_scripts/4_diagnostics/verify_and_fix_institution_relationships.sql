-- sql_scripts/verify_and_fix_institution_relationships.sql
-- Script para verificar y corregir relaciones con instituciones
-- Asegura que careers, subjects, courses, units, sessions y materials tengan las relaciones correctas
-- 
-- IMPORTANTE: Este script requiere que las funciones helper estén creadas.
-- Si no existen, ejecutar primero: implement_institution_based_roles.sql

-- =====================================================
-- 0. CREAR FUNCIONES HELPER SI NO EXISTEN
-- =====================================================

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  );
$$;

-- Función para obtener la institución primaria del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT institution_id
  FROM public.user_institutions
  WHERE user_id = auth.uid()
    AND is_primary = true
  LIMIT 1;
$$;

-- Función para verificar si el usuario tiene acceso a una institución
CREATE OR REPLACE FUNCTION public.has_institution_access(p_institution_id INTEGER)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    public.is_admin() OR 
    (public.get_user_institution_id() = p_institution_id);
$$;

-- =====================================================
-- 1. VERIFICAR Y AGREGAR institution_id A CAREERS
-- =====================================================

DO $$
BEGIN
  -- Agregar institution_id a careers si no existe
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

-- =====================================================
-- 2. VERIFICAR Y AGREGAR institution_id A SUBJECTS
-- =====================================================

DO $$
BEGIN
  -- Agregar institution_id a subjects si no existe
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
-- 3. MIGRAR DATOS EXISTENTES: ASIGNAR INSTITUCIÓN A CAREERS
-- =====================================================

-- Asignar institution_id a careers basado en el coordinator
UPDATE public.careers
SET institution_id = (
  SELECT ui.institution_id
  FROM public.user_institutions ui
  WHERE ui.user_id = careers.coordinator_id
    AND ui.is_primary = true
  LIMIT 1
)
WHERE institution_id IS NULL
  AND coordinator_id IS NOT NULL;

-- Si aún hay careers sin institución, asignar institución por defecto
UPDATE public.careers
SET institution_id = (
  SELECT id FROM public.institutions 
  WHERE name = 'Institución por Defecto' 
  LIMIT 1
)
WHERE institution_id IS NULL;

-- =====================================================
-- 4. MIGRAR DATOS EXISTENTES: ASIGNAR INSTITUCIÓN A SUBJECTS
-- =====================================================

-- Asignar institution_id a subjects basado en la carrera
UPDATE public.subjects
SET institution_id = (
  SELECT c.institution_id
  FROM public.careers c
  WHERE c.id = subjects.career_id
  LIMIT 1
)
WHERE institution_id IS NULL
  AND career_id IS NOT NULL;

-- Si aún hay subjects sin institución, asignar institución por defecto
UPDATE public.subjects
SET institution_id = (
  SELECT id FROM public.institutions 
  WHERE name = 'Institución por Defecto' 
  LIMIT 1
)
WHERE institution_id IS NULL;

-- =====================================================
-- 5. VERIFICAR RELACIONES DE FOREIGN KEYS
-- =====================================================

DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  -- Verificar foreign keys de courses
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'courses'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'institution_id';
  
  IF fk_count = 0 THEN
    RAISE WARNING '⚠️ courses.institution_id no tiene foreign key constraint';
  ELSE
    RAISE NOTICE '✅ courses.institution_id tiene foreign key correcta';
  END IF;

  -- Verificar foreign keys de course_units
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'course_units'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'course_id';
  
  IF fk_count = 0 THEN
    RAISE WARNING '⚠️ course_units.course_id no tiene foreign key constraint';
  ELSE
    RAISE NOTICE '✅ course_units.course_id tiene foreign key correcta';
  END IF;

  -- Verificar foreign keys de sessions
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'sessions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'course_id';
  
  IF fk_count = 0 THEN
    RAISE WARNING '⚠️ sessions.course_id no tiene foreign key constraint';
  ELSE
    RAISE NOTICE '✅ sessions.course_id tiene foreign key correcta';
  END IF;

  -- Verificar foreign keys de materials
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'materials'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'course_id';
  
  IF fk_count = 0 THEN
    RAISE WARNING '⚠️ materials.course_id no tiene foreign key constraint';
  ELSE
    RAISE NOTICE '✅ materials.course_id tiene foreign key correcta';
  END IF;
END $$;

-- =====================================================
-- 6. ACTUALIZAR POLÍTICAS RLS PARA CAREERS
-- =====================================================

-- Habilitar RLS en careers si no está habilitado
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "careers_admin_all" ON public.careers;
DROP POLICY IF EXISTS "careers_institution_access" ON public.careers;

-- Admin ve todas las carreras
CREATE POLICY "careers_admin_all" ON public.careers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Otros roles ven solo carreras de su institución
CREATE POLICY "careers_institution_access" ON public.careers
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  );

-- =====================================================
-- 7. ACTUALIZAR POLÍTICAS RLS PARA SUBJECTS
-- =====================================================

-- Habilitar RLS en subjects si no está habilitado
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_institution_access" ON public.subjects;

-- Admin ve todas las materias
CREATE POLICY "subjects_admin_all" ON public.subjects
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Otros roles ven solo materias de su institución
CREATE POLICY "subjects_institution_access" ON public.subjects
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  );

-- =====================================================
-- 8. VERIFICAR ÍNDICES
-- =====================================================

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_careers_institution ON public.careers(institution_id);
CREATE INDEX IF NOT EXISTS idx_subjects_institution ON public.subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution ON public.courses(institution_id);

-- =====================================================
-- 9. REPORTE FINAL
-- =====================================================

DO $$
DECLARE
  careers_with_institution INTEGER;
  careers_without_institution INTEGER;
  subjects_with_institution INTEGER;
  subjects_without_institution INTEGER;
  courses_with_institution INTEGER;
  courses_without_institution INTEGER;
BEGIN
  -- Contar careers
  SELECT COUNT(*) INTO careers_with_institution
  FROM public.careers
  WHERE institution_id IS NOT NULL;
  
  SELECT COUNT(*) INTO careers_without_institution
  FROM public.careers
  WHERE institution_id IS NULL;

  -- Contar subjects
  SELECT COUNT(*) INTO subjects_with_institution
  FROM public.subjects
  WHERE institution_id IS NOT NULL;
  
  SELECT COUNT(*) INTO subjects_without_institution
  FROM public.subjects
  WHERE institution_id IS NULL;

  -- Contar courses
  SELECT COUNT(*) INTO courses_with_institution
  FROM public.courses
  WHERE institution_id IS NOT NULL;
  
  SELECT COUNT(*) INTO courses_without_institution
  FROM public.courses
  WHERE institution_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REPORTE DE VERIFICACIÓN DE RELACIONES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CAREERS:';
  RAISE NOTICE '  Con institución: %', careers_with_institution;
  RAISE NOTICE '  Sin institución: %', careers_without_institution;
  RAISE NOTICE '';
  RAISE NOTICE 'SUBJECTS:';
  RAISE NOTICE '  Con institución: %', subjects_with_institution;
  RAISE NOTICE '  Sin institución: %', subjects_without_institution;
  RAISE NOTICE '';
  RAISE NOTICE 'COURSES:';
  RAISE NOTICE '  Con institución: %', courses_with_institution;
  RAISE NOTICE '  Sin institución: %', courses_without_institution;
  RAISE NOTICE '';
  
  IF careers_without_institution > 0 THEN
    RAISE WARNING '⚠️ Hay % carrera(s) sin institución asignada', careers_without_institution;
  END IF;

  IF subjects_without_institution > 0 THEN
    RAISE WARNING '⚠️ Hay % materia(s) sin institución asignada', subjects_without_institution;
  END IF;

  IF courses_without_institution > 0 THEN
    RAISE WARNING '⚠️ Hay % curso(s) sin institución asignada', courses_without_institution;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Verificación completada';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 10. DIAGRAMA DE RELACIONES
-- =====================================================

-- Mostrar estructura de relaciones
SELECT 
  'institutions' as tabla,
  'id' as columna,
  'PRIMARY KEY' as tipo
UNION ALL
SELECT 
  'careers',
  'institution_id',
  'FK -> institutions(id)'
UNION ALL
SELECT 
  'subjects',
  'institution_id',
  'FK -> institutions(id)'
UNION ALL
SELECT 
  'subjects',
  'career_id',
  'FK -> careers(id)'
UNION ALL
SELECT 
  'courses',
  'institution_id',
  'FK -> institutions(id)'
UNION ALL
SELECT 
  'courses',
  'subject_id',
  'FK -> subjects(id)'
UNION ALL
SELECT 
  'course_units',
  'course_id',
  'FK -> courses(id)'
UNION ALL
SELECT 
  'sessions',
  'course_id',
  'FK -> courses(id)'
UNION ALL
SELECT 
  'sessions',
  'unit_id',
  'FK -> course_units(id)'
UNION ALL
SELECT 
  'materials',
  'course_id',
  'FK -> courses(id)'
UNION ALL
SELECT 
  'materials',
  'unit_id',
  'FK -> course_units(id)'
UNION ALL
SELECT 
  'materials',
  'session_id',
  'FK -> sessions(id)';

