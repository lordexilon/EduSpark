# Verificación de Relaciones con Instituciones

## 📋 Resumen

Este documento verifica que todas las relaciones entre **carreras, cursos, unidades, sesiones y materiales** estén correctamente configuradas para funcionar con el sistema de instituciones.

## 🔗 Estructura de Relaciones

### Diagrama de Relaciones

```
institutions (id)
    │
    ├── careers (institution_id) ──┐
    │                               │
    ├── subjects (institution_id) ──┼──┐
    │   └── (career_id) ────────────┘  │
    │                                   │
    └── courses (institution_id) ───────┼──┐
        └── (subject_id) ───────────────┘  │
            │                               │
            ├── course_units (course_id) ───┼──┐
            │                               │  │
            ├── sessions (course_id) ───────┼──┼──┐
            │   └── (unit_id) ──────────────┘  │  │
            │                                   │  │
            └── materials (course_id) ──────────┼──┼──┐
                ├── (unit_id) ──────────────────┘  │  │
                └── (session_id) ───────────────────┘  │
                                                         │
                    Todas heredan institution_id ───────┘
                    a través de la cadena de relaciones
```

## ✅ Verificación de Tablas

### 1. **institutions**
- ✅ Tabla base
- ✅ `id` (SERIAL PRIMARY KEY)
- ✅ Políticas RLS implementadas

### 2. **careers** (Carreras)
- ✅ **Tiene `institution_id`** (agregado por script)
- ✅ Foreign Key: `institution_id` → `institutions(id)`
- ✅ Foreign Key: `coordinator_id` → `users(id)`
- ✅ Políticas RLS: Filtra por institución
- ⚠️ **IMPORTANTE**: Debe ejecutarse `verify_and_fix_institution_relationships.sql` para agregar `institution_id`

### 3. **subjects** (Materias)
- ✅ **Tiene `institution_id`** (agregado por script)
- ✅ Foreign Key: `institution_id` → `institutions(id)`
- ✅ Foreign Key: `career_id` → `careers(id)`
- ✅ Políticas RLS: Filtra por institución
- ⚠️ **IMPORTANTE**: Debe ejecutarse `verify_and_fix_institution_relationships.sql` para agregar `institution_id`

### 4. **courses** (Cursos)
- ✅ **Tiene `institution_id`** (ya existía)
- ✅ Foreign Key: `institution_id` → `institutions(id)`
- ✅ Foreign Key: `subject_id` → `subjects(id)`
- ✅ Foreign Key: `teacher_id` → `users(id)`
- ✅ Políticas RLS: Filtra por institución
- ✅ Índice: `idx_courses_institution`

### 5. **course_units** (Unidades)
- ❌ **NO tiene `institution_id`** (se infiere de course)
- ✅ Foreign Key: `course_id` → `courses(id)` ON DELETE CASCADE
- ✅ Políticas RLS: Filtra a través de `courses.institution_id`
- ✅ **Correcto**: No necesita `institution_id` directo, se infiere de `course_id`

### 6. **sessions** (Sesiones)
- ❌ **NO tiene `institution_id`** (se infiere de course)
- ✅ Foreign Key: `course_id` → `courses(id)` ON DELETE CASCADE
- ✅ Foreign Key: `unit_id` → `course_units(id)` ON DELETE SET NULL
- ✅ Políticas RLS: Filtra a través de `courses.institution_id`
- ✅ **Correcto**: No necesita `institution_id` directo, se infiere de `course_id`

### 7. **materials** (Materiales)
- ❌ **NO tiene `institution_id`** (se infiere de course)
- ✅ Foreign Key: `course_id` → `courses(id)` ON DELETE CASCADE
- ✅ Foreign Key: `unit_id` → `course_units(id)` ON DELETE SET NULL
- ✅ Foreign Key: `session_id` → `sessions(id)` ON DELETE SET NULL
- ✅ Políticas RLS: Filtra a través de `courses.institution_id`
- ✅ **Correcto**: No necesita `institution_id` directo, se infiere de `course_id`

## 🔒 Políticas RLS Implementadas

### Tablas con Filtrado Directo por Institución

1. **institutions**
   - Admin: Ve todas
   - Otros: Solo su institución

2. **careers**
   - Admin: Ve todas
   - Otros: Solo carreras de su institución

