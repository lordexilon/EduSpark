-- MVP_PLAN/data_model.sql
-- Modelo mínimo para anclar Tutor a curso/módulo y vistas de administración

-- Nota: Usa IF NOT EXISTS para no romper ambientes existentes

-- 1) Tabla de módulos de curso
CREATE TABLE IF NOT EXISTS public.course_modules (
  id            bigserial PRIMARY KEY,
  course_id     bigint NOT NULL,
  name          text NOT NULL,
  "order"       integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- FK a courses(id) si existe la tabla courses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'courses'
  ) THEN
    ALTER TABLE public.course_modules
      ADD CONSTRAINT course_modules_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- FK ya existe
  NULL;
END $$;

-- 2) Enrollments (matrículas) vinculando usuarios con cursos
-- Nota: user_id referencia a auth.users (uuid). No se puede crear FK directo desde esquema public
-- sin permisos; se deja documentado y se mantiene integridad a nivel aplicación/RLS.
CREATE TABLE IF NOT EXISTS public.enrollments (
  id            bigserial PRIMARY KEY,
  course_id     bigint NOT NULL,
  user_id       uuid NOT NULL,
  role          text NOT NULL CHECK (role IN ('student','teacher','assistant')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id, role)
);

-- Asegurar compatibilidad si la tabla ya existía sin la columna "role"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.enrollments ADD COLUMN role text;
  END IF;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

-- Asegurar compatibilidad si la tabla ya existía sin la columna "user_id"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'enrollments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.enrollments ADD COLUMN user_id uuid;
  END IF;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

-- Crear UNIQUE(course_id, user_id, role) si no existe (para tablas antiguas)
DO $$
BEGIN
  -- Solo crear la UNIQUE si existen las columnas necesarias
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'course_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'role'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_constraint
      WHERE  conrelid = 'public.enrollments'::regclass
      AND    contype = 'u'
      AND    conname = 'enrollments_course_user_role_key'
    ) THEN
      BEGIN
        ALTER TABLE public.enrollments
        ADD CONSTRAINT enrollments_course_user_role_key UNIQUE (course_id, user_id, role);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'courses'
  ) THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- FK opcional a public.users(id) si existe (alineado con schema_actual)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 3) Vistas para administración

-- Vista de cursos con conteo de estudiantes y módulos
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

-- Vista de módulos por docente
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

-- 4) Seeds mínimos (seguros) para pruebas
-- Si no existe curso demo, se crea
INSERT INTO public.courses (title, code, description)
SELECT 'Cursillo de Ingreso - Medicina', 'MED-ING', 'Curso base para nivelación (demo)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.courses WHERE code = 'MED-ING'
);

-- Insertar módulos demo si no existen para el curso MED-ING
WITH demo_course AS (
  SELECT id FROM public.courses WHERE code = 'MED-ING' LIMIT 1
)
INSERT INTO public.course_modules (course_id, name, "order")
SELECT dc.id, x.name, x.ord
FROM demo_course dc,
LATERAL (VALUES
  ('Comunicación', 1),
  ('Matemática', 2),
  ('Química', 3),
  ('Biología', 4),
  ('Anatomía', 5),
  ('Psicotécnico', 6)
) AS x(name, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.course_modules cm 
  WHERE cm.course_id = dc.id
);

-- 5) Indices útiles
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);

-- Definir la función de forma idempotente
CREATE OR REPLACE FUNCTION public.set_updated_at_course_modules()
RETURNS trigger AS $func$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Asegurar el trigger (borrar si existe y recrear)
DROP TRIGGER IF EXISTS trg_set_updated_at_course_modules ON public.course_modules;
CREATE TRIGGER trg_set_updated_at_course_modules
BEFORE UPDATE ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_course_modules();

-- 7) Notas RLS (a implementar fuera de este script si es necesario)
-- - Admin: lectura total de vistas/tablas.
-- - Docente: lectura/escritura de modules del curso donde es teacher.
-- - Estudiante: lectura de modules del curso donde está enrolado.


