# 📝 Integración de Tareas (Assignments) en el Sistema de Evaluación

**Fecha:** Diciembre 2024  
**Estado:** ✅ Implementado

---

## 🎯 Resumen

Las **tareas (assignments)** ahora están completamente integradas en el sistema de evaluación de EduSpark. Las tareas puntúan tanto en la **nota final** del curso como en el **porcentaje de avance** del estudiante.

---

## 📊 Componentes del Sistema

### 1️⃣ Tablas de Base de Datos

#### `assignments`
Almacena las tareas creadas por los docentes:
- `id` (UUID): Identificador único
- `course_id` (INTEGER): Curso al que pertenece
- `unit_id` (UUID, opcional): Unidad asociada
- `session_id` (UUID, opcional): Sesión asociada
- `title` (TEXT): Título de la tarea
- `description` (TEXT): Descripción/instrucciones (HTML formateado)
- `due_at` (TIMESTAMPTZ, opcional): Fecha límite
- `max_points` (NUMERIC): Puntaje máximo (por defecto 100)
- `attachments` (JSONB): Archivos adjuntos
- `created_at` (TIMESTAMPTZ): Fecha de creación

#### `assignment_submissions`
Almacena las entregas de los estudiantes:
- `id` (UUID): Identificador único
- `assignment_id` (UUID): Tarea asociada
- `student_id` (UUID): Estudiante que entregó
- `submitted_at` (TIMESTAMPTZ): Fecha de entrega
- `url` (TEXT, opcional): URL de archivo adjunto
- `text` (TEXT, opcional): Texto de la entrega
- `grade` (NUMERIC, opcional): Calificación asignada por el docente
- `feedback` (TEXT, opcional): Comentarios del docente

---

## 🎓 Integración en Nota Final

### Cálculo de Nota Final

Las tareas se incluyen en el cálculo de la nota final del curso mediante el sistema de ponderación configurable.

#### Fórmula de Nota Final:

```
Nota Final = 
  (Promedio de Quizzes/Trivias/Tareas) × quizzes_weight +
  (Primer Examen) × exam1_weight +
  (Segundo Examen) × exam2_weight +
  (Examen Final) × final_exam_weight
```

#### Ponderación por Defecto:
- **30%** - Quizzes, Trivias y **Tareas** (promedio de todas)
- **20%** - Primer Examen Parcial
- **20%** - Segundo Examen Parcial
- **30%** - Examen Final

### Cómo se Calcula el Promedio de Tareas

1. **Obtener todas las tareas del curso** (`assignments` donde `course_id = X`)
2. **Obtener todas las entregas calificadas** del estudiante (`assignment_submissions` donde `student_id = Y` y `grade IS NOT NULL`)
3. **Calcular porcentaje de cada tarea**:
   ```
   porcentaje = (calificación / max_points) × 100
   ```
4. **Promediar todos los porcentajes** de tareas calificadas
5. **Combinar con quizzes y trivias** para obtener el promedio general

### Implementación Técnica

**Archivo:** `services/gradingService.ts`

**Función:** `calculateFinalGrade(studentId, courseId)`

```typescript
// Obtener tareas del curso
const { data: courseAssignments } = await supabase
  .from('assignments')
  .select('id, max_points')
  .eq('course_id', courseId);

// Obtener entregas calificadas del estudiante
const { data: submissions } = await supabase
  .from('assignment_submissions')
  .select('assignment_id, grade, assignments!inner(max_points)')
  .eq('student_id', studentId)
  .in('assignment_id', assignmentIds)
  .not('grade', 'is', null);

// Calcular porcentaje para cada entrega
assignmentsGrades = submissions.map((sub) => {
  const maxPoints = sub.assignments?.max_points || 100;
  const grade = sub.grade || 0;
  return (grade / maxPoints) * 100;
});

// Combinar con quizzes y trivias
const allQuizzesAndAssignments = [
  ...quizzesPercentages,
  ...assessmentsAssignmentsPercentages,
  ...assignmentsGrades
];

// Calcular promedio
const quizzesAverage = allQuizzesAndAssignments.length > 0
  ? allQuizzesAndAssignments.reduce((sum, p) => sum + p, 0) / allQuizzesAndAssignments.length
  : null;
```

