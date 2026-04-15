-- 01_schema_courses_fixed.sql
-- Script seguro para crear tablas del módulo docente

-- Eliminar tablas si existen (para empezar limpio)
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.course_units CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;

-- Crear tabla courses
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

-- Crear índices
CREATE INDEX idx_courses_teacher ON public.courses(teacher_id);

-- Crear tabla course_units
CREATE TABLE public.course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  number int not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_course_units_course ON public.course_units(course_id);

-- Crear tabla sessions
CREATE TABLE public.sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid references public.course_units(id) on delete set null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_sessions_course_unit ON public.sessions(course_id, unit_id);

-- Crear tabla materials
CREATE TABLE public.materials (
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

CREATE INDEX idx_materials_rel ON public.materials(course_id, unit_id, session_id);
