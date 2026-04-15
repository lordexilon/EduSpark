# Reglas de validación en la API

## 1️⃣ Creación de Unidad (course_units)
- **Servicio:** `src/services/teacherCourses.ts` -> `unitService.createUnit`
- **Validación:**
  - Se verifica que `course_id` exista en la tabla `courses`.
  - Si no existe → Error con mensaje *“El curso especificado no existe.”*.

## 2️⃣ Creación de Sesión (sessions)
- **Servicio:** `src/services/teacherCourses.ts` -> `sessionService.createSession`
- **Validación:**
  - Se verifica que `course_id` exista en la tabla `courses`.
  - Si se proporciona `unit_id`, se verifica que exista en `course_units`.
  - Si no existe → Error con mensaje correspondiente.

## 3️⃣ Integridad a nivel DB
- **Archivo:** `sql_scripts/add_foreign_keys.sql`
  - `fk_course_units_course` → `course_units.course_id` → `courses.id`
  - `fk_sessions_course` → `sessions.course_id` → `courses.id`
  - `fk_sessions_unit` → `sessions.unit_id` → `course_units.id`

> Estas reglas garantizan la consistencia del modelo de datos.
