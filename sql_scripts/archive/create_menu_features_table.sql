-- -------------------------------------------------
--  Tabla: menu_features
--  Guarda los flags que habilitan/deshabilitan secciones del menú
-- -------------------------------------------------
create table if not exists menu_features (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,               -- p.e. "admin_reports", "teacher_courses"
  enabled     boolean default true,
  allowed_roles text[] default array['admin']    -- roles que pueden ver la sección
);

-- -------------------------------------------------
--  Row Level Security (RLS)
-- -------------------------------------------------
alter table menu_features enable row level security;

-- Sólo admin puede INSERT / UPDATE / DELETE
create policy admin_can_edit
  on menu_features
  for all
  using (auth.role() = 'admin');

-- Todos los autenticados pueden leer (para construir el menú)
create policy all_can_read
  on menu_features
  for select
  using (auth.role() in ('authenticated', 'admin', 'teacher', 'student'));
