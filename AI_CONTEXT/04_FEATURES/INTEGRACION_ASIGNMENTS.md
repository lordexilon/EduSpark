# Integración de Assignments al Flujo Pedagógico Oficial

## 📋 Resumen

Este documento describe la integración completa de la funcionalidad de **Tareas (Assignments)** al flujo pedagógico oficial de EduSpark, conectándola con cursos, módulos y sesiones.

**Fecha de Implementación:** Enero 2025  
**Estado:** ✅ **COMPLETADO E INTEGRADO AL FLUJO OFICIAL**

**Última Actualización:** Enero 2025 - Integración completa con `SessionsListPage` y navegación contextual desde todas las páginas principales.

## 🎯 Objetivo

Integrar la sección de tareas al flujo pedagógico oficial, permitiendo que los estudiantes:
- Vean tareas asociadas a sus cursos inscritos
- Entreguen tareas directamente desde la plataforma
- Reciban feedback y calificaciones de profesores
- Naveguen contextualmente entre cursos, sesiones y tareas

## 📊 Estructura de Base de Datos

### Tabla: `assignments`
```sql
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.course_units(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  max_points NUMERIC(5,2) DEFAULT 100,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Relaciones:**
- `course_id` (OBLIGATORIO): Asociada a un curso
- `unit_id` (OPCIONAL): Puede estar asociada a un módulo específico
- `session_id` (OPCIONAL): Puede estar asociada a una sesión específica

### Tabla: `assignment_submissions`
```sql
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url TEXT,
  text TEXT,
  grade NUMERIC(5,2),
  feedback TEXT
);
```

**Características:**
- Múltiples entregas permitidas (se toma la más reciente)
- Entrega por URL (Google Drive, Dropbox, etc.) o texto directo
- Calificación y feedback opcionales del profesor

## 🔄 Flujo de Navegación

### Para Estudiantes:

```
┌─────────────────────────────────────────────────────────┐
│                  Dashboard / Mis Cursos                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Ver Curso] → /courses/:id                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            Vista del Curso (/courses/:id)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Ver Tareas] → /assignments?courseId=X          │   │
│  │  [Ver Sesiones] → /sessions?courseId=X             │   │
│  │  [Abrir Tutor] → /tutor?courseId=X               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│      Lista de Tareas (/assignments?courseId=X)           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📋 Tarea 1 - Pendiente                          │   │
│  │  📋 Tarea 2 - Entregada                         │   │
│  │  📋 Tarea 3 - Calificada (8.5/10)               │   │
│  │                                                    │   │
│  │  [Click en tarea] → Modal de detalles            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│       Detalle de Sesión (/session/:sessionId)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Ver Tareas] → /assignments?courseId=X          │   │
│  │  Contenido de la sesión...                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Contextos de Visualización:

1. **Por Curso** (`/assignments?courseId=X`):
   - Muestra todas las tareas de un curso específico
   - Header con información del curso y botón "Volver al Curso"
   - Filtradas automáticamente por inscripciones activas

2. **Todas las Tareas** (`/assignments`):
   - Muestra tareas de todos los cursos inscritos
   - Agrupadas visualmente por curso
   - Información del curso mostrada en cada tarjeta

## 🛠️ Implementación Técnica

### Servicio: `services/assignments.ts`

#### Nuevo Método: `getStudentAssignments()`
```typescript
async getStudentAssignments(studentId: string, courseId?: number): Promise<Assignment[]>
```

**Funcionalidad:**
- Si `courseId` está presente: obtiene assignments solo de ese curso
- Si no: obtiene assignments de todos los cursos inscritos del estudiante
- Filtra automáticamente por inscripciones activas (`status = 'active'`)
- Ordena por fecha de entrega (`due_at`)

#### Método Mejorado: `getStudentSubmission()`
```typescript
async getStudentSubmission(assignmentId: string, studentId: string): Promise<AssignmentSubmission | null>
```

**Mejoras:**
- Usa `maybeSingle()` para mejor manejo de errores
- Ordena por `submitted_at` descendente y toma la más reciente
- Maneja casos donde no existe entrega previa

### Componente: `pages/AssignmentsPage.tsx`

#### Características Principales:

1. **Carga Contextual:**
   ```typescript
   const courseIdParam = searchParams.get('courseId');
   const assignments = await assignmentService.getStudentAssignments(user.id, courseId);
   ```

2. **Enriquecimiento de Datos:**
   - Obtiene información del curso asociado
   - Obtiene información del módulo (si `unit_id` existe)
   - Obtiene información de la sesión (si `session_id` existe)
   - Obtiene la última entrega del estudiante
   - Calcula estado: `pending`, `submitted`, `graded`, `late`

3. **Modal de Detalle:**
   - Muestra información completa de la tarea
   - Formulario para entregar/actualizar entrega (URL o texto)
   - Historial de entregas con feedback
   - Indicadores visuales de estado

4. **Estados Visuales:**
   - 🟡 **Pendiente**: Tarea no entregada, fecha límite no vencida
   - 🔴 **Vencida**: Tarea no entregada, fecha límite pasada
   - 🔵 **Entregada**: Tarea entregada, sin calificar aún
   - 🟢 **Calificada**: Tarea calificada con feedback

## 🔗 Navegación Integrada

### 1. Desde `CourseViewPage` (`/courses/:id`)
- Botón "Ver Tareas" → `/assignments?courseId={course.id}`
- Acceso directo contextual al curso

