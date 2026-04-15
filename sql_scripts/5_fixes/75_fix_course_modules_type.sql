-- =====================================================
-- Corregir tipo de datos en course_modules.course_id
-- Problema: course_modules.course_id es BIGINT pero courses.id es INTEGER
-- =====================================================

-- Verificar el tipo actual
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'course_modules'
    AND column_name = 'course_id';

-- Verificar si hay datos que puedan causar problemas
SELECT 
    COUNT(*) as total_modules,
    COUNT(DISTINCT course_id) as unique_course_ids
FROM course_modules;

-- Verificar que todos los course_id existen en courses
SELECT 
    cm.id,
    cm.course_id,
    c.id as course_exists
FROM course_modules cm
LEFT JOIN courses c ON c.id = cm.course_id::INTEGER
WHERE c.id IS NULL;

-- Si hay registros con course_id que no existen en courses, esto mostrará problemas
-- Si todo está bien, proceder con el cambio:

-- ⚠️ IMPORTANTE: Primero debemos eliminar las vistas y políticas RLS que dependen de course_modules
-- Paso 0a: Eliminar vistas que dependen de course_modules
-- Nota: CASCADE eliminará también dependencias indirectas si existen
DROP VIEW IF EXISTS public.vw_admin_modules_by_teacher CASCADE;
DROP VIEW IF EXISTS public.vw_admin_course_overview CASCADE;

-- Paso 0b: Eliminar todas las políticas RLS de course_modules
-- Estas políticas dependen de course_modules.course_id y deben eliminarse antes del cambio
DROP POLICY IF EXISTS "modules_admin_all" ON public.course_modules;
DROP POLICY IF EXISTS "modules_owner_rw" ON public.course_modules;
DROP POLICY IF EXISTS "cm_ins_roles" ON public.course_modules;
DROP POLICY IF EXISTS "cm_sel_auth" ON public.course_modules;
DROP POLICY IF EXISTS "cm_upd_roles" ON public.course_modules;
-- Eliminar cualquier otra política que pueda existir
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'course_modules' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_modules', pol.policyname);
    END LOOP;
END $$;

-- Paso 1: Eliminar foreign key constraint si existe
ALTER TABLE course_modules 
DROP CONSTRAINT IF EXISTS course_modules_course_id_fkey;

-- Paso 2: Cambiar el tipo de course_id a INTEGER
ALTER TABLE course_modules 
ALTER COLUMN course_id TYPE INTEGER USING course_id::INTEGER;

-- Paso 3: Recrear foreign key constraint
ALTER TABLE course_modules 
ADD CONSTRAINT course_modules_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Paso 4: Recrear las vistas eliminadas

-- Recrear vista vw_admin_course_overview
CREATE OR REPLACE VIEW public.vw_admin_course_overview AS
SELECT 
  c.id AS course_id,
  c.title AS course_title,
  c.code AS course_code,
  c.description AS course_description,
  c.teacher_id,
  COALESCE(cnt_s.student_count, 0) AS student_count,
  COALESCE(cnt_m.module_count, 0) AS module_count
FROM public.courses c
LEFT JOIN (
  SELECT course_id, COUNT(*)::int AS student_count
  FROM public.enrollments e
  WHERE e.role = 'student'
  GROUP BY course_id
) cnt_s ON cnt_s.course_id = c.id
LEFT JOIN (
  SELECT course_id, COUNT(*)::int AS module_count
  FROM public.course_modules
  GROUP BY course_id
) cnt_m ON cnt_m.course_id = c.id;

-- Recrear vista vw_admin_modules_by_teacher
CREATE OR REPLACE VIEW public.vw_admin_modules_by_teacher AS
SELECT 
  c.teacher_id,
  c.id AS course_id,
  cm.id AS module_id,
  cm.name AS module_name,
  cm."order",
  cm.is_active
FROM public.courses c
JOIN public.course_modules cm ON cm.course_id = c.id;

-- Paso 5: Recrear las políticas RLS de course_modules

-- Verificar que RLS esté habilitado
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Política para admin: acceso total
CREATE POLICY "modules_admin_all" ON public.course_modules
  FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Política para docentes: pueden leer y escribir módulos de sus cursos
CREATE POLICY "modules_owner_rw" ON public.course_modules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_modules.course_id 
      AND c.teacher_id = auth.uid()
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_modules.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Políticas adicionales que pueden existir (recrearlas solo si no existen)
-- Política para lectura autenticada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'course_modules' 
        AND policyname = 'cm_sel_auth'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "cm_sel_auth" ON public.course_modules
          FOR SELECT
          USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Política para inserción por roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'course_modules' 
        AND policyname = 'cm_ins_roles'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "cm_ins_roles" ON public.course_modules
          FOR INSERT
          WITH CHECK (public.is_admin_or_teacher());
    END IF;
END $$;

-- Política para actualización por roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'course_modules' 
        AND policyname = 'cm_upd_roles'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "cm_upd_roles" ON public.course_modules
          FOR UPDATE
          USING (public.is_admin_or_teacher())
          WITH CHECK (public.is_admin_or_teacher());
    END IF;
END $$;

-- Verificar que el cambio se aplicó correctamente
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'course_modules'
    AND column_name = 'course_id';

-- Verificar que la foreign key funciona
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'course_modules'
    AND kcu.column_name = 'course_id';

