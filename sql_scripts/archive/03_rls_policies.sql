-- 03_rls_policies.sql
-- Habilitar RLS y crear políticas básicas por rol/propiedad

-- Helper: función para saber si el usuario es admin (ajusta a tu modelo de roles)
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and r.name = 'admin'
  );
$$;

-- Helper: es docente (teacher)
create or replace function public.is_teacher() returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and r.name = 'teacher'
  );
$$;

-- Cursos
alter table public.courses enable row level security;

create policy if not exists courses_admin_all
on public.courses for all
using (public.is_admin()) with check (public.is_admin());

create policy if not exists courses_owner_rw
on public.courses for all
using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Unidades
alter table public.course_units enable row level security;
create policy if not exists units_admin_all on public.course_units for all using (public.is_admin()) with check (public.is_admin());
create policy if not exists units_owner_rw on public.course_units for all using (
  exists (select 1 from public.courses c where c.id = course_units.course_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.courses c where c.id = course_units.course_id and c.teacher_id = auth.uid())
);

-- Sesiones
alter table public.sessions enable row level security;
create policy if not exists sessions_admin_all on public.sessions for all using (public.is_admin()) with check (public.is_admin());
create policy if not exists sessions_owner_rw on public.sessions for all using (
  exists (select 1 from public.courses c where c.id = sessions.course_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.courses c where c.id = sessions.course_id and c.teacher_id = auth.uid())
);

-- Materiales
alter table public.materials enable row level security;
create policy if not exists materials_admin_all on public.materials for all using (public.is_admin()) with check (public.is_admin());
create policy if not exists materials_owner_rw on public.materials for all using (
  exists (select 1 from public.courses c where c.id = materials.course_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.courses c where c.id = materials.course_id and c.teacher_id = auth.uid())
);

-- Tareas
alter table public.assignments enable row level security;
create policy if not exists assignments_admin_all on public.assignments for all using (public.is_admin()) with check (public.is_admin());
create policy if not exists assignments_owner_rw on public.assignments for all using (
  exists (select 1 from public.courses c where c.id = assignments.course_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.courses c where c.id = assignments.course_id and c.teacher_id = auth.uid())
);

-- Entregas
alter table public.assignment_submissions enable row level security;
create policy if not exists submissions_admin_all on public.assignment_submissions for all using (public.is_admin()) with check (public.is_admin());

-- estudiante puede ver/editar sus envíos
create policy if not exists submissions_owner_rw on public.assignment_submissions for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- docente del curso puede ver/actualizar para calificar
create policy if not exists submissions_teacher_rw on public.assignment_submissions for select, update using (
  exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_submissions.assignment_id and c.teacher_id = auth.uid()
  )
);
