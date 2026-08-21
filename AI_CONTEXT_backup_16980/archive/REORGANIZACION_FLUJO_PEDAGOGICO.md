# Reorganización del Flujo Pedagógico: Módulos vs Sesiones

## 📚 Diferencia entre Módulo y Sesión

### **Módulo (course_units)**
- **Definición**: Bloque temático dentro de un curso que agrupa contenido relacionado
- **Propósito**: Organizar el curso en unidades temáticas coherentes
- **Ejemplo**: "Introducción a la Ética Profesional", "Normativas y Regulaciones Éticas"
- **Características**:
  - Puede tener contenido propio (HTML, Markdown)
  - Puede tener objetivos de aprendizaje
  - Agrupa múltiples sesiones relacionadas
  - Tiene un número de orden dentro del curso

### **Sesión (sessions)**
- **Definición**: Clase específica o evento de aprendizaje individual dentro de un módulo
- **Propósito**: Representa una clase presencial o virtual específica
- **Ejemplo**: "Sesión 1: Introducción a la Ética Profesional", "Examen Final"
- **Características**:
  - Tiene fecha y hora específica (`starts_at`)
  - Contiene contenido detallado (HTML, actividades, recursos)
  - Puede estar asignada a un módulo (`unit_id`)
  - Tiene un orden dentro del módulo o curso (`order_index`)

### **Jerarquía Correcta**
```
Curso (Course)
  └─ Módulo 1 (CourseUnit)
      ├─ Sesión 1.1 (Session)
      ├─ Sesión 1.2 (Session)
      └─ Sesión 1.3 (Session)
  └─ Módulo 2 (CourseUnit)
      ├─ Sesión 2.1 (Session)
      └─ Sesión 2.2 (Session)
```

## 🎯 Flujo Pedagógico Implementado

### **Para Estudiantes:**
1. **Dashboard** → Ver "Clases en Curso"
2. **Mis Cursos** → Seleccionar un curso inscrito
3. **Vista del Curso** (`/courses/:id`) → Ver módulos organizados
4. **Módulo Expandido** → Ver sesiones del módulo
5. **Detalle de Sesión** (`/session/:sessionId`) → Ver contenido completo
6. **Tutor Virtual** → Acceso contextual desde el curso

### **Para Profesores:**
1. **Dashboard del Profesor** → Ver cursos propios
2. **Mis Cursos** → Seleccionar un curso para editar
3. **Editor de Curso** (`/teacher/courses/:id`) → Gestionar módulos y sesiones
4. **Tabs**: Unidades / Sesiones / Materiales
5. **Detalle de Sesión** → Editar contenido

## ✅ Cambios Implementados

### 1. Nueva Página: `CourseViewPage` (`/courses/:id`)
- **Propósito**: Vista del curso para estudiantes
- **Características**:
  - Muestra información del curso (título, código, materia, carrera)
  - Lista módulos organizados con capacidad de expandir/colapsar
  - Sesiones agrupadas por módulo
  - Sesiones ordenadas por `order_index` o fecha
  - Enlace directo al Tutor Virtual
  - Enlaces a detalle de cada sesión

### 2. Actualización: `MyCoursesPage`
- Agregado botón "Ver Curso" que navega a `/courses/:id`
- Separado botón "Tutor" para acceso directo al tutor
- Flujo: Ver Curso → Explorar Módulos → Ver Sesiones → Detalle

### 3. Actualización: Rutas en `App.tsx`
- Nueva ruta: `/courses/:id` → `CourseViewPage`
- Mantiene rutas existentes para retrocompatibilidad

### 4. `SessionsListPage` ✅ **ACTUALIZADA**
- **Estado Actual**: Usa datos reales de la base de datos
- **Contextualización**: Requiere `courseId` como query param (`/sessions?courseId=X`)
- **Funcionalidades**:
  - Carga sesiones reales del curso desde `sessionService.getCourseSessions()`
  - Muestra información del curso en el header
  - Agrupa sesiones por módulo cuando existen módulos
  - Ordena sesiones por `order_index` o fecha
  - Botón "Volver al Curso" para navegación contextual
  - Botón "Gestionar Sesiones" para profesores (va al editor)

### 5. `AssignmentsPage` ✅ **INTEGRADA**
- **Estado Actual**: Integrada al flujo pedagógico oficial
- **Contextualización**: Soporta `/assignments?courseId=X` o todas las tareas
- **Funcionalidades**:
  - Carga assignments reales desde `assignmentService.getStudentAssignments()`
  - Muestra información contextual (curso, módulo, sesión)
  - Permite entregar tareas (URL o texto)
  - Muestra estados: pendiente, entregada, calificada, vencida
  - Modal completo con formulario de entrega y feedback
  - Navegación desde `CourseViewPage` y `SessionDetailPage`
