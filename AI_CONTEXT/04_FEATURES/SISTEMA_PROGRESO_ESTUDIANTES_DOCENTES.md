# Sistema de Progreso de Estudiantes y Docentes

**Fecha:** Enero 2025  
**Estado:** ✅ Implementado y Verificado

---

## 📋 Resumen

El sistema de progreso de EduSpark permite tanto a estudiantes como a docentes visualizar y rastrear el avance en los cursos. El sistema es **consistente** entre ambas perspectivas, utilizando el mismo algoritmo de cálculo para garantizar precisión.

---

## 🎯 Objetivos

1. **Para Estudiantes:**
   - Visualizar su propio progreso de forma gamificada
   - Ver qué elementos faltan por completar (unidades, sesiones, quizzes)
   - Motivar mediante score y niveles

2. **Para Docentes:**
   - Ver el progreso detallado de todos sus estudiantes
   - Identificar estudiantes que necesitan apoyo
   - Monitorear el avance del curso en general

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Servicio de Progreso** (`progressService.ts`)

El servicio central que calcula y actualiza el progreso:

```typescript
// Cálculo de progreso del curso
async calculateCourseProgress(studentId: string, courseId: number): Promise<number>
```

**Elementos considerados en el cálculo:**
- ✅ **Unidades completadas** (`unit_progress` con `is_completed = true`)
- ✅ **Sesiones completadas** (`session_progress` con `is_completed = true`)
- ✅ **Quizzes/Trivias completados** (`assessment_attempts` con status `submitted` o `graded`)
- ✅ **Tareas entregadas** (`assignment_submissions` con calificación)
- ✅ **Flashcards dominadas** (`flashcard_progress` con `mastery_level >= 4`)

**Fórmula:**
```
Progreso = (Elementos Completados / Total de Elementos) * 100
```

**Actualización:**
```typescript
// Actualiza el progreso en course_enrollments
async updateCourseProgress(studentId: string, courseId: number): Promise<void>
```

#### 2. **Componente de Gamificación** (`GamificationScore.tsx`)

Componente visual para estudiantes que muestra:
- **Score** (puntos calculados: unidades×10 + sesiones×5 + quizzes×15)
- **Nivel** (Novato, Principiante, Intermedio, Avanzado, Maestro)
- **Barra de progreso** con gradientes según nivel
- **Estadísticas detalladas** (unidades, sesiones, quizzes)
- **Advertencias** para elementos pendientes

**Ubicación:** `src/components/GamificationScore.tsx`

#### 3. **Componente de Progreso Detallado** (`StudentProgressDetail.tsx`)

Componente para docentes que muestra el progreso de un estudiante:
- Progreso porcentual
- Estadísticas por categoría (unidades, sesiones, quizzes)
- Tiempo invertido
- Elementos pendientes

**Ubicación:** `src/components/StudentProgressDetail.tsx`

---

## 📊 Visualización para Estudiantes

### Página: `CourseViewPage.tsx`

**Ruta:** `/courses/:id`

**Características:**
- Muestra el componente `GamificationScore` en la parte superior
- Carga automática del progreso al entrar al curso
- Actualización en tiempo real cuando se completan elementos

**Datos mostrados:**
```typescript
{
  totalUnits: number,
  completedUnits: number,
  totalSessions: number,
  completedSessions: number,
  totalQuizzes: number,
  completedQuizzes: number,
  overallProgress: number // De course_enrollments.completion_percentage
}
```

**Carga de datos:**
- Unidades completadas desde `unit_progress`
- Sesiones completadas desde `session_progress`
- Quizzes completados desde `assessment_attempts`

---

## 👨‍🏫 Visualización para Docentes

### Página: `CourseStudentProgressPage.tsx`

**Ruta:** `/teacher/courses/:id/progress`

**Acceso:**
- Botón "Progreso Estudiantes" en `TeacherCoursesPage`
- Solo visible para docentes del curso

**Características:**
- Lista de todos los estudiantes activos del curso
- Progreso detallado de cada estudiante
- Resumen del curso (totales de unidades, sesiones, quizzes)
- Botón de actualización manual del progreso
- Ordenamiento por progreso descendente

**Datos mostrados por estudiante:**
- Nombre del estudiante
- Progreso porcentual
- Unidades completadas/totales
- Sesiones completadas/totales
- Quizzes completados/totales
- Tiempo invertido
- Elementos pendientes

**Cálculo:**
- Usa el mismo `progressService.updateCourseProgress()` que los estudiantes
- Garantiza consistencia en los cálculos

---

## 🔄 Flujo de Actualización

### Actualización Automática

El progreso se actualiza automáticamente cuando:

1. **Unidad completada:**
   - Al marcar "Entendido" en una unidad
   - Se actualiza `unit_progress.is_completed = true`
   - Se llama `progressService.updateCourseProgress()`

2. **Sesión completada:**
   - Al finalizar una sesión
   - Se actualiza `session_progress.is_completed = true`
   - Se llama `progressService.updateCourseProgress()`

3. **Quiz completado:**
   - Al enviar un quiz/trivia
   - Se crea `assessment_attempts` con status `submitted` o `graded`
   - Se llama `progressService.onAssessmentCompleted()`

### Actualización Manual

Los docentes pueden actualizar el progreso manualmente:
- Botón "Actualizar Progreso" en `CourseStudentProgressPage`
- Recalcula el progreso de todos los estudiantes del curso

