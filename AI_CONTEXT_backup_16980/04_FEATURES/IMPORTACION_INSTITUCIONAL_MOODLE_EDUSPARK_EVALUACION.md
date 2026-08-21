# Evaluación: importación institucional (usuarios, roles, carreras, cursos) — EduSpark ↔ Moodle

**Versión:** 1.1  
**Fecha:** 2026-03-28  
**Objetivo:** Evaluar qué tan viable y en qué orden importar **usuarios**, **roles equivalentes**, **carreras**, **materias**, **cursos** y **matrículas** desde un entorno tipo **Moodle** (o CSV institucional) hacia el modelo actual de EduSpark.

---

## 0. Quién puede ejecutar migraciones / importaciones institucionales

**Regla de producto (EduSpark):** las operaciones de **migración o importación masiva** (CSV, job, Edge Function, RPC de carga) deben estar restringidas a usuarios con rol:

| Rol en `roles.name` | Alcance típico |
|---------------------|----------------|
| **`admin`** | Administrador global de la plataforma; puede ejecutar importaciones y ver todas las instituciones según política RLS. |
| **`admin-campus`** | Administrador de campus / institución; importaciones acotadas a **`institution_id`** de su sede. |

**No** se considera suficiente para este tipo de operación: `teacher`, `student`, `coordinator`, `supervisor` (salvo decisión explícita futura y cambio de RLS).

La UI de import (cuando exista) y las políticas de API/RPC deben comprobar `user.role.name IN ('admin', 'admin-campus')` (y para `admin-campus`, filtrar datos por institución). Esto es independiente del **mapeo Moodle → rol EduSpark del usuario importado** (estudiante, docente, etc.), que aplica a los **registros cargados**, no al operador del import.

---

## 1. Resumen ejecutivo

| Dimensión | Viabilidad | Comentario breve |
|-----------|------------|------------------|
| **Carreras / materias / cursos** | **Alta** (maestro académico) | El modelo `careers` → `subjects` → `courses` existe y es estable. Convención de códigos + `institution_id`. |
| **Usuarios** | **Media** | Supabase **Auth** exige flujo de identidad (email, invitación o migración de cuentas). No es un `INSERT` masivo trivial sin política de contraseñas y verificación. |
| **Roles “similares”** | **Media–baja** | Moodle = **varios roles por usuario según contexto** (sitio, categoría, curso). EduSpark hoy usa **un rol global** por usuario (`users.role_id`). Hay que **decidir** simplificación o evolución del modelo. |
| **Matrículas** (carrera y curso) | **Alta** una vez existan IDs | `career_enrollments` y `course_enrollments` son el destino natural. |

**Conclusión:** Tiene sentido un **import por fases**: primero **datos maestros** (institución, carreras, materias, cursos), luego **usuarios** con política clara, luego **matrículas**. Los **roles** requieren **tabla de mapeo** Moodle → EduSpark y posiblemente diseño de producto si se necesita rol por curso.

---

## 2. Modelo EduSpark relevante (referencia)

- **Institución:** `institutions` (aislamiento multi-campus).
- **Carrera:** `careers` (`code` único por `institution_id`, créditos, etc.).
- **Materia:** `subjects` (`career_id`, `year`, `semester`, `code`, …).
- **Curso (oferta de cátedra):** `courses` (`subject_id`, `teacher_id`, `academic_period`, fechas, …).
- **Usuario:** `auth.users` + `public.users` con **`role_id`** → `roles` (nombre tipo `student`, `teacher`, `admin`, …).
- **Matrícula carrera:** `career_enrollments`.
- **Matrícula curso:** `course_enrollments`.

*Evidencia de servicios:* `src/services/academicService.ts`, migraciones `supabase/migrations/20260216_academic_schema.sql` y posteriores RLS.

---

## 3. Equivalencias Moodle → EduSpark (importación)

| Origen Moodle (concepto) | Destino EduSpark | Notas |
|-------------------------|------------------|--------|
| Categoría de cursos / árbol | `careers` + posible jerarquía futura “facultad” | Moodle no siempre = carrera; puede requerir **mapeo manual** una vez por institución. |
| Curso Moodle (contenedor) | **`courses`** (oferta) o plantilla | Un “curso” Moodle a menudo mezcla **plantilla** y **sección**; en EduSpark el **curso** es la instancia vinculada a `subject_id` + periodo. |
| Usuario Moodle | `auth.users` + `public.users` | Email como clave natural habitual; **password**: invitación, reset, o importación con política explícita (Ley de datos personales / consentimiento). |
| Rol en sitio Moodle | `roles` + `role_id` | Ver §4: **no es 1:1** si hay múltiples roles. |
| Inscripción a curso | `course_enrollments` | `student_id`, `course_id`, `status`. |
| Inscripción a programa | `career_enrollments` | Si la institución lo usa en Moodle (menos estándar). |