- **Ver**: `INTEGRACION_ASIGNMENTS.md` para detalles completos

## 🔄 Flujo de Navegación Actualizado

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard Estudiantil                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Clases en Curso                                 │   │
│  │  [Curso 1] → Click → /courses/1                  │   │
│  │  Tareas Pendientes → /assignments                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Mis Cursos (/my/courses)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Ver Curso] → /courses/1                        │   │
│  │  [Tutor] → /tutor?courseId=1                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            Vista del Curso (/courses/:id)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📚 Curso: Introducción a la Ética                │   │
│  │                                                    │   │
│  │  [Ver Tareas] [Ver Sesiones] [Abrir Tutor]       │   │
│  │                                                    │   │
│  │  ▼ Módulo 1: Introducción a la Ética              │   │
│  │    ├─ Sesión 1: Introducción a la Ética Prof.     │   │
│  │    ├─ Sesión 2: Valores Morales y Éticos          │   │
│  │    └─ Sesión 3: Problemas Éticos Actuales        │   │
│  │                                                    │   │
│  │  ▶ Módulo 2: Normativas Éticas                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           ↓                    ↓                    ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Lista de Tareas   │  │ Lista de Sesiones│  │ Tutor Virtual │
│ /assignments?    │  │ /sessions?       │  │ /tutor?      │
│ courseId=1       │  │ courseId=1       │  │ courseId=1   │
│                  │  │                  │  │              │
│ • Tarea 1        │  │ • Sesión 1       │  │ [Chat con IA]│
│ • Tarea 2        │  │ • Sesión 2       │  │              │
│ [Entregar]       │  │ [Ver Detalles]    │  │              │
└──────────────────┘  └──────────────────┘  └──────────────┘
           ↓                    ↓
┌─────────────────────────────────────────────────────────┐
│       Detalle de Sesión (/session/:sessionId)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📖 Sesión 1: Introducción a la Ética Profesional│   │
│  │                                                    │   │
│  │  [Ver Tareas] [Editar]                            │   │
│  │                                                    │   │
│  │  [Contenido HTML rico]                            │   │
│  │  [Actividades]                                    │   │
│  │  [Recursos]                                       │   │
│  │                                                    │   │
│  │  [Anterior] [Siguiente]                           │   │
│  │  [Tutor IA]                                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 📝 Estado de Implementación

1. ✅ **Completado**: Crear `CourseViewPage` con vista jerárquica
2. ✅ **Completado**: Actualizar `SessionsListPage` para usar datos reales y contextualizarla
   - Usa `sessionService.getCourseSessions()` para datos reales
   - Requiere `courseId` como query param (`/sessions?courseId=X`)
   - Agrupa sesiones por módulo
   - Header contextual con información del curso
3. ✅ **Completado**: Integrar `AssignmentsPage` al flujo pedagógico oficial
   - Usa `assignmentService.getStudentAssignments()` para datos reales
   - Soporta contexto por curso (`/assignments?courseId=X`) o todas las tareas
   - Permite entregar tareas (URL o texto)
   - Muestra estados: pendiente, entregada, calificada, vencida
   - Ver `INTEGRACION_ASIGNMENTS.md` para detalles completos
4. ✅ **Completado**: Agregar navegación contextual desde `CourseViewPage` y `SessionDetailPage`
   - Botón "Ver Tareas" en `CourseViewPage`
   - Botón "Ver Tareas" en `SessionDetailPage`
   - Botón "Ver Sesiones" en `CourseViewPage`
   - Todos los enlaces son contextuales con `courseId`
5. ✅ **Completado**: Navegación desde `DashboardPage` funciona correctamente
   - Enlaces a `/assignments` y `/my/courses` actualizados
6. ⏳ **Pendiente**: Actualizar breadcrumbs/navegación para reflejar jerarquía
7. ⏳ **Pendiente**: Agregar indicadores de progreso por módulo/sesión

## 🎓 Ventajas Pedagógicas

1. **Estructura Clara**: Los estudiantes ven la organización lógica del curso
2. **Navegación Intuitiva**: Flujo Curso → Módulo → Sesión es natural
3. **Contexto Preservado**: Siempre se sabe en qué curso y módulo se está
4. **Flexibilidad**: Sesiones pueden existir sin módulo (mostradas separadamente)
5. **Acceso Rápido**: Botones directos al Tutor desde cualquier nivel

## ⚠️ Notas Importantes

- La relación `sessions.unit_id` es opcional (puede ser NULL)
- Las sesiones sin módulo se muestran en una sección especial
- El ordenamiento se hace por `order_index` o fecha (`starts_at`)
- La página mantiene compatibilidad con cursos sin módulos definidos