---

## 📐 Consistencia del Sistema

### Verificación de Consistencia

✅ **Mismo algoritmo de cálculo:**
- Ambos lados (estudiantes y docentes) usan `progressService.calculateCourseProgress()`
- Mismo método para contar elementos completados

✅ **Misma fuente de datos:**
- `unit_progress` para unidades
- `session_progress` para sesiones
- `assessment_attempts` para quizzes
- `course_enrollments.completion_percentage` para el porcentaje final

✅ **Misma actualización:**
- Ambos usan `progressService.updateCourseProgress()`
- Se actualiza `course_enrollments.completion_percentage`

### Tablas de Base de Datos

**Tracking de Progreso:**
- `unit_progress` - Progreso de unidades por estudiante
- `session_progress` - Progreso de sesiones por estudiante
- `flashcard_progress` - Progreso de flashcards por estudiante
- `assessment_attempts` - Intentos de quizzes/trivias
- `assignment_submissions` - Entregas de tareas

**Resumen de Progreso:**
- `course_enrollments` - Contiene `completion_percentage` y `time_spent_minutes`

---

## 🎮 Gamificación

### Sistema de Score

**Cálculo de puntos:**
- Unidad completada: **10 puntos**
- Sesión completada: **5 puntos**
- Quiz completado: **15 puntos**

**Niveles:**
- **Novato:** 0-39% de progreso
- **Principiante:** 40-59% de progreso
- **Intermedio:** 60-79% de progreso
- **Avanzado:** 80-99% de progreso
- **Maestro:** 100% de progreso

### Advertencias

El sistema muestra advertencias cuando hay elementos pendientes:
- Unidades sin completar
- Sesiones sin completar
- Quizzes sin completar

Esto motiva a los estudiantes a completar todos los elementos del curso.

---

## 🔍 Páginas Relacionadas

### Para Estudiantes:
- `CourseViewPage.tsx` - Vista del curso con gamificación
- `DashboardPage.tsx` - Dashboard con resumen de progreso
- `MyCoursesPage.tsx` - Lista de cursos con progreso

### Para Docentes:
- `TeacherCoursesPage.tsx` - Lista de cursos (con botón de progreso)
- `CourseStudentProgressPage.tsx` - Progreso detallado de estudiantes
- `StudentsManagementPage.tsx` - Gestión de estudiantes (muestra completion_percentage básico)
- `ResetStudentProgressPage.tsx` - Resetear progreso de estudiantes

---

## 🛠️ Servicios y Utilidades

### `progressService.ts`

**Funciones principales:**
- `calculateCourseProgress()` - Calcula el progreso del curso
- `updateCourseProgress()` - Actualiza el progreso en la BD
- `getSessionProgress()` - Obtiene progreso de una sesión
- `trackSessionAccess()` - Registra acceso a sesión
- `completeSession()` - Marca sesión como completada
- `onAssessmentCompleted()` - Actualiza progreso tras completar quiz

### `academicService.ts`

**Funciones relacionadas:**
- `getCourseStudents()` - Obtiene estudiantes de un curso
- `getStudentEnrollments()` - Obtiene inscripciones de un estudiante
- `studentProgressResetService` - Servicio para resetear progreso

---

## ✅ Verificación de Consistencia

### Checklist de Verificación

- [x] Mismo algoritmo de cálculo en ambos lados
- [x] Misma fuente de datos (tablas de BD)
- [x] Mismo método de actualización
- [x] Visualización consistente de datos
- [x] Actualización automática cuando se completan elementos
- [x] Actualización manual disponible para docentes

### Pruebas Realizadas

1. **Progreso de Estudiante:**
   - ✅ Se muestra correctamente en `CourseViewPage`
   - ✅ Se actualiza al completar elementos
   - ✅ Score y nivel se calculan correctamente

2. **Progreso para Docente:**
   - ✅ Se muestra correctamente en `CourseStudentProgressPage`
   - ✅ Mismos valores que ve el estudiante
   - ✅ Actualización manual funciona correctamente

3. **Consistencia:**
   - ✅ Mismo porcentaje de progreso en ambos lados
   - ✅ Mismas estadísticas (unidades, sesiones, quizzes)
   - ✅ Mismo tiempo invertido

---

## 📝 Notas Técnicas

### Consideraciones de Rendimiento

- El cálculo de progreso puede ser costoso para cursos grandes
- Se recomienda actualizar solo cuando sea necesario
- La actualización manual permite controlar cuándo recalcular

### Futuras Mejoras

- [ ] Cachear cálculos de progreso
- [ ] Actualización en tiempo real (WebSockets)
- [ ] Exportar reportes de progreso (PDF/Excel)
- [ ] Gráficos de progreso histórico
- [ ] Comparación de progreso entre estudiantes

---

## 🔗 Referencias

- `src/services/progressService.ts` - Servicio de progreso
- `src/components/GamificationScore.tsx` - Componente de gamificación
- `src/components/StudentProgressDetail.tsx` - Componente de progreso detallado
- `src/pages/CourseViewPage.tsx` - Vista de curso para estudiantes
- `src/pages/CourseStudentProgressPage.tsx` - Vista de progreso para docentes

---

**Última actualización:** Enero 2025  
**Autor:** Sistema de Documentación AI

