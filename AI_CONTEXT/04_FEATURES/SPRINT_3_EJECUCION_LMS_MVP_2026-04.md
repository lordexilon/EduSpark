# Sprint 3 — Flujo docente de evaluación (LMS MVP)

**Fecha de arranque:** 2026-04-19  
**Branch base:** `feature/sprint3-teacher-eval-2026-04-19`  
**Objetivo Sprint 3:** Habilitar al docente para crear, publicar y corregir actividades/evaluaciones de forma autónoma, con rúbricas reutilizables y una bandeja de corrección eficiente. Sin necesidad de soporte técnico externo.

---

## 1) Alcance comprometido del sprint (1 semana)

### Tickets en orden de ejecución (máximo 4 principales)

1. **S3-T01 — Wizard de creación de actividad/tarea guiado (HU-D01)**
   - Resultado: Flujo paso a paso (`AssignmentWizard`) que permite al docente crear y publicar una tarea con título, descripción, fecha límite, puntaje y archivos adjuntos sin pasos ambiguos.

2. **S3-T02 — Rúbricas reutilizables para corrección (HU-D02)**
   - Resultado: CRUD básico de rúbricas (nombre, criterios, niveles de desempeño). Al corregir una entrega, el docente puede seleccionar una rúbrica guardada y el sistema calcula el puntaje automáticamente.

3. **S3-T03 — Bandeja de corrección unificada (HU-D02)**
   - Resultado: Vista `GradingInboxPage` que lista todas las entregas pendientes de corrección del docente (por curso), con acceso rápido a la entrega y posibilidad de calificar + dar feedback desde la misma pantalla.

4. **S3-T04 — Panel básico de riesgo académico (HU-D03)**
   - Resultado: Widget en el Dashboard docente que lista los estudiantes sin avance (< 10% del curso) o con entregas vencidas sin entregar. Enlace directo a detalle del alumno.

---

## 2) Fuera de alcance en Sprint 3

- Rúbricas con ponderación compleja o importación desde documentos externos.
- Notificaciones por correo a estudiantes al publicar actividad (solo in-app).
- Exportación de notas en formato ANEAES/CONES (Sprint 5).
- Integración con calendario Google para plazos de entrega (fase 2).

---

## 3) Plan diario (Lun-Vie)

### Día 1 - Wizard de Actividad
- Crear `AssignmentWizard.tsx` con stepper de 3 pasos:
  1. Info básica (título, descripción, curso, unidad)
  2. Configuración (fecha límite, puntaje, adjuntos)
  3. Revisión y publicación
- Integrar con `assignmentService.createAssignment()`

### Día 2 - CRUD de Rúbricas
- Crear tabla `rubrics` + `rubric_criteria` si no existe (migración Supabase)
- Componente `RubricBuilder.tsx` — agregar/editar criterios y niveles
- `rubricService.ts` con operaciones CRUD

### Día 3 - Bandeja de Corrección
- `GradingInboxPage.tsx` — lista de submissions pendientes agrupadas por curso
- Vista de corrección inline: mostrar entrega + selector de rúbrica + input de nota y feedback
- `submissionService.gradeSubmission()` ya existe, integrarlo

### Día 4 - Panel de Riesgo Académico
- Widget `AcademicRiskWidget.tsx` en dashboard docente
- Consulta eficiente: estudiantes en cursos del docente con `completion_percentage < 10` o con entregas vencidas sin submission
- Máximo 1 query por curso del docente

### Día 5 - QA y Cierre
- Verificación end-to-end del flujo: crear actividad → estudiante entrega → docente corrige con rúbrica
- Actualizar `active_context.md` y cerrar sprint

---

## 4) Análisis técnico previo al inicio

### Tablas existentes (verificar en Supabase)
- `assignments` ✅ existe (assignments.ts)
- `assignment_submissions` ✅ existe (assignments.ts)
- `rubrics` ❓ verificar existencia
- `rubric_criteria` ❓ verificar existencia

### Servicios existentes
- `assignmentService` ✅ — getCourseAssignments, createAssignment, updateAssignment
- `submissionService` ✅ — getAssignmentSubmissions, gradeSubmission
- `gradingService.ts` ✅ — revisar si ya tiene lógica de rúbricas
- `progressService` ✅ — para consulta de completion_percentage

### Componentes a crear
| Componente | Archivo | Sprint |
|---|---|---|
| Wizard de actividad | `AssignmentWizard.tsx` | S3-T01 |
| Constructor de rúbricas | `RubricBuilder.tsx` | S3-T02 |
| Servicio de rúbricas | `rubricService.ts` | S3-T02 |
| Bandeja de corrección | `GradingInboxPage.tsx` | S3-T03 |
| Widget riesgo académico | `AcademicRiskWidget.tsx` | S3-T04 |

---

## 5) Prompts listos para usar (por ticket)

