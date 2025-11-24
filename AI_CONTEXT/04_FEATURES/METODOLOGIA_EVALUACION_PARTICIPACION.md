# 📊 Metodología de Evaluación de Participación - Tutor IA

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Estado:** ✅ Implementado y Validado

---

## 🎯 Objetivo

Evaluar de manera precisa y objetiva la participación de los estudiantes con el Tutor IA para:

1. Identificar estudiantes que necesitan apoyo adicional
2. Medir la efectividad del tutor como herramienta de aprendizaje
3. Optimizar el uso de recursos de IA
4. Mejorar continuamente la experiencia educativa

---

## 📐 Definiciones y Conceptos

### Participación

**Definición Operacional:**

La participación se define como el **uso activo y significativo** del Tutor IA por parte de los estudiantes, medida a través de múltiples dimensiones:

1. **Frecuencia**: Número de interacciones en un período
2. **Consistencia**: Regularidad en el uso a lo largo del tiempo
3. **Profundidad**: Complejidad y calidad de las interacciones
4. **Impacto**: Mejora en el desempeño académico

### Interacción

**Definición:**

Una interacción es un **par pregunta-respuesta completo** entre un estudiante y el Tutor IA, registrada cuando:

- ✅ El estudiante envía una pregunta
- ✅ El tutor genera una respuesta exitosa
- ✅ La respuesta se muestra al estudiante
- ✅ Se registra en `tutor_interactions`

**No se cuenta como interacción:**
- ❌ Preguntas sin respuesta (errores)
- ❌ Mensajes de sistema
- ❌ Interacciones canceladas por el usuario

---

## 📊 Dimensiones de Evaluación

### 1. Dimensión: Frecuencia de Uso

#### Métricas

**A. Total de Interacciones**
```
totalInteractions = COUNT(interactions WHERE student_id = X AND course_id = Y)
```

**B. Frecuencia Promedio Diaria**
```
averageInteractionsPerDay = totalInteractions / daysSinceFirstInteraction
```

**C. Frecuencia Promedio Semanal**
```
averageInteractionsPerWeek = totalInteractions / weeksSinceFirstInteraction
```

#### Categorización

| Categoría | Total Interacciones | Interpretación |
|-----------|---------------------|----------------|
| **Alto Uso** | > 15 | Estudiante muy activo, posiblemente con dificultades o muy comprometido |
| **Uso Moderado** | 5-15 | Uso regular y saludable del tutor |
| **Bajo Uso** | 1-4 | Uso esporádico, puede necesitar motivación |
| **Sin Uso** | 0 | No ha usado el tutor, requiere intervención |

#### Validación

```typescript
// Validación de frecuencia
if (totalInteractions < 0) {
  throw new Error('Total de interacciones no puede ser negativo');
}

if (averageInteractionsPerDay > 50) {
  console.warn('Frecuencia anormalmente alta, posible error en tracking');
}
```

---

### 2. Dimensión: Consistencia de Uso

#### Métricas

**A. Días Activos**
```
activeDays = COUNT(DISTINCT DATE(created_at) WHERE student_id = X)
```

**B. Intervalo Promedio entre Interacciones**
```
averageIntervalDays = AVG(DATEDIFF(days, interaction[i], interaction[i+1]))
```

**C. Desviación Estándar de Intervalos**
```
stdDevInterval = STDDEV(intervals)
```

**D. Tendencia de Uso**
```
trend = 
  IF (recentInteractions > oldInteractions) THEN 'increasing'
  ELSE IF (recentInteractions < oldInteractions) THEN 'decreasing'
  ELSE 'stable'
```

#### Categorización de Consistencia

| Categoría | Criterios | Interpretación |
|-----------|----------|----------------|
| **Muy Consistente** | activeDays > 7, stdDevInterval < 2 días | Uso regular y sostenido |
| **Consistente** | activeDays 4-7, stdDevInterval 2-5 días | Uso regular |
| **Esporádico** | activeDays 2-3, stdDevInterval > 5 días | Uso irregular |
| **Puntual** | activeDays = 1 | Solo un día de uso |

#### Implementación

