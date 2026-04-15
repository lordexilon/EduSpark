-- 01_schema_courses.sql
-- Tablas base para cursos, unidades, sesiones y materiales

-- Verificar si la tabla courses existe y tiene la estructura correcta
DO $$
BEGIN
  -- Si la tabla no existe, crearla
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    CREATE TABLE public.courses (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      code text unique,
      description text,
      teacher_id uuid not null,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  ELSE
    -- Si existe pero no tiene teacher_id, agregarlo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'teacher_id') THEN
      ALTER TABLE public.courses ADD COLUMN teacher_id uuid;
    END IF;
    
    -- Si existe pero no tiene status, agregarlo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'status') THEN
      ALTER TABLE public.courses ADD COLUMN status text not null default 'active';
    END IF;
  END IF;
END $$;

create index if not exists idx_courses_teacher on public.courses(teacher_id);

create table if not exists public.course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  number int not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_units_course on public.course_units(course_id);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid references public.course_units(id) on delete set null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_course_unit on public.sessions(course_id, unit_id);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid references public.course_units(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  title text not null,
  kind text not null, -- markdown | pdf | link | video | other
  url text,
  mime_type text,
  size_bytes bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_materials_rel on public.materials(course_id, unit_id, session_id);