### 2. Desde `SessionDetailPage` (`/session/:sessionId`)
- Botón "Ver Tareas" en el header → `/assignments?courseId={session.course_id}`
- Acceso contextual desde cualquier sesión

### 3. Desde `DashboardPage`
- Enlace "Tareas Pendientes" → `/assignments`
- Muestra todas las tareas del estudiante

## 📝 Funcionalidades Implementadas

### Para Estudiantes:
- ✅ Ver lista de tareas (por curso o todas)
- ✅ Ver detalles completos de cada tarea
- ✅ Entregar tarea (URL o texto)
- ✅ Actualizar entrega existente
- ✅ Ver feedback y calificación
- ✅ Indicadores de estado (pendiente, entregada, calificada, vencida)
- ✅ Información contextual (curso, módulo, sesión)

### Para Profesores:
- ⏳ Crear nuevas tareas (pendiente de UI)
- ⏳ Calificar entregas (pendiente de UI)
- ⏳ Dar feedback (pendiente de UI)

*Nota: Los profesores pueden gestionar tareas desde `/teacher/assignments` que ya existe*

---

## 🎓 Integración en Sistema de Evaluación ⭐ ACTUALIZADO

Las tareas están completamente integradas en el sistema de evaluación:

### Nota Final
- Las tareas se incluyen en el cálculo de la nota final del curso
- Forman parte del 30% de "Quizzes/Trivias/Tareas" (configurable)
- Se promedian con quizzes y trivias para obtener el promedio general
- Ver: `INTEGRACION_TAREAS_EVALUACION.md` para detalles completos

### Porcentaje de Avance
- Las tareas se incluyen en el cálculo del porcentaje de avance del curso
- Solo cuentan cuando están **calificadas** (no solo entregadas)
- Se suman a unidades, sesiones y quizzes para el total de items

**Archivos actualizados:**
- `services/gradingService.ts` - Incluye tareas en cálculo de notas finales
- `services/progressService.ts` - Incluye tareas en cálculo de progreso

**Documentación completa:** Ver `INTEGRACION_TAREAS_EVALUACION.md`

## 🎨 Componentes UI

### `AssignmentDetailModal`
Modal completo para ver y entregar tareas:

**Secciones:**
1. **Header**: Título, curso, módulo, sesión (si aplica)
2. **Información**: Fecha límite, estado, calificación (si existe)
3. **Descripción**: Contenido completo de la tarea
4. **Formulario de Entrega**: URL y/o texto
5. **Historial**: Entrega anterior con feedback (si existe)

### `AssignmentsPage`
Página principal de tareas:

**Características:**
- Grid responsive (1 columna móvil, 2 tablet, múltiples desktop)
- Cards con información resumida
- Estado visual con chips de color
- Click para abrir modal de detalle
- Header contextual cuando hay `courseId`

## 🔒 Seguridad y RLS

### Políticas RLS (a implementar):

1. **`assignments`**:
   - Estudiantes pueden ver assignments de cursos inscritos
   - Profesores pueden ver assignments de sus cursos
   - Admins pueden ver todos

2. **`assignment_submissions`**:
   - Estudiantes pueden crear/ver sus propias entregas
   - Profesores pueden ver entregas de sus cursos
   - Profesores pueden actualizar (calificar) entregas

*Nota: Verificar que las políticas RLS estén configuradas en Supabase*

## 📊 Estados y Métricas

### Cálculo de Estado:
```typescript
if (submission?.grade !== null) → 'graded'
else if (submission) → 'submitted'
else if (due_at && now > due_at) → 'late'
else → 'pending'
```

### Información Mostrada:
- Días restantes/hasta vencimiento
- Fecha límite formateada
- Calificación (si existe)
- Feedback del profesor (si existe)

## 🚀 Mejoras Futuras Sugeridas

1. **Filtros Avanzados:**
   - Por estado (pendiente, entregada, calificada, vencida)
   - Por fecha de entrega
   - Por curso
   - Por módulo/sesión

2. **Notificaciones:**
   - Recordatorios de tareas próximas a vencer
   - Notificación cuando se califica una tarea
   - Recordatorios de tareas vencidas

3. **Archivos:**
   - Subida directa de archivos (además de URL)
   - Integración con Supabase Storage
   - Preview de archivos adjuntos

4. **Analytics:**
   - Progreso de entregas por estudiante
   - Estadísticas de calificaciones
   - Tiempo promedio de entrega

## ✅ Checklist de Implementación

- [x] Actualizar `assignmentService.getStudentAssignments()`
- [x] Actualizar `assignmentService.getStudentSubmission()`
- [x] Reescribir `AssignmentsPage.tsx` con datos reales
- [x] Implementar modal de detalle con formulario de entrega
- [x] Agregar navegación desde `CourseViewPage`
- [x] Agregar navegación desde `SessionDetailPage`
- [x] Implementar cálculo de estados
- [x] Mostrar información contextual (curso, módulo, sesión)
- [x] Manejo de errores y estados de carga
- [ ] Verificar/configurar políticas RLS
- [ ] Testing end-to-end del flujo completo

## 📚 Referencias

- **Servicio**: `services/assignments.ts`
- **Componente**: `pages/AssignmentsPage.tsx`
- **Navegación**: `pages/CourseViewPage.tsx`, `pages/SessionDetailPage.tsx`
- **Schema**: Ver `schema_actual.md` para estructura completa de tablas