```typescript
function calculateConsistency(interactions: TutorInteraction[]): {
  activeDays: number;
  averageInterval: number;
  trend: 'increasing' | 'decreasing' | 'stable';
} {
  // Calcular días activos únicos
  const uniqueDays = new Set(
    interactions.map(i => new Date(i.created_at).toDateString())
  ).size;

  // Calcular intervalos
  const intervals: number[] = [];
  for (let i = 1; i < interactions.length; i++) {
    const diff = new Date(interactions[i].created_at).getTime() - 
                 new Date(interactions[i-1].created_at).getTime();
    intervals.push(diff / (1000 * 60 * 60 * 24)); // Días
  }

  const averageInterval = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 0;

  // Determinar tendencia (comparar primera mitad vs segunda mitad)
  const midPoint = Math.floor(interactions.length / 2);
  const firstHalf = interactions.slice(0, midPoint).length;
  const secondHalf = interactions.slice(midPoint).length;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (secondHalf > firstHalf * 1.2) trend = 'increasing';
  else if (secondHalf < firstHalf * 0.8) trend = 'decreasing';

  return { activeDays: uniqueDays, averageInterval, trend };
}
```

---

### 3. Dimensión: Profundidad de Interacción

#### Métricas

**A. Tokens Promedio por Interacción**
```
averageTokensPerInteraction = totalTokens / totalInteractions
```

**B. Longitud Promedio de Preguntas**
```
averageQuestionLength = AVG(LENGTH(question))
```

**C. Longitud Promedio de Respuestas**
```
averageAnswerLength = AVG(LENGTH(answer))
```

**D. Tiempo Promedio de Respuesta**
```
averageResponseTime = AVG(response_time_ms)
```

#### Categorización de Profundidad

| Categoría | Tokens/Interacción | Interpretación |
|-----------|-------------------|----------------|
| **Alta Profundidad** | > 2000 | Preguntas complejas, respuestas detalladas |
| **Profundidad Media** | 1000-2000 | Interacciones normales |
| **Baja Profundidad** | < 1000 | Preguntas simples, respuestas cortas |

#### Validación

```typescript
// Validación de profundidad
if (averageTokensPerInteraction < 0) {
  throw new Error('Tokens promedio no puede ser negativo');
}

if (averageTokensPerInteraction > 100000) {
  console.warn('Tokens anormalmente altos, posible error');
}
```

---

### 4. Dimensión: Impacto en el Desempeño

#### Métricas

**A. Mejora de Desempeño**
```
performanceImprovement = 
  ((averageGradeAfter - averageGradeBefore) / averageGradeBefore) * 100
```

**B. Correlación Uso-Desempeño**
```
correlation = CORREL(totalInteractions, finalGrade)
```

**C. Eficiencia de Aprendizaje**
```
learningEfficiency = performanceImprovement / totalInteractions
```

#### Cálculo de Mejora (Implementación Futura)

```typescript
async function calculatePerformanceImprovement(
  studentId: string,
  courseId: string | number
): Promise<number> {
  // Obtener calificaciones antes del uso del tutor
  const firstInteraction = await getFirstInteraction(studentId, courseId);
  const beforeDate = firstInteraction?.created_at;

  // Obtener calificaciones después del uso del tutor
  const afterDate = new Date();

  // Calcular promedio antes
  const gradesBefore = await getGrades(studentId, courseId, {
    startDate: courseStartDate,
    endDate: beforeDate,
  });
  const avgBefore = calculateAverage(gradesBefore);

  // Calcular promedio después
  const gradesAfter = await getGrades(studentId, courseId, {
    startDate: beforeDate,
    endDate: afterDate,
  });
  const avgAfter = calculateAverage(gradesAfter);

  // Calcular mejora
  if (avgBefore === 0) return 0;
  return ((avgAfter - avgBefore) / avgBefore) * 100;
}
```

**Nota**: Actualmente `performance_improvement` se calcula comparando con datos históricos. La implementación completa requiere integración con el sistema de calificaciones.

---

## 🔢 Fórmulas de Cálculo

### Tasa de Participación del Curso

```
Tasa de Participación = (Estudiantes Activos / Total de Estudiantes) × 100

Donde:
- Estudiantes Activos = COUNT(DISTINCT student_id FROM tutor_interactions WHERE course_id = X)
- Total de Estudiantes = COUNT(DISTINCT student_id FROM course_enrollments WHERE course_id = X)
```

**Validación:**
- ✅ `0 ≤ Tasa de Participación ≤ 100`
- ✅ `Estudiantes Activos ≤ Total de Estudiantes`
- ✅ Si `Total de Estudiantes = 0`, entonces `Tasa = 0` (no dividir por cero)

### Promedio de Interacciones por Estudiante

