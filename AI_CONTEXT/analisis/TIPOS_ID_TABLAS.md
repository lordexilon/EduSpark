# Tipos de Primary Keys (IDs) en las Tablas - EduSpark

**Fecha:** Diciembre 2024  
**Análisis basado en:** `schema_actual.md` y datos extraídos de la base de datos

---

## 📊 Resumen de Tipos de IDs

| Tipo de ID | Tablas | Cantidad |
|------------|--------|----------|
| **UUID** | 15 tablas | 15 |
| **INTEGER/SERIAL** | 8 tablas | 8 |
| **BIGINT** | 1 tabla | 1 |

**Total:** 24 tablas con PK identificada

---

## ✅ Tablas con ID = UUID

Estas tablas usan `UUID PRIMARY KEY DEFAULT gen_random_uuid()`:

1. ✅ `users` - `id UUID`
2. ✅ `course_units` - `id UUID`
3. ✅ `sessions` - `id UUID`
4. ✅ `materials` - `id UUID`
5. ✅ `course_materials` - `id UUID`
6. ✅ `career_enrollments` - `id UUID`
7. ✅ `course_enrollments` - `id UUID`
8. ✅ `assignments` - `id UUID`
9. ✅ `assignment_submissions` - `id UUID`
10. ✅ `course_grading_scales` - `id UUID`
11. ✅ `course_images` - `id UUID`
12. ✅ `course_pedagogical_settings` - `id UUID`
13. ✅ `student_learning_profiles` - `id UUID`
14. ✅ `tutor_conversations` - `id UUID`
15. ✅ `tutor_messages` - `id UUID`
16. ✅ `chunks` - `id UUID`
17. ✅ `course_content_chunks` - `id UUID`
18. ✅ `search_course_content_chunks` - `id UUID`

**Ventajas de UUID:**
- No expone información sobre cantidad de registros
- Únicos globalmente (no solo en la BD)
- Útiles para sincronización distribuida
- Más seguros (no adivinables)

---

## 📊 Tablas con ID = INTEGER/SERIAL

Estas tablas usan `INTEGER PRIMARY KEY` o `SERIAL PRIMARY KEY`:

1. ✅ `roles` - `id SERIAL` (1, 2, 3, 4)
2. ✅ `courses` - `id INTEGER` (usa `nextval('courses_id_seq')`)
3. ✅ `careers` - `id SERIAL`
4. ✅ `subjects` - `id SERIAL`
5. ✅ `subject_assignments` - `id SERIAL`
6. ✅ `institutions` - `id SERIAL`
7. ✅ `user_institutions` - `id SERIAL`
8. ✅ `role_permissions` - `id SERIAL`
9. ⚠️ `enrollments` - `id INTEGER` (tabla legacy)

**Razones para INTEGER:**
- Valores numéricos simples (1, 2, 3...)
- Más eficiente en índices
- Fáciles de recordar y comunicar
- Adecuados para entidades de referencia (roles, carreras, materias)

---

## ⚠️ Tablas con ID = BIGINT

1. ⚠️ `course_modules` - `id BIGINT` (usa `nextval('course_modules_id_seq')`)

**Nota:** Esta es la única tabla que usa BIGINT, posiblemente innecesario.

---

## 🔍 Análisis de Coherencia

### ✅ Coherencia Correcta

**Usuarios y entidades relacionadas:**
- `users.id` = UUID ✅
- `career_enrollments.student_id` = UUID (FK a users) ✅
- `course_enrollments.student_id` = UUID (FK a users) ✅
- `courses.teacher_id` = UUID (FK a users) ✅

**Entidades de contenido:**
- `course_units.id` = UUID ✅
- `sessions.id` = UUID ✅
- `sessions.unit_id` = UUID (FK a course_units) ✅
- `materials.unit_id` = UUID (FK a course_units) ✅
- `materials.session_id` = UUID (FK a sessions) ✅

**Referencias académicas:**
- `courses.id` = INTEGER ✅
- `careers.id` = INTEGER ✅
- `subjects.id` = INTEGER ✅
- `courses.subject_id` = INTEGER (FK a subjects) ✅
- `subjects.career_id` = INTEGER (FK a careers) ✅

### ⚠️ Inconsistencias Identificadas

1. **`course_modules.course_id` es BIGINT pero `courses.id` es INTEGER**
   - ❌ Problema: Foreign key no coincidirá correctamente
   - ✅ Solución: `sql_scripts/75_fix_course_modules_type.sql`

2. **`course_modules.id` es BIGINT mientras que:**
   - `course_materials.module_id` es BIGINT ✅ (coincide)
   - Pero `courses.id` es INTEGER ❌ (inconsistencia)

---

## 🎯 Recomendaciones

### Mantener UUID Para:
- ✅ Entidades que pueden crecer mucho (usuarios, sesiones, unidades)
- ✅ Entidades que necesitan ser únicas globalmente
- ✅ Entidades relacionadas con usuarios
- ✅ Contenido dinámico (materials, assignments, submissions)

### Mantener INTEGER Para:
- ✅ Entidades de referencia/maestros (roles, careers, subjects)
- ✅ Entidades con códigos identificadores (courses.code)
- ✅ Tablas pequeñas con relaciones estables

### Considerar Cambio:
- ⚠️ `course_modules.id` podría ser INTEGER para ser consistente con `courses.id`
- ⚠️ Pero `course_materials.module_id` ya es BIGINT, necesitaría cambiar también

---

## 📝 Estado Actual vs Ideal

### Estado Actual:
```
UUID (18 tablas):     ✅ Correcto para mayoría
INTEGER (9 tablas):   ✅ Correcto para referencias
BIGINT (1 tabla):     ⚠️ Inconsistente
```

### Cambios Recomendados:

**Opción 1: Cambiar course_modules a INTEGER** (Recomendado)
```sql
-- Cambiar course_modules.id a INTEGER
ALTER TABLE course_modules ALTER COLUMN id TYPE INTEGER;
-- Cambiar course_materials.module_id también
ALTER TABLE course_materials ALTER COLUMN module_id TYPE INTEGER;
```

**Opción 2: Mantener BIGINT pero corregir course_id**
```sql
-- Solo corregir course_modules.course_id a INTEGER
ALTER TABLE course_modules ALTER COLUMN course_id TYPE INTEGER;
```

---

## ✅ Conclusión

**La mayoría de las tablas usan UUID correctamente**, especialmente:
- Entidades de contenido (units, sessions, materials)
- Entidades de usuario (users, enrollments)
- Entidades transaccionales (assignments, submissions)

**Las tablas con INTEGER son apropiadas para:**
- Entidades de referencia (roles, careers, subjects, courses)

**Solo hay 1 inconsistencia real:**
- `course_modules.course_id` debe ser INTEGER (no BIGINT)

