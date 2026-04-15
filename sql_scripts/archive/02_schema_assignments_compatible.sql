-- 02_schema_assignments_compatible.sql
-- Script compatible para tareas y entregas

-- Crear tabla assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid references public.course_units(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  max_points numeric(5,2) default 100,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_rel ON public.assignments(course_id, unit_id, session_id);

-- Crear tabla assignment_submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  url text,
  text text,
  grade numeric(5,2),
  feedback text
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON public.assignment_submissions(assignment_id, student_id);
