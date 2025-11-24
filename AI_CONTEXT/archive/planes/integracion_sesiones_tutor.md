# Integración de Sesiones y Tutor Virtual

**Fecha:** Octubre 2025  
**Versión:** 3.3

## Problemas Identificados

### 1. Desconexión entre Rutas de Sesiones
- **Problema:** `/session/clase-1` (ruta antigua/estática) vs `/teacher/courses/1` (editor real)
- **Causa:** `SessionDetailPage` usaba datos estáticos de `SESSIONS_DATA` en lugar de la BD
- **Solución:** Actualizado `SessionDetailPage` para cargar sesiones reales desde la BD usando `sessionService.getSession()`

### 2. Tutor Virtual Mostraba Dashboard
- **Problema:** Al acceder a `/tutor` sin `courseId`, mostraba dashboard en lugar del selector
- **Causa:** `showCourseSelector` no se activaba correctamente cuando no había `courseId`
- **Solución:** Asegurar que `showCourseSelector = true` cuando no hay `courseId` en query params

## Cambios Implementados

### 1. SessionDetailPage - Datos Reales

**Antes:**
- Usaba `SESSIONS_DATA` estático de `constants.ts`
- No podía mostrar sesiones creadas en el editor

**Después:**
- Carga sesión real desde BD usando `sessionService.getSession(sessionId)`
- Obtiene todas las sesiones del curso para navegación prev/next
- Muestra:
  - Contenido HTML (`content_html`) usando `RichTextDisplay`
  - Actividades desde JSONB `activities`
  - Recursos desde JSONB `resources`
  - Objetivos de aprendizaje desde `learning_objectives`

### 2. CourseEditorPage - Enlace a Vista de Estudiante

**Agregado:**
- Botón "Ver como Estudiante" en cada sesión
- Abre la sesión en nueva pestaña (`target="_blank"`)
- Permite a docentes verificar cómo se ve la sesión para estudiantes

### 3. TutorVirtualPage - Mejor Manejo de courseId

**Corregido:**
- Si no hay `courseId` en query params, muestra `CourseSelector`
- Evita redirecciones inesperadas

### 4. Servicios - Nuevo Método

**Agregado en `sessionService`:**
```typescript
async getSession(sessionId: string): Promise<Session | null>
```

### 5. Componentes - RichTextDisplay

**Creado:**
- `components/RichTextDisplay.tsx` para mostrar contenido HTML de forma segura
- Reutilizable para unidades y sesiones

## Flujo Completo de Integración

### Para Docentes:
1. Crear/editar sesión en `/teacher/courses/1`
2. Hacer clic en "Ver como Estudiante" para previsualizar
3. La sesión se guarda en BD con UUID

### Para Estudiantes:
1. Ver sesiones en Dashboard (`/dashboard`) - "Progreso del Estudiante"
2. Hacer clic en sesión → `/session/{uuid}` (UUID real de la BD)
3. Ver contenido completo de la sesión creada por el docente
4. Navegación prev/next basada en orden real del curso

### Tutor Virtual:
1. Acceder a `/tutor` → Muestra selector de curso
2. O acceder a `/tutor?courseId=1` → Carga curso directamente
3. Funciona con sesiones y materiales reales del curso

## Estructura de Datos Real

### Sesión en BD:
```typescript
{
  id: UUID,              // UUID real
  course_id: INTEGER,    // ID del curso
  unit_id: UUID,        // ID de la unidad (opcional)
  title: TEXT,          // "Que son monomios"
  description: TEXT,    // "Fundamentos de Monomios"
  content_html: TEXT,   // Contenido didáctico HTML
  activities: JSONB,    // [{title, type, description, instructions}]
  resources: JSONB,     // [{title, type, url, thumbnail}]
  learning_objectives: TEXT[], // Array de objetivos
  order_index: INTEGER, // Orden de visualización
  starts_at: TIMESTAMPTZ,
  duration_minutes: INTEGER,
  session_type: VARCHAR(50)
}
```

## URLs Unificadas

- **Crear/Editar Sesión:** `/teacher/courses/{courseId}` (tab "Sesiones")
- **Ver Sesión (Estudiante):** `/session/{sessionId}` (UUID real)
- **Tutor Virtual:** `/tutor` o `/tutor?courseId={courseId}`

## Próximos Pasos (Opcionales)

1. **Tracking de Progreso Real:** Implementar seguimiento de actividades completadas
2. **Mejoras en Navegación:** Agregar breadcrumbs curso → unidad → sesión
3. **Comentarios/Discusión:** Foro por sesión para preguntas