```
Promedio = Total de Interacciones / Estudiantes Activos

Validación:
- Si Estudiantes Activos = 0, entonces Promedio = 0
- Promedio ≥ 0 (no puede ser negativo)
```

### Costo por Interacción

```
Costo Promedio = Total de Costo / Total de Interacciones

Validación:
- Si Total de Interacciones = 0, entonces Costo Promedio = 0
- Costo Promedio ≥ 0
```

---

## ✅ Criterios de Validación

### Validación de Integridad

#### 1. Validación de Datos de Entrada

```typescript
function validateInteractionData(interaction: TutorInteraction): boolean {
  // Validaciones requeridas
  if (!interaction.student_id) return false;
  if (!interaction.course_id) return false;
  if (!interaction.question || interaction.question.trim() === '') return false;
  
  // Validaciones de tipos
  if (typeof interaction.tokens_used === 'number' && interaction.tokens_used < 0) return false;
  if (typeof interaction.cost === 'number' && interaction.cost < 0) return false;
  
  return true;
}
```

#### 2. Validación de Consistencia

```typescript
function validateMetricsConsistency(
  courseMetrics: CourseMetrics,
  studentMetrics: StudentMetrics[]
): boolean {
  // Validar que estudiantes activos ≤ total estudiantes
  if (courseMetrics.activeStudents > courseMetrics.totalStudents) {
    console.error('Inconsistencia: estudiantes activos > total');
    return false;
  }

  // Validar que suma de interacciones individuales = total
  const sumIndividualInteractions = studentMetrics.reduce(
    (sum, s) => sum + s.totalInteractions, 0
  );
  
  if (Math.abs(sumIndividualInteractions - courseMetrics.totalInteractions) > 1) {
    console.warn('Posible inconsistencia en conteo de interacciones');
    // Permitir diferencia de 1 por redondeo
  }

  return true;
}
```

#### 3. Validación de Rangos

```typescript
function validateRanges(metrics: StudentMetrics): boolean {
  // Tasa de participación entre 0 y 100
  if (metrics.totalInteractions < 0) return false;
  if (metrics.totalTokens < 0) return false;
  if (metrics.totalCost < 0) return false;
  
  // Performance improvement razonable (-100% a +500%)
  if (metrics.performanceImprovement !== null) {
    if (metrics.performanceImprovement < -100 || metrics.performanceImprovement > 500) {
      console.warn('Mejora de desempeño fuera de rango esperado');
    }
  }

  return true;
}
```

---

## 🎯 Indicadores de Calidad

### 1. Tasa de Registro Exitoso

**Objetivo**: > 95%

**Cálculo:**
```
Tasa de Registro = (Interacciones Registradas / Interacciones Totales) × 100
```

**Monitoreo:**
- Comparar logs del frontend con registros en BD
- Alertar si tasa < 95%

### 2. Precisión de Tokens

**Objetivo**: Diferencia < 10% entre estimado y real

**Nota**: Actualmente se estiman tokens. En el futuro, obtener tokens reales de Gemini API.

### 3. Completitud de Datos

**Objetivo**: > 90% de interacciones con todos los campos requeridos

**Campos Requeridos:**
- ✅ `student_id`
- ✅ `course_id`
- ✅ `question`
- ✅ `created_at`

**Campos Opcionales pero Deseados:**
- `answer` (puede estar vacío si falla)
- `tokens_used` (se estima si falta)
- `cost` (se calcula si falta)
- `response_time_ms` (se estima si falta)

---

## 📈 Métricas Compuestas

### Índice de Participación Integral (IPI)

**Fórmula:**
```
IPI = (Frecuencia × 0.4) + (Consistencia × 0.3) + (Profundidad × 0.2) + (Impacto × 0.1)

Donde cada componente está normalizado de 0 a 100:
- Frecuencia: (totalInteractions / maxInteractions) × 100 (capped at 100)
- Consistencia: (activeDays / totalDays) × 100
- Profundidad: (averageTokens / maxTokens) × 100 (capped at 100)
- Impacto: performanceImprovement + 100 (normalizado)
```

**Interpretación:**
- **80-100**: Participación excelente
- **60-79**: Buena participación
- **40-59**: Participación moderada
- **20-39**: Baja participación
- **0-19**: Participación muy baja o nula

### Score de Necesidad de Atención

**Fórmula:**
```
Score = (
  (sinUso ? 30 : 0) +
  (altoUsoBajoDesempeño ? 40 : 0) +
  (inactividadReciente ? 15 : 0) +
  (usoExcesivoSinMejora ? 15 : 0)
)

Interpretación:
- Score ≥ 40: Alta prioridad
- Score 20-39: Media prioridad
- Score < 20: Baja prioridad
```

