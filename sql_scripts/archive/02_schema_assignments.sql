-- 02_schema_assignments.sql
-- Tablas para tareas y entregas de estudiantes

create table if not exists public.assignments (
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

create index if not exists idx_assignments_rel on public.assignments(course_id, unit_id, session_id);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null,
  submitted_at timestamptz not null default now(),
  url text,
  text text,
  grade numeric(5,2),
  feedback text
);

create index if not exists idx_submissions_assignment_student on public.assignment_submissions(assignment_id, student_id);
