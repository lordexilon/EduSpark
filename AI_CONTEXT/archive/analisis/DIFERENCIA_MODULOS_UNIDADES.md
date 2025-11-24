# Análisis: Diferencia entre Módulos y Unidades

**Fecha:** Diciembre 2024  
**Problema Identificado:** Confusión entre `course_modules` y `course_units`

---

## 🔍 Problema Identificado

El estudiante no ve el contenido que el administrador/coordinador está creando porque están usando **DOS TABLAS DIFERENTES**:

1. **`course_modules`** - Usado por Admin/Coordinator
2. **`course_units`** - Usado por Teacher/Student

---

## 📊 Análisis de las Tablas

### Tabla: `course_modules` 
```sql
CREATE TABLE course_modules (
    id BIGINT PRIMARY KEY,
    course_id BIGINT NOT NULL,  -- ⚠️ Inconsistencia: BIGINT vs INTEGER
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Características:**
- ID: `BIGINT`
- `course_id`: `BIGINT` (inconsistente con `courses.id` que es `INTEGER`)
- Tabla más simple (solo nombre, título, descripción)
- **Usada por:** `CourseModulesPage`, `ModuleEditorPage`
- **Rutas:** `/teacher/courses/:id/modules`, `/teacher/courses/:courseId/modules/:moduleId`

### Tabla: `course_units`
```sql
CREATE TABLE course_units (
    id UUID PRIMARY KEY,
    course_id INTEGER NOT NULL,  -- ✅ Correcto: INTEGER
    number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_html TEXT,            -- ✅ Contenido rico
    content_markdown TEXT,        -- ✅ Contenido rico
    learning_objectives TEXT[],   -- ✅ Objetivos de aprendizaje
    duration_hours DECIMAL(5,2),
    order_index INTEGER,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Características:**
- ID: `UUID`
- `course_id`: `INTEGER` (correcto, coincide con `courses.id`)
- Tabla más completa con contenido rico
- **Usada por:** `CourseEditorPage`, `CourseViewPage` (estudiante)
- **Rutas:** `/teacher/courses/:id`, `/courses/:id`

---

## 🎯 Relación Correcta Según el Usuario

```
Carreras (careers)
  └─ Cursos (courses)
      └─ Unidades (course_units) ← ESTO es lo que el estudiante debe ver
          └─ Sesiones (sessions)
```

**✅ CONFIRMADO:** La estructura correcta es `course_units`, NO `course_modules`

---

## 📁 Páginas que Usan Cada Tabla

### Usando `course_modules` (Sistema Paralelo/Obsoleto):
1. **`pages/CourseModulesPage.tsx`** (`/teacher/courses/:id/modules`)
   - Lista módulos de un curso
   - Usa servicio `services/modules.ts`

2. **`pages/ModuleEditorPage.tsx`** (`/teacher/courses/:courseId/modules/:moduleId`)
   - Editor de módulos individuales
   - Gestiona materiales del módulo (`course_materials` con `module_id`)

### Usando `course_units` (Sistema Principal):
1. **`pages/CourseEditorPage.tsx`** (`/teacher/courses/:id`)
   - Editor principal del curso para docentes
   - Tab "Unidades" - CRUD de `course_units`
   - Tab "Sesiones" - CRUD de `sessions` (referencian `unit_id`)
   - Tab "Materiales" - CRUD de `materials`

2. **`pages/CourseViewPage.tsx`** (`/courses/:id`)
   - **Vista del estudiante** - Muestra `course_units` y `sessions`
   - Agrupa sesiones por `unit_id`

3. **`pages/SessionsListPage.tsx`** (`/sessions?courseId=X`)
   - Lista de sesiones (referencian `unit_id` de `course_units`)

---

## 🔗 Relaciones en la Base de Datos

### Sistema Principal (`course_units`):
```sql
courses (id: INTEGER)
  └─ course_units (course_id: INTEGER, id: UUID) ✅
      └─ sessions (unit_id: UUID) ✅
          └─ assignments (session_id: UUID) ✅
```

### Sistema Paralelo (`course_modules`):
```sql
courses (id: INTEGER)
  └─ course_modules (course_id: BIGINT, id: BIGINT) ⚠️
      └─ course_materials (module_id: BIGINT) ⚠️
```

**⚠️ PROBLEMA:** No hay relación entre `course_modules` y `course_units`. Son sistemas completamente separados.

---

## 🚨 Problema Principal

**El contenido creado en `course_modules` NO es visible para estudiantes porque:**

1. **CourseViewPage** (estudiante) solo lee de `course_units`
2. **CourseEditorPage** (docente) solo gestiona `course_units`
3. **CourseModulesPage** (admin/coordinator) solo gestiona `course_modules`

**Resultado:** Dos sistemas paralelos que no se comunican.

---

## ✅ Solución Recomendada

### Opción 1: Migrar de `course_modules` a `course_units` (RECOMENDADO)

**Ventajas:**
- Unifica el sistema en una sola tabla
- El estudiante verá el contenido creado por admin/coordinator
- Elimina duplicación y confusión
- Usa la estructura más completa (`course_units` tiene más campos)

**Pasos:**
1. Migrar datos de `course_modules` → `course_units`
2. Migrar materiales de `course_materials.module_id` → `materials.unit_id`
3. Actualizar `CourseModulesPage` para usar `course_units`
4. Actualizar `ModuleEditorPage` para usar `course_units`
5. Deprecar o eliminar `course_modules` y `course_materials`

### Opción 2: Mantener Ambos pero Sincronizar

**Ventajas:**
- Mantiene compatibilidad con código existente
- Permite migración gradual

**Desventajas:**
- Duplicación de datos
- Más complejidad de mantenimiento
- Riesgo de inconsistencias

### Opción 3: Clarificar el Propósito de Cada Tabla

Si hay una razón específica para mantener ambas:
- **`course_modules`**: Organización administrativa/nivel superior
- **`course_units`**: Contenido pedagógico detallado

**Necesitaría:** Relación entre ambas tablas (`course_units.module_id → course_modules.id`)

---

## 📋 Acción Inmediata Recomendada

**VERIFICAR:** ¿Qué contenido hay actualmente en `course_modules` vs `course_units`?

```sql
-- Verificar datos existentes
SELECT 
  'course_modules' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT course_id) as cursos_unicos
FROM course_modules
UNION ALL
SELECT 
  'course_units' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT course_id) as cursos_unicos
FROM course_units;
```

**DECISIÓN:** Basado en los datos existentes, decidir:
- Si `course_modules` tiene datos importantes → Migrar a `course_units`
- Si `course_modules` está vacío o es de prueba → Deprecar y usar solo `course_units`

---

## 🎯 Recomendación Final

**Unificar en `course_units`** porque:

1. ✅ Es la estructura que el estudiante ve
2. ✅ Tiene más campos (contenido rico, objetivos, etc.)
3. ✅ Ya está integrada con sesiones y tareas
4. ✅ Es la estructura documentada en `REORGANIZACION_FLUJO_PEDAGOGICO.md`
5. ✅ Evita confusión y duplicación

**Próximos pasos:**
1. Consultar al usuario sobre datos en `course_modules`
2. Si hay datos importantes, crear script de migración
3. Actualizar `CourseModulesPage` para usar `course_units`
4. Actualizar `ModuleEditorPage` para usar `course_units`
5. Opcional: Deprecar `course_modules` después de migración