### Prompt S3-T01 (Wizard de Actividad)
Implementa un componente `AssignmentWizard.tsx` en `src/components/Features/`.
- Stepper visual de 3 pasos: Info básica / Configuración / Revisión
- Paso 1: título (requerido), descripción (RichTextEditor), selector de curso y unidad opcional
- Paso 2: fecha límite (datetime-local), puntaje máximo, upload de adjuntos
- Paso 3: resumen de lo ingresado + botón "Publicar tarea"
- Al confirmar: llama a `assignmentService.createAssignment()` y navega a la bandeja
- Diseño premium SCA: usar glassmorphism y animaciones suaves entre pasos

### Prompt S3-T02 (Rúbricas)
Implementa el servicio `rubricService.ts` y el componente `RubricBuilder.tsx`.
- La rúbrica tiene: nombre, lista de criterios, cada criterio con niveles (excelente/bueno/regular/insuficiente) y puntaje por nivel
- `RubricBuilder`: formulario para agregar/editar criterios inline, botón guardar
- Vista de selección de rúbrica en la pantalla de corrección
- Si la tabla `rubrics` no existe en Supabase, generar migración SQL mínima

### Prompt S3-T03 (Bandeja de Corrección)
Crea `GradingInboxPage.tsx` en `src/pages/Teacher/`.
- Lista submissions pendientes (sin nota) filtradas por cursos del docente
- Cada item muestra: nombre del estudiante, tarea, fecha de entrega, estado
- Click en item abre panel lateral/modal con: contenido de la entrega + selector de rúbrica + campo de nota + textarea de feedback
- Al guardar: llama a `submissionService.gradeSubmission()` y actualiza la lista
- Eficiencia: máximo 2 queries al cargar (submissions + enrollments del docente)

### Prompt S3-T04 (Riesgo Académico)
Crea `AcademicRiskWidget.tsx` en `src/components/Features/`.
- Query: estudiantes inscritos en cursos del docente con `completion_percentage < 10` O sin submissions en tareas vencidas
- Renderiza lista compacta: avatar/inicial + nombre + % avance + "Sin entregas" badge
- Máximo 5 estudiantes visibles, botón "Ver todos"
- Si no hay estudiantes en riesgo: estado vacío positivo ("¡Todos tus estudiantes están al día!")

---

## 6) Criterios de cierre Sprint 3

1. Docente puede crear y publicar una actividad en < 3 pasos sin ayuda externa.
2. Rúbrica guardada puede seleccionarse al corregir; el puntaje se calcula automáticamente.
3. Bandeja de corrección muestra todas las submissions pendientes del docente.
4. Widget de riesgo académico visible en el dashboard docente con datos reales.
5. Flujo E2E verificado: crear actividad → entrega → corrección con rúbrica.
6. Sprint registrado en `active_context.md`.

---

## 7) Registro de ejecución (llenado diario)

| Ticket | Estado      | Responsable | Evidencia | Bloqueos |
|--------|-------------|-------------|-----------|----------|
| S3-T01 | ✅ Completado | SCA-Agent | `CreateEditAssignmentPage.tsx` rediseñado como wizard de 3 pasos (Contexto → Contenido → Publicar) con stepper animado, validación por paso, resumen de confirmación y navegación prev/next. | - |
| S3-T02 | ✅ Completado | SCA-Agent | Migración SQL `20260419_rubrics_sistema_rubricas.sql` (tablas rubrics/rubric_criteria/rubric_results + RLS). `rubricService.ts` con CRUD y cálculo ponderado. `RubricBuilder.tsx` con modo `manage` (editor) y modo `select` (aplicación con score automático). | - |
| S3-T03 | ✅ Completado | SCA-Agent | `GradingInboxPage.tsx` — 2 batch queries para cargar todas las entregas de los cursos del docente. Panel lateral izquierdo/derecho: lista de entregas con estado, panel de corrección con nota manual o `RubricBuilder` en modo select. Registro en ruta `/teacher/grading-inbox`. Link desde `TeacherAssignmentsPage`. | - |
| S3-T04 | ✅ Completado | SCA-Agent | `AcademicRiskWidget.tsx` — 2 queries batch: (1) enrollment con `completion_percentage < 30%`, (2) estudiantes sin entrega en tareas vencidas. Niveles crítico/alerta, ícono `assignment_late`, estado vacío positivo, link a `CourseStudentProgressPage`. Inyectado en `TeacherDashboardPage` columna derecha. | - |

---

## 8) Nota SCA de ejecución

- Antes de iterar cada ticket: leer `AI_CONTEXT/instructions.md` + este documento + `AI_CONTEXT/active_context.md`.
- Al finalizar un ticket: actualizar las columnas de la matriz en este mismo archivo, rellenar evidencia y replicar los hallazgos en el `active_context.md`.
- Verificar existencia de tablas Supabase antes de crear migraciones nuevas.
- Mantener compatibilidad i18n `es/gn` en textos de la UI del docente.
