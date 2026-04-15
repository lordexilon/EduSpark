-- 01_schema_courses_compatible.sql
-- Script compatible con el esquema actual (UUID para todas las tablas nuevas)

-- Crear tabla courses con UUID (compatible con users.id)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text unique,
  description text,
  teacher_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON public.courses(teacher_id);

-- Crear tabla course_units
CREATE TABLE IF NOT EXISTS public.course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  number int not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_course_units_course ON public.course_units(course_id);

-- Crear tabla sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid references public.course_units(id) on delete set null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_course_unit ON public.sessions(course_id, unit_id);

-- Crear tabla materials
CREATE TABLE IF NOT EXISTS public.materials (
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

CREATE INDEX IF NOT EXISTS idx_materials_rel ON public.materials(course_id, unit_id, session_id);
