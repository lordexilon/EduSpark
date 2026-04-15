# SQL del Módulo Docente — Guía de Ejecución

Este directorio contiene los scripts SQL necesarios para habilitar el Módulo Docente sobre Supabase.

## Orden recomendado (INTEGER para courses.id)
1. 01_schema_courses_integer.sql — Tablas con INTEGER para courses.id (compatible con esquema existente)
2. 02_schema_assignments_integer.sql — Tareas y entregas con INTEGER para course_id
3. 03_rls_policies_integer.sql — Políticas RLS para esquema INTEGER
4. 04_seed_roles_minimos.sql — Semillas mínimas (si aplica)

## Scripts alternativos
- 01_schema_courses_compatible.sql — Versión compatible (si no hay conflictos)
- 02_schema_assignments_compatible.sql — Versión compatible
- 03_rls_policies_compatible.sql — Versión compatible

## Scripts alternativos (si hay conflictos)
- 01_schema_courses_fixed.sql — Versión que elimina y recrea tablas
- 02_schema_assignments_fixed.sql — Versión que elimina y recrea tablas
- 03_rls_policies_fixed.sql — Versión que elimina y recrea políticas

## Cómo ejecutar
- Abrir el SQL Editor de Supabase y pegar cada script en orden.
- Verificar que RLS quede habilitado para todas las tablas creadas.
- Ajustar IDs/UUID según convención de tu proyecto.

## Notas
- Las políticas RLS asumen roles `admin`, `teacher`, `student` ya presentes.
- Si usas autenticación con `auth.users`, relaciona `public.users.id = auth.users.id`.
- Integra `TEST_MATERIA/scripts_ingesta` para cargar materiales iniciales y/o `course_content_chunks`.
