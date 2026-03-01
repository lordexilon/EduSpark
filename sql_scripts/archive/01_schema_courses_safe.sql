-- 01_schema_courses_safe.sql
-- Script seguro que verifica y modifica la estructura existente

-- Verificar si la tabla courses existe y su estructura
DO $$
BEGIN
  -- Si la tabla no existe, crearla
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    CREATE TABLE public.courses (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      code text unique,
      description text,
      teacher_id uuid not null references public.users(id) on delete cascade,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  ELSE
    -- Si existe, verificar y agregar columnas faltantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'teacher_id') THEN
      ALTER TABLE public.courses ADD COLUMN teacher_id uuid references public.users(id) on delete cascade;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'status') THEN
      ALTER TABLE public.courses ADD COLUMN status text not null default 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'code') THEN
      ALTER TABLE public.courses ADD COLUMN code text unique;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'description') THEN
      ALTER TABLE public.courses ADD COLUMN description text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'updated_at') THEN
      ALTER TABLE public.courses ADD COLUMN updated_at timestamptz not null default now();
    END IF;
  END IF;
END $$;

-- Crear índices si no existen
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