---

## 📈 Integración en Porcentaje de Avance

### Cálculo de Progreso del Curso

Las tareas se incluyen en el cálculo del porcentaje de avance del curso.

#### Fórmula de Progreso:

```
Progreso = (Items Completados / Total de Items) × 100
```

#### Items Incluidos:
1. **Unidades** completadas (marcadas como "Entendido")
2. **Sesiones** completadas/visitadas
3. **Quizzes/Trivias** completados
4. **Tareas** entregadas y calificadas ⭐ NUEVO

### Cómo se Cuentan las Tareas Completadas

Una tarea se considera **completada** cuando:
- El estudiante ha entregado la tarea (`assignment_submissions` existe)
- **Y** el docente ha calificado la entrega (`grade IS NOT NULL`)

**Nota:** Las tareas entregadas pero sin calificar **NO** cuentan como completadas en el progreso.

### Implementación Técnica

**Archivo:** `services/progressService.ts`

**Función:** `calculateCourseProgress(studentId, courseId)`

```typescript
// Obtener todas las tareas del curso
const { data: courseAssignments } = await supabase
  .from('assignments')
  .select('id')
  .eq('course_id', courseId);

const totalAssignments = courseAssignments?.length || 0;

// Contar tareas entregadas y calificadas
if (totalAssignments > 0) {
  const assignmentIds = courseAssignments.map(a => a.id);
  const { data: completedAssignments } = await supabase
    .from('assignment_submissions')
    .select('assignment_id')
    .eq('student_id', studentId)
    .in('assignment_id', assignmentIds)
    .not('grade', 'is', null); // Solo contar las calificadas

  if (completedAssignments) {
    const uniqueCompleted = new Set(
      completedAssignments.map(a => a.assignment_id)
    );
    completedItems += uniqueCompleted.size;
  }
}

// Calcular porcentaje total
const totalItems = totalUnits + totalSessions + totalAssessments + totalAssignments;
const percentage = (completedItems / totalItems) * 100;
```

---

## 🔄 Flujo Completo

### Para el Estudiante:

1. **Ver tareas disponibles** en la página de asignaciones del curso
2. **Entregar tarea** subiendo archivo o escribiendo texto
3. **Esperar calificación** del docente
4. **Ver calificación y feedback** cuando el docente califique
5. **Ver impacto en nota final** y progreso del curso

### Para el Docente:

1. **Crear tarea** desde `/teacher/assignments/new`
2. **Ver entregas** desde `/teacher/assignments/:id/submissions`
3. **Calificar entrega** ingresando puntaje (0 a max_points) y feedback
4. **Ver impacto automático** en notas finales y progreso de estudiantes

---

## 📋 Ejemplo Práctico

### Escenario:
- Curso tiene **10 unidades**, **8 sesiones**, **5 quizzes** y **3 tareas**
- Estudiante ha completado: **8 unidades**, **6 sesiones**, **4 quizzes** y **2 tareas calificadas**

### Cálculo de Progreso:
```
Total de items = 10 + 8 + 5 + 3 = 26
Items completados = 8 + 6 + 4 + 2 = 20
Progreso = (20 / 26) × 100 = 76.92%
```

### Cálculo de Nota Final (ejemplo):
- **Tareas:** 85%, 90%, 75% → Promedio: 83.33%
- **Quizzes:** 80%, 85%, 90%, 88% → Promedio: 85.75%
- **Promedio combinado:** (83.33 + 85.75) / 2 = 84.54%
- **Examen 1:** 78%
- **Examen 2:** 82%
- **Examen Final:** 88%

**Nota Final:**
```
(84.54 × 0.30) + (78 × 0.20) + (82 × 0.20) + (88 × 0.30) = 
25.36 + 15.60 + 16.40 + 26.40 = 83.76
```