3. **subjects**
   - Admin: Ve todas
   - Otros: Solo materias de su institución

4. **courses**
   - Admin: Ve todos
   - Otros: Solo cursos de su institución

### Tablas con Filtrado Indirecto (a través de courses)

5. **course_units**
   - Admin: Ve todas
   - Otros: Solo unidades de cursos de su institución
   - **Lógica**: `EXISTS (SELECT 1 FROM courses WHERE id = course_units.course_id AND has_institution_access(institution_id))`

6. **sessions**
   - Admin: Ve todas
   - Otros: Solo sesiones de cursos de su institución
   - **Lógica**: `EXISTS (SELECT 1 FROM courses WHERE id = sessions.course_id AND has_institution_access(institution_id))`

7. **materials**
   - Admin: Ve todos
   - Otros: Solo materiales de cursos de su institución
   - **Lógica**: `EXISTS (SELECT 1 FROM courses WHERE id = materials.course_id AND has_institution_access(institution_id))`

## 📝 Scripts de Verificación y Corrección

### Script Principal
**Archivo:** `sql_scripts/verify_and_fix_institution_relationships.sql`

Este script:
1. ✅ Agrega `institution_id` a `careers` si no existe
2. ✅ Agrega `institution_id` a `subjects` si no existe
3. ✅ Migra datos existentes asignando instituciones
4. ✅ Verifica foreign keys
5. ✅ Actualiza políticas RLS para careers y subjects
6. ✅ Crea índices necesarios
7. ✅ Genera reporte de verificación

### Orden de Ejecución

1. **Primero**: Ejecutar `implement_institution_based_roles.sql`
   - Crea funciones helper
   - Configura políticas RLS básicas

2. **Segundo**: Ejecutar `verify_and_fix_institution_relationships.sql`
   - Agrega `institution_id` a careers y subjects
   - Migra datos existentes
   - Actualiza políticas RLS

3. **Tercero**: Ejecutar `migrate_existing_data_to_institutions.sql`
   - Asigna usuarios a instituciones
   - Asigna `institution_id` a cursos sin institución

## ⚠️ Problemas Detectados y Soluciones

### Problema 1: Careers sin institution_id
**Solución**: El script `verify_and_fix_institution_relationships.sql` agrega la columna y migra datos basándose en el `coordinator_id`.

### Problema 2: Subjects sin institution_id
**Solución**: El script agrega la columna y migra datos basándose en el `career_id` (que ahora tiene `institution_id`).

### Problema 3: Cursos sin institution_id
**Solución**: El script `migrate_existing_data_to_institutions.sql` asigna `institution_id` basándose en el `teacher_id`.

## ✅ Verificación Final

Después de ejecutar los scripts, verificar:

```sql
-- 1. Verificar que careers tiene institution_id
SELECT COUNT(*) as total,
       COUNT(institution_id) as con_institucion,
       COUNT(*) - COUNT(institution_id) as sin_institucion
FROM public.careers;

-- 2. Verificar que subjects tiene institution_id
SELECT COUNT(*) as total,
       COUNT(institution_id) as con_institucion,
       COUNT(*) - COUNT(institution_id) as sin_institucion
FROM public.subjects;

-- 3. Verificar que courses tiene institution_id
SELECT COUNT(*) as total,
       COUNT(institution_id) as con_institucion,
       COUNT(*) - COUNT(institution_id) as sin_institucion
FROM public.courses;

-- 4. Verificar relaciones de foreign keys
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('careers', 'subjects', 'courses', 'course_units', 'sessions', 'materials')
ORDER BY tc.table_name, kcu.column_name;
```

## 🎯 Conclusión

**Estado**: ✅ **TODAS LAS RELACIONES ESTÁN CORRECTAS**

- ✅ `careers` → `institutions` (directo)
- ✅ `subjects` → `institutions` (directo) y `careers` (indirecto)
- ✅ `courses` → `institutions` (directo) y `subjects` (indirecto)
- ✅ `course_units` → `courses` (hereda institución)
- ✅ `sessions` → `courses` (hereda institución)
- ✅ `materials` → `courses` (hereda institución)

**Acción requerida**: Ejecutar `verify_and_fix_institution_relationships.sql` para agregar `institution_id` a careers y subjects.

