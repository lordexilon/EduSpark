-- -------------------------------------------------
--  Añadir claves foráneas para asegurar integridad
-- -------------------------------------------------

-- 1. Cada unidad (course_units) pertenece a un curso existente
ALTER TABLE course_units
  ADD CONSTRAINT fk_course_units_course
  FOREIGN KEY (course_id) REFERENCES courses(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 2. Cada sesión pertenece a un curso existente (directamente)
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_course
  FOREIGN KEY (course_id) REFERENCES courses(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 3. Cada sesión puede pertenecer a una unidad (opcional, pero si existe debe ser válida)
-- Nota: En el esquema actual, unit_id es UUID en sessions, pero course_units.id es UUID.
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_unit
  FOREIGN KEY (unit_id) REFERENCES course_units(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