---

## ⚙️ Configuración

### Ponderación de Evaluaciones

Los docentes pueden configurar la ponderación desde:
- **Ruta:** `/teacher/courses/:courseId/grading-weights`
- **Página:** `CourseGradingWeightsPage.tsx`

La ponderación se guarda en la tabla `subject_grading_weights` y se aplica a todos los cursos de esa materia.

---

## 🔍 Validaciones y Reglas

### Para Calificar Tareas:
- ✅ La calificación debe ser un número válido
- ✅ La calificación no puede ser negativa
- ✅ La calificación no puede exceder `max_points` de la tarea
- ✅ El docente puede actualizar la calificación en cualquier momento
- ✅ El feedback es opcional pero recomendado

### Para Contar en Progreso:
- ✅ Solo cuentan tareas **calificadas** (no solo entregadas)
- ✅ Si un estudiante entrega múltiples veces, solo cuenta la última calificada
- ✅ Las tareas sin calificar no afectan el progreso

### Para Nota Final:
- ✅ Solo se promedian tareas **calificadas**
- ✅ Si no hay tareas calificadas, el promedio de quizzes/trivias se usa solo
- ✅ Las tareas se combinan con quizzes y trivias en el mismo peso (30%)

---

## 📊 Visualización

### Para Estudiantes:
- **Dashboard:** Muestra progreso del curso (incluye tareas)
- **Página de Calificaciones:** Muestra nota final (incluye tareas)
- **Página de Tareas:** Muestra estado de cada tarea (pendiente/calificada)

### Para Docentes:
- **Página de Calificaciones:** Muestra notas finales con desglose
- **Página de Entregas:** Permite calificar tareas
- **Dashboard:** Muestra estadísticas de progreso de estudiantes

---

## 🚀 Próximas Mejoras

### Posibles Mejoras Futuras:
- [ ] Permitir ponderación individual por tarea
- [ ] Incluir fecha límite en cálculo de progreso (tareas tardías con penalización)
- [ ] Permitir múltiples entregas con mejor calificación
- [ ] Notificaciones automáticas cuando se califica una tarea
- [ ] Exportar calificaciones de tareas a Excel/PDF
- [ ] Gráficos de rendimiento por tarea

---

## 📝 Notas Técnicas

### Importaciones Necesarias:
```typescript
import { supabase } from '../lib/supabase';
import { assignmentService, submissionService } from '../services/assignments';
import { gradingService } from '../services/gradingService';
import { progressService } from '../services/progressService';
```

### Servicios Relacionados:
- `services/assignments.ts` - Gestión de tareas y entregas
- `services/gradingService.ts` - Cálculo de notas finales
- `services/progressService.ts` - Cálculo de progreso

### Páginas Relacionadas:
- `pages/AssignmentsPage.tsx` - Vista de estudiantes
- `pages/TeacherAssignmentsPage.tsx` - Gestión de docentes
- `pages/AssignmentDetailPage.tsx` - Detalle de tarea
- `pages/AssignmentSubmissionsPage.tsx` - Calificación de entregas
- `pages/TeacherGradesPage.tsx` - Visualización de notas finales

---

## ✅ Estado de Implementación

| Componente | Estado | Archivo |
|------------|--------|---------|
| Tablas de BD | ✅ | `sql_scripts/02_schema_assignments.sql` |
| Servicio de Tareas | ✅ | `services/assignments.ts` |
| Integración en Nota Final | ✅ | `services/gradingService.ts` |
| Integración en Progreso | ✅ | `services/progressService.ts` |
| UI Crear Tareas | ✅ | `pages/CreateEditAssignmentPage.tsx` |
| UI Ver Tareas | ✅ | `pages/AssignmentsPage.tsx` |
| UI Calificar | ✅ | `pages/AssignmentSubmissionsPage.tsx` |
| UI Ver Notas | ✅ | `pages/TeacherGradesPage.tsx` |

---

**🎉 Las tareas están completamente integradas en el sistema de evaluación de EduSpark!**

