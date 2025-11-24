# 📊 Resumen: Tipos de Primary Keys en las Tablas

**Análisis:** Diciembre 2024  
**Basado en:** Datos extraídos de la base de datos

---

## 🔍 Respuesta Directa

**No, no todas las tablas usan UUID.** Hay una mezcla intencional:

- ✅ **18 tablas** usan **UUID**
- ✅ **9 tablas** usan **INTEGER/SERIAL**
- ⚠️ **1 tabla** usa **BIGINT** (inconsistencia)

---

## 📋 DESGLOSE POR TIPO

### ✅ UUID (18 tablas) - Para entidades dinámicas

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Tablas:**
1. `users` 
2. `course_units`
3. `sessions`
4. `materials`
5. `course_materials`
6. `career_enrollments`
7. `course_enrollments`
8. `assignments`
9. `assignment_submissions`
10. `course_grading_scales`
11. `course_images`
12. `course_pedagogical_settings`
13. `student_learning_profiles`
14. `tutor_conversations`
15. `tutor_messages`
16. `chunks`
17. `course_content_chunks`
18. `search_course_content_chunks`

**Razón:** Entidades que se crean dinámicamente, no tienen códigos fijos, necesitan ser únicas globalmente.

---

### ✅ INTEGER/SERIAL (9 tablas) - Para entidades de referencia

```sql
id SERIAL PRIMARY KEY
-- o
id INTEGER PRIMARY KEY DEFAULT nextval('table_id_seq')
```

**Tablas:**
1. `roles` - `id SERIAL` (valores: 1, 2, 3, 4)
2. `courses` - `id INTEGER` (usa secuencia)
3. `careers` - `id SERIAL`
4. `subjects` - `id SERIAL`
5. `subject_assignments` - `id SERIAL`
6. `institutions` - `id SERIAL`
7. `user_institutions` - `id SERIAL`
8. `role_permissions` - `id SERIAL`
9. `enrollments` - `id INTEGER` (tabla legacy)

**Razón:** Entidades de referencia/maestros, códigos identificadores, tablas pequeñas con relaciones estables.

---

### ⚠️ BIGINT (1 tabla) - Inconsistente

```sql
id BIGINT PRIMARY KEY DEFAULT nextval('course_modules_id_seq')
```

**Tabla:**
1. `course_modules` - `id BIGINT` ⚠️

**Problema:** 
- `course_modules.course_id` es BIGINT pero debería ser INTEGER (para coincidir con `courses.id`)
- `course_modules.id` es BIGINT (única tabla con este tipo)

**Solución:** Ya existe script `sql_scripts/75_fix_course_modules_type.sql`

---

## 🎯 Patrón de Diseño Identificado

### UUID se usa para:
- ✅ Entidades relacionadas con usuarios (`users`, enrollments)
- ✅ Contenido dinámico (`course_units`, `sessions`, `materials`)
- ✅ Transacciones (`assignments`, `submissions`)
- ✅ Entidades que pueden crecer mucho

### INTEGER se usa para:
- ✅ Entidades de referencia (`roles`, `careers`, `subjects`)
- ✅ Entidades con códigos identificadores (`courses.code`)
- ✅ Tablas maestras pequeñas
- ✅ Relaciones estables

---

## ⚠️ Única Inconsistencia Real

**`course_modules`:**
- `id` = BIGINT (único caso)
- `course_id` = BIGINT pero `courses.id` = INTEGER ❌

**Corrección necesaria:**
```sql
-- Ya documentado en sql_scripts/75_fix_course_modules_type.sql
ALTER TABLE course_modules 
ALTER COLUMN course_id TYPE INTEGER USING course_id::INTEGER;
```

---

## ✅ Conclusión

**El sistema está bien diseñado:**
- ✅ UUID para entidades dinámicas y de usuario
- ✅ INTEGER para entidades de referencia
- ⚠️ Solo 1 inconsistencia que debe corregirse

**No es necesario cambiar todo a UUID** - La mezcla es apropiada y funcional.

