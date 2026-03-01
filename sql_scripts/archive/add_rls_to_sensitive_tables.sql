-- -------------------------------------------------
--  RLS para tablas que contienen datos sensibles
-- -------------------------------------------------

-- Ejemplo: tabla `materials` solo visible para admin y teacher (y student si es su curso)
-- Nota: Esto es un ejemplo genérico, ajustar según esquema real.
alter table materials enable row level security;

create policy material_admin_teacher
  on materials
  for select
  using (
    auth.role() in ('admin', 'teacher') OR
    (auth.role() = 'student' AND exists (
      select 1 from enrollments e
      where e.user_id = auth.uid()
      and e.course_id = materials.course_id
    ))
  );

-- Proteger RPCs sensibles si existen
-- create policy rpc_user_devices_admin
--   on rpc get_user_devices_by_role
--   for all
--   using (auth.role() = 'admin');