---

## 4. Roles: el punto más delicado

### Cómo es Moodle

- Un mismo usuario puede ser **estudiante** en un curso y **profesor no editor** en otro, o **gestor** en una categoría.
- Los roles son **por contexto** (sistema, categoría, curso).

### Cómo es EduSpark (hoy)

- Un usuario tiene **un** `role_id` principal en `public.users`.

### Opciones de producto

| Opción | Pros | Contras |
|--------|------|---------|
| **A) Import con rol “principal”** | Rápido para MVP | Pierde matices (ej. ayudante de curso). |
| **B) Rol por curso** (tabla `course_user_roles` o similar) | Paridad con Moodle | Requiere **migración SQL + RLS + UI**. |
| **C) Mapeo solo student/teacher/admin** | Simple | Instituciones grandes con roles finos necesitan reglas extra. |

**Recomendación para MVP de import:** opción **A** o **C** con tabla de mapeo **Moodle role shortname → EduSpark `roles.id`**, y documentar excepciones.

---

## 5. Orden sugerido de implementación (import)

1. **Institución** (si multi-tenant): `institution_id` fijado o importado.
2. **Carreras** (`careers`): códigos únicos por institución.
3. **Materias** (`subjects`): `career_id`, año, semestre.
4. **Cursos** (`courses`): `subject_id`, periodo académico, docente (usuario ya existente o placeholder).
5. **Usuarios**: creación vía Admin API / invitaciones + asignación de `role_id`.
6. **Matrículas**: `career_enrollments` y/o `course_enrollments`.

**Dependencias:** los cursos necesitan `teacher_id` válido; los estudiantes en `course_enrollments` necesitan existir en `users`.

---

## 6. Riesgos y cumplimiento

| Riesgo | Mitigación |
|--------|------------|
| **PII / emails** | Procesar bajo política institucional; minimizar datos en CSV; logs sin duplicar contraseñas. |
| **Duplicados** | Claves naturales: `email`, `careers(institution_id, code)`, `external_id` Moodle en tablas auxiliares. |
| **RLS / permisos** | Solo **`admin`** o **`admin-campus`** invocan el flujo de import en UI/API; backend con RPC `security definer` o service role sin exponer al cliente anónimo. `admin-campus` limitado a su `institution_id`. |
| **Contraseñas** | No importar hash Moodle a Supabase Auth sin estrategia validada; preferir **invitación por email**. |

---

## 7. Entregables técnicos recomendados (cuando se apruebe)

- Tabla opcional **`import_external_ids`** o columnas `moodle_user_id`, `moodle_course_id` en staging para **reconciliación** e imports incrementales.
- **Plantillas CSV** (UTF-8) por entidad: carreras, materias, usuarios, matrículas.
- **Documento de mapeo de roles** (anexo): fila por rol Moodle → rol EduSpark.

---

## 8. Relación con otros documentos

- `GLOSARIO_EDUSPARK_MOODLE.md`: vocabulario curso/unidad/sesión (contenido pedagógico).
- `RESULTADOS_APRENDIZAJE_MARCOS_COMPETENCIAS_EDUSPARK.md`: marcos de competencias / RA (otra vía de import, Fase C).
- **Import de contenido curso** (`.mbz`): **no incluido aquí**; es otro epic (estructura pedagógica, no solo usuarios/carreras).

---

## 9. Veredicto

**Sí debe poder importarse** (usuarios, roles equivalentes, carreras, cursos y matrículas) para que EduSpark sea **pragmático para instituciones** que ya tienen Moodle o Excel interno. **No está implementado aún** en el producto como asistente de import; este documento define **alcance, orden, riesgos y el gap de roles contextuales**.

**Próximo paso de producto:** elegir entre MVP **rol único** vs diseño **rol por curso**; luego prototipo CSV + una función Edge o script de migración supervisado.

---

*Documento vivo. Actualizar al definirse el primer import piloto.*