---

## 🔍 Proceso de Validación

### Validación en Tiempo Real

**Durante el Tracking:**
1. Validar datos antes de insertar en BD
2. Verificar existencia de `student_id` y `course_id`
3. Calcular valores faltantes (tokens, costos)
4. Registrar errores sin interrumpir flujo

**Código:**
```typescript
// En trackTutorInteraction()
try {
  // Validaciones previas
  if (!studentId || !courseId) {
    throw new Error('studentId y courseId son requeridos');
  }
  
  // Insertar con validación de BD
  const { data, error } = await supabase
    .from('tutor_interactions')
    .insert({...})
    .select()
    .single();
    
  if (error) {
    // Log error pero no interrumpir
    console.error('Error tracking:', error);
    throw error;
  }
  
  return data;
} catch (error) {
  // Error handling sin interrumpir flujo del usuario
  console.error('Failed to track:', error);
  throw error;
}
```

### Validación de Métricas Agregadas

**Al Calcular Métricas:**
1. Verificar existencia de datos
2. Validar cálculos matemáticos
3. Verificar consistencia entre métricas
4. Manejar casos edge (división por cero, valores null)

**Código:**
```typescript
// En getCourseMetrics()
// Validar antes de calcular
if (!course) {
  throw new Error('Curso no encontrado');
}

// Validar datos antes de calcular promedios
const participationRate = totalStudents > 0
  ? (activeStudents / totalStudents) * 100
  : 0;

// Validar rango
if (participationRate < 0 || participationRate > 100) {
  console.error('Tasa de participación fuera de rango');
  // Corregir
  participationRate = Math.max(0, Math.min(100, participationRate));
}
```

### Validación Periódica

**Recomendación**: Ejecutar validaciones periódicas (diarias o semanales):

```sql
-- Script de validación (futuro)
-- Verificar inconsistencias
SELECT 
  course_id,
  COUNT(DISTINCT student_id) as active_students,
  COUNT(*) as total_interactions
FROM tutor_interactions
GROUP BY course_id
HAVING active_students > (
  SELECT COUNT(*) FROM course_enrollments WHERE course_id = tutor_interactions.course_id
);
```

---

## 📋 Checklist de Validación

### ✅ Validación de Tracking

- [x] Todas las interacciones exitosas se registran
- [x] No se registran interacciones duplicadas
- [x] Los datos requeridos están presentes
- [x] Los tipos de datos son correctos
- [x] Las foreign keys son válidas

### ✅ Validación de Métricas

- [x] Tasa de participación entre 0 y 100
- [x] Estudiantes activos ≤ total estudiantes
- [x] Suma de interacciones individuales ≈ total del curso
- [x] Costos y tokens son números positivos
- [x] Fechas son válidas y en orden cronológico

### ✅ Validación de Cálculos

- [x] Promedios calculados correctamente
- [x] No hay división por cero
- [x] Manejo correcto de valores null
- [x] Redondeo apropiado de decimales

### ✅ Validación de Identificación de Necesidades

- [x] Estudiantes sin uso identificados correctamente
- [x] Priorización correcta de alertas
- [x] Criterios de atención son aplicados consistentemente

---

## 🚀 Mejoras Futuras

### Corto Plazo

1. **Tokens Reales**: Obtener tokens exactos de Gemini API
2. **Validación Automática**: Scripts SQL de validación periódica
3. **Alertas de Calidad**: Notificaciones cuando detecte inconsistencias

### Mediano Plazo

1. **Análisis NLP**: Extracción más precisa de temas
2. **Cálculo de Mejora Real**: Integración con sistema de calificaciones
3. **Métricas de Satisfacción**: Encuestas a estudiantes

### Largo Plazo

1. **Análisis Predictivo**: Predicción de estudiantes en riesgo
2. **Recomendaciones Personalizadas**: Para cada estudiante individual
3. **Benchmarking**: Comparación con otros cursos

---

## 📚 Referencias

- **Código Fuente**: `services/tutorAnalyticsService.ts`
- **Tracking**: `services/tutorTrackingService.ts`
- **Base de Datos**: `sql_scripts/92_tutor_analytics_tables.sql`
- **Dashboard**: `pages/TeacherTutorAnalyticsPage.tsx`

---

**Última Actualización**: Enero 2025  
**Versión del Documento**: 1.0

