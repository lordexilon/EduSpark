# Módulo Docente — Diseño, Alcance y Seguimiento

## 1) Objetivo
Habilitar a los docentes a crear/gestionar cursos, unidades, sesiones, materiales y tareas; y calificar entregas, usando Supabase como backend (sin servidor Express).

## 2) Alcance Funcional (MVP)
- Cursos: crear/editar/archivar; asignar docente propietario
- Unidades y sesiones: estructura por curso, fechas y descripciones
- Materiales: adjuntar markdown/pdf y vincular a unidades/sesiones
- Tareas: enunciado, fecha límite, puntaje, adjuntos
- Entregas: subida por estudiante, calificación y feedback
- Permisos: docente ve/edita sus cursos; estudiantes ven/entregan; admin total

## 3) Esquema de Base de Datos (Supabase)
Tablas propuestas (prefijo `public`):
- courses(id, title, code, description, teacher_id, status, created_at, updated_at)
- course_units(id, course_id, number, title, description, created_at)
- sessions(id, course_id, unit_id, title, starts_at, ends_at, description)
- materials(id, course_id, unit_id, session_id, title, kind, url, mime_type, size_bytes, metadata jsonb)
- assignments(id, course_id, unit_id, session_id, title, description, due_at, max_points, attachments jsonb)
- assignment_submissions(id, assignment_id, student_id, submitted_at, url, text, grade numeric, feedback text)

Índices: courses(teacher_id); course_units(course_id); sessions(course_id, unit_id); materials(course_id, unit_id, session_id); assignments(course_id, unit_id, session_id); assignment_submissions(assignment_id, student_id).

## 4) RLS (resumen)
- courses: docente owner CRUD; admin CRUD; estudiante read si inscrito (futuro)
- course_units/sessions/materials/assignments: mismas reglas por course_id
- assignment_submissions: estudiante CRUD propio; docente read/update; admin total

## 5) Scripts SQL (orden sugerido)
Ver `sql_scripts/README.md`.
- 01_schema_courses.sql
- 02_schema_assignments.sql
- 03_rls_policies.sql
- 04_seed_roles_minimos.sql (si aplica)

## 6) Integración con TEST_MATERIA
- `scripts_ingesta/procesar_contenido.js` → chunks_procesados.json
- `scripts_ingesta/generar_embeddings.js` → datos_supabase.json
- Insertar como `materials` (url+metadata) y/o `course_content_chunks` (para RAG por curso)
- Mapear `unit_id` por nombre de archivo (Unidad 1/2/...)

## 7) Frontend (Docente)
- Mis Cursos (listar/crear/editar)
- Editor de Curso (unidades, sesiones, materiales)
- Tareas (crear/editar) y Entregas (revisión/calificación)

Servicios supabase-js:
- services/teacherCourses.ts (courses, units, sessions, materials)
- services/assignments.ts (assignments, submissions)

## 8) KPI de Seguimiento
- # cursos activos; # tareas creadas; tasa de entregas; tiempo medio de corrección

## 9) Roadmap
- Semana 1: SQL + RLS + servicios base + Mis Cursos
- Semana 2: Editor + Tareas
- Semana 3: Entregas + Calificación + Métricas

Estado: Documentación consolidada. Listo para ejecutar SQL y construir páginas/servicios.
