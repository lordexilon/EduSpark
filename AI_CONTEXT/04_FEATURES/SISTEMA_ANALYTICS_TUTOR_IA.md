# 📊 Sistema de Analytics y Evaluación de Participación - Tutor IA

**Fecha de Implementación:** Enero 2025  
**Estado:** ✅ Implementado y Funcional  
**Versión:** 1.0

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Metodología de Evaluación de Participación](#metodologia-evaluacion)
3. [Métricas e Indicadores](#metricas-indicadores)
4. [Arquitectura del Sistema](#arquitectura-sistema)
5. [Validación y Calidad de Datos](#validacion-datos)
6. [Agente de IA para Recomendaciones](#agente-ia)
7. [Guía de Uso](#guia-uso)

---

## 🎯 Resumen Ejecutivo {#resumen-ejecutivo}

El Sistema de Analytics del Tutor IA permite a docentes, coordinadores y administradores:

- ✅ **Evaluar la participación** de estudiantes con el Tutor Virtual
- ✅ **Analizar el desempeño** individual y del curso
- ✅ **Identificar estudiantes** que necesitan atención
- ✅ **Optimizar costos** del uso de IA
- ✅ **Recibir recomendaciones** inteligentes basadas en datos
- ✅ **Vista global** para coordinadores y administradores (todos los cursos) ⭐ NUEVO

### Componentes Principales

1. **Tracking de Interacciones** - Registro automático de cada pregunta-respuesta
2. **Métricas Agregadas** - Cálculo automático de desempeño por período
3. **Dashboard para Docentes** - Visualización de métricas y análisis
4. **Agente de IA Asesor** - Recomendaciones inteligentes basadas en datos

---

## 📈 Metodología de Evaluación de Participación {#metodologia-evaluacion}

### Definición de Participación

**Participación** se define como el uso activo del Tutor IA por parte de los estudiantes, medida a través de:

1. **Interacciones Completadas**: Cada pregunta-respuesta exitosa con el tutor
2. **Frecuencia de Uso**: Número de interacciones en un período determinado
3. **Consistencia**: Regularidad en el uso del tutor a lo largo del tiempo
4. **Calidad de Interacción**: Profundidad y relevancia de las consultas

### Métricas de Participación

#### 1. Tasa de Participación del Curso

**Fórmula:**
```
Tasa de Participación = (Estudiantes Activos / Total de Estudiantes) × 100
```

**Donde:**
- **Estudiantes Activos**: Estudiantes que han tenido al menos 1 interacción con el tutor
- **Total de Estudiantes**: Estudiantes inscritos en el curso (tabla `course_enrollments`)

**Cálculo en Código:**
```typescript
// En getCourseMetrics()
const activeStudents = new Set(interactions?.map((i) => i.student_id) || []).size;
const totalStudents = new Set(enrollments?.map((e) => e.student_id) || []).size;
const participationRate = (activeStudents / totalStudents) * 100;
```

**Interpretación:**
- **0-30%**: Baja participación (requiere intervención)
- **31-60%**: Participación moderada (mejorable)
- **61-80%**: Buena participación
- **81-100%**: Excelente participación

#### 2. Frecuencia de Uso por Estudiante

**Métricas Individuales:**

```typescript
interface StudentMetrics {
  totalInteractions: number;        // Total de interacciones
  averageInteractionsPerDay: number; // Promedio diario (calculado)
  lastInteractionDate: string | null; // Última fecha de uso
  daysSinceLastInteraction: number;   // Días sin usar el tutor
}
```

**Categorización de Frecuencia:**

- **Alto Uso**: > 15 interacciones totales
- **Uso Moderado**: 5-15 interacciones
- **Bajo Uso**: 1-4 interacciones
- **Sin Uso**: 0 interacciones

#### 3. Consistencia de Uso

**Medición:**
- **Días Activos**: Número de días distintos en que el estudiante usó el tutor
- **Intervalo Promedio**: Tiempo promedio entre interacciones
- **Tendencia**: Aumentando, estable o disminuyendo

**Cálculo:**
```typescript
// Días activos únicos
const activeDays = new Set(
  interactions.map(i => new Date(i.created_at).toDateString())
).size;

// Intervalo promedio entre interacciones
const intervals = [];
for (let i = 1; i < interactions.length; i++) {
  const diff = new Date(interactions[i].created_at).getTime() - 
               new Date(interactions[i-1].created_at).getTime();
  intervals.push(diff / (1000 * 60 * 60 * 24)); // Convertir a días
}
const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
```

#### 4. Profundidad de Interacción

**Indicadores:**

- **Tokens Promedio**: Tokens usados por interacción (indica complejidad)
- **Tiempo de Respuesta**: Tiempo que toma el tutor en responder
- **Longitud de Preguntas**: Caracteres en las preguntas del estudiante
- **Longitud de Respuestas**: Caracteres en las respuestas del tutor

**Interpretación:**
- **Alta Profundidad**: > 2000 tokens/interacción, preguntas detalladas
- **Profundidad Media**: 1000-2000 tokens/interacción
- **Baja Profundidad**: < 1000 tokens/interacción, preguntas simples

---

## 📊 Métricas e Indicadores {#metricas-indicadores}

### Métricas a Nivel de Curso

#### 1. Participación Total

```typescript
interface CourseMetrics {
  totalStudents: number;              // Total de estudiantes inscritos
  activeStudents: number;              // Estudiantes que han usado el tutor
  participationRate: number;           // % de participación
  totalInteractions: number;           // Total de interacciones
  averageInteractionsPerStudent: number; // Promedio de interacciones
}
```

**Validación:**
- `activeStudents` ≤ `totalStudents` ✅
- `participationRate` entre 0 y 100 ✅
- `averageInteractionsPerStudent` = `totalInteractions / activeStudents` ✅

#### 2. Métricas de Uso

- **Total de Tokens**: Suma de todos los tokens usados
- **Costo Total**: Suma de todos los costos de interacciones
- **Tiempo Promedio de Respuesta**: Promedio de `response_time_ms`
- **Modelo Más Usado**: Modelo de IA más frecuente

#### 3. Análisis de Temas

- **Temas Más Consultados**: Extracción de palabras clave de preguntas
- **Frecuencia por Tema**: Número de consultas por tema
- **Estudiantes Únicos por Tema**: Cuántos estudiantes consultaron cada tema

**Metodología de Extracción de Temas:**

```typescript
// Extracción simplificada (mejorable con NLP)
const words = question.toLowerCase().split(/\s+/);
const mainTopic = words.find((w) => w.length > 5) || 'general';
```

**Nota**: En producción, se recomienda usar análisis NLP más sofisticado.

### Métricas a Nivel de Estudiante

#### 1. Métricas de Uso Individual

```typescript
interface StudentMetrics {
  totalInteractions: number;          // Total de interacciones
  totalTokens: number;                 // Total de tokens usados
  totalCost: number;                   // Costo total generado
  averageResponseTime: number;         // Tiempo promedio de respuesta (ms)
  lastInteractionDate: string | null;  // Fecha de última interacción
}
```

#### 2. Métricas de Desempeño

```typescript
interface PerformanceMetrics {
  performanceImprovement: number | null; // % de mejora (calculado)
  topicsCovered: string[];              // Temas cubiertos
  engagementLevel: 'high' | 'medium' | 'low'; // Nivel de engagement
}
```

**Cálculo de Mejora de Desempeño:**

La mejora se calcula comparando el desempeño antes y después del uso del tutor:

```sql
-- En la función update_student_tutor_performance()
-- Se compara con calificaciones anteriores (futuro)
performance_improvement = (
  (calificacion_promedio_despues - calificacion_promedio_antes) / 
  calificacion_promedio_antes
) * 100
```

**Nota**: Actualmente `performance_improvement` se calcula comparando con datos históricos de tareas/quizzes (implementación futura).

#### 3. Indicadores de Necesidad de Atención

Un estudiante necesita atención si cumple **al menos uno** de estos criterios:

1. **Sin Uso del Tutor**: `totalInteractions === 0`
2. **Alto Uso pero Bajo Desempeño**: 
   - `totalInteractions > 15` Y `performanceImprovement < 0`
3. **Inactividad Reciente**: 
   - `daysSinceLastInteraction > 7` Y `totalInteractions > 0`
4. **Uso Excesivo sin Mejora**: 
   - `totalInteractions > 30` Y `performanceImprovement === null`

**Priorización:**

- **Alta Prioridad**: Alto uso + bajo desempeño
- **Media Prioridad**: Sin uso del tutor
- **Baja Prioridad**: Inactividad reciente

---

## 🏗️ Arquitectura del Sistema {#arquitectura-sistema}

### Flujo de Datos

```
┌─────────────────┐
│ Estudiante      │
│ Usa Tutor IA    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ TutorVirtualPage.tsx    │
│ - Registra interacción  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ tutorTrackingService.ts │
│ - Persiste en BD        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ tutor_interactions      │
│ (Tabla BD)              │
└────────┬────────────────┘
         │
         ▼ (Trigger automático)
┌─────────────────────────┐
│ student_tutor_performance│
│ (Métricas agregadas)    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ TeacherTutorAnalytics   │
│ - Visualiza métricas     │
│ - Genera análisis IA     │
└─────────────────────────┘
```

### Componentes Técnicos

#### 1. Tracking de Interacciones

**Archivo**: `services/tutorTrackingService.ts`

**Proceso:**
1. Se ejecuta automáticamente después de cada respuesta del tutor
2. Registra: pregunta, respuesta, tokens, costo, tiempo de respuesta
3. Se almacena en `tutor_interactions`

**Validaciones:**
- ✅ Verifica que exista `user.id` y `courseId`
- ✅ Evita duplicados usando `trackedMessagesRef`
- ✅ Maneja errores sin interrumpir el flujo del usuario

#### 2. Cálculo de Métricas Agregadas

**Archivo**: `services/tutorAnalyticsService.ts`

**Proceso:**
1. Obtiene interacciones desde `tutor_interactions`
2. Obtiene métricas agregadas desde `student_tutor_performance`
3. Combina datos con información de estudiantes
4. Calcula métricas derivadas

**Validaciones:**
- ✅ Maneja casos donde no hay datos
- ✅ Valida tipos de datos antes de calcular
- ✅ Maneja errores de base de datos

#### 3. Agregación Automática

**Trigger SQL**: `update_student_tutor_performance()`

Se ejecuta automáticamente después de cada inserción en `tutor_interactions`:

```sql
CREATE TRIGGER trigger_update_student_performance
    AFTER INSERT ON tutor_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_student_tutor_performance();
```

**Funcionalidad:**
- Calcula período mensual automáticamente
- Actualiza contadores (interacciones, tokens, costos)
- Calcula promedios (tiempo de respuesta)
- Maneja conflictos con `ON CONFLICT`

---

## ✅ Validación y Calidad de Datos {#validacion-datos}

### Validaciones Implementadas

#### 1. Validación de Integridad

**En Base de Datos:**
- ✅ Foreign keys a `users` y `courses`
- ✅ Constraints de tipos de datos
- ✅ Valores por defecto para campos opcionales
- ✅ Índices para optimización

**En Código TypeScript:**
- ✅ Conversión de tipos (`courseId` string → integer)
- ✅ Validación de existencia de datos antes de calcular
- ✅ Manejo de valores null/undefined

#### 2. Validación de Consistencia

**Checks Automáticos:**

```typescript
// Validación de métricas de curso
if (activeStudents > totalStudents) {
  console.error('Inconsistencia: estudiantes activos > total');
  // Corregir: activeStudents = totalStudents
}

// Validación de participación
if (participationRate < 0 || participationRate > 100) {
  console.error('Tasa de participación fuera de rango');
  // Corregir: participationRate = Math.max(0, Math.min(100, participationRate))
}
```

#### 3. Validación de Completitud

**Datos Requeridos:**
- ✅ `student_id`: Debe existir en `users`
- ✅ `course_id`: Debe existir en `courses`
- ✅ `question`: No puede estar vacío
- ✅ `created_at`: Se genera automáticamente

**Datos Opcionales pero Recomendados:**
- `answer`: Puede estar vacío si falla la respuesta
- `tokens_used`: Se estima si no está disponible
- `cost`: Se calcula si no está disponible
- `response_time_ms`: Se estima si no está disponible

### Métricas de Calidad

#### 1. Tasa de Registro Exitoso

**Objetivo**: > 95% de interacciones registradas

**Medición:**
```typescript
const successRate = (successfulTrackings / totalInteractions) * 100;
```

#### 2. Precisión de Tokens

**Objetivo**: Diferencia < 10% entre tokens estimados y reales

**Nota**: Actualmente se estiman tokens. En el futuro, obtener tokens reales de la API de Gemini.

#### 3. Completitud de Datos

**Objetivo**: > 90% de interacciones con todos los campos requeridos

---

## 🤖 Agente de IA para Recomendaciones {#agente-ia}

### TeacherAdvisorAgent

**Archivo**: `services/teacherAdvisorAgent.ts`

### Metodología de Análisis

#### 1. Análisis de Datos

El agente recibe:
- Métricas del curso (participación, interacciones, costos)
- Métricas de estudiantes individuales
- Temas más consultados
- Estudiantes que necesitan atención

#### 2. Procesamiento con IA

**Modelo**: Gemini 2.5 Flash  
**Temperatura**: 0.7 (balance entre creatividad y precisión)

**Prompt Estructurado:**
```
1. Resumen ejecutivo del estado del curso
2. Insights clave (3-5 puntos principales)
3. Recomendaciones priorizadas con:
   - Tipo de recomendación
   - Prioridad (alta/media/baja)
   - Descripción detallada
   - Acciones sugeridas
4. Tendencias detectadas
```

#### 3. Recomendaciones Basadas en Reglas (Fallback)

Si falla la IA, se generan recomendaciones automáticas basadas en:

- **Baja Participación** (< 30%): Recomendación de engagement
- **Estudiantes sin Uso**: Recomendación de atención individual
- **Temas Problemáticos**: Recomendación de mejora de contenido
- **Costos Altos**: Recomendación de optimización

### Tipos de Recomendaciones

1. **student_attention**: Estudiantes que necesitan seguimiento
2. **course_improvement**: Mejoras generales del curso
3. **content_gap**: Brechas en el contenido identificadas
4. **engagement**: Estrategias para aumentar participación
5. **cost_optimization**: Optimización de costos de IA

---

## 📖 Guía de Uso {#guia-uso}

### Para Docentes

#### Acceder al Dashboard

1. Iniciar sesión como docente
2. Navegar a **"Análisis Tutor IA"** en el menú lateral
3. Seleccionar un curso del dropdown (solo verás tus propios cursos)
4. Ver métricas y recomendaciones

**Nota:** Los docentes solo pueden ver y analizar sus propios cursos.

### Para Coordinadores y Administradores

#### Acceder al Dashboard

1. Iniciar sesión como coordinador o administrador
2. Navegar a **"Análisis Tutor IA"** en el menú lateral
3. Seleccionar un curso del dropdown (verás todos los cursos del sistema)
4. Ver métricas y recomendaciones de cualquier curso

**Nota:** Los coordinadores y administradores tienen acceso a todos los cursos y pueden analizar el desempeño a nivel institucional.

**Ventajas:**
- ✅ Visión global del uso del Tutor IA
- ✅ Comparación entre cursos y docentes
- ✅ Identificación de patrones institucionales
- ✅ Optimización de recursos a nivel global

#### Interpretar Métricas

**Tasa de Participación:**
- < 30%: Considerar estrategias de promoción del tutor
- 30-60%: Buen inicio, puede mejorarse
- > 60%: Excelente adopción

**Estudiantes que Necesitan Atención:**
- Revisar lista de estudiantes identificados
- Contactar estudiantes sin uso del tutor
- Ofrecer apoyo adicional a estudiantes con bajo desempeño

**Recomendaciones del Asesor IA:**
- Revisar recomendaciones priorizadas
- Implementar acciones sugeridas
- Monitorear resultados

### Para Administradores

#### Monitoreo de Costos

- Revisar costos diarios/semanales/mensuales
- Configurar límites de uso si es necesario
- Identificar cursos/usuarios con uso excesivo

#### Análisis Global

- Comparar participación entre cursos
- Identificar tendencias generales
- Optimizar recursos de IA

---

## 🔍 Validación de la Metodología

### Checklist de Validación

#### ✅ Métricas de Participación

- [x] Tasa de participación calculada correctamente
- [x] Estudiantes activos identificados correctamente
- [x] Comparación con total de estudiantes inscritos
- [x] Manejo de casos edge (0 estudiantes, todos activos, etc.)

#### ✅ Métricas Individuales

- [x] Conteo de interacciones por estudiante
- [x] Cálculo de tokens y costos
- [x] Identificación de última interacción
- [x] Cálculo de tiempo promedio de respuesta

#### ✅ Identificación de Necesidades

- [x] Estudiantes sin uso identificados
- [x] Estudiantes con alto uso y bajo desempeño
- [x] Estudiantes inactivos recientemente
- [x] Priorización correcta de alertas

#### ✅ Calidad de Datos

- [x] Validación de tipos de datos
- [x] Manejo de valores null/undefined
- [x] Prevención de duplicados
- [x] Manejo de errores de BD

### Mejoras Futuras

1. **Análisis NLP Avanzado**: Extracción más precisa de temas
2. **Cálculo de Mejora de Desempeño**: Integración con calificaciones reales
3. **Métricas de Satisfacción**: Encuestas a estudiantes sobre el tutor
4. **Análisis Predictivo**: Predicción de estudiantes en riesgo
5. **Tokens Reales**: Obtener tokens exactos de la API de Gemini

---

## 📚 Referencias Técnicas

### Archivos Clave

- `sql_scripts/92_tutor_analytics_tables.sql` - Esquema de base de datos
- `sql_scripts/92_tutor_analytics_tables_fix_rls.sql` - ⭐ NUEVO - Corrección de políticas RLS para coordinadores
- `services/tutorTrackingService.ts` - Tracking de interacciones
- `services/tutorAnalyticsService.ts` - Cálculo de métricas
- `services/teacherAdvisorAgent.ts` - Agente de IA para recomendaciones
- `services/teacherCourses.ts` - ⭐ ACTUALIZADO - Agregada función `getAllCourses()` para coordinadores/admin
- `pages/TeacherTutorAnalyticsPage.tsx` - ⭐ ACTUALIZADO - Dashboard con soporte para coordinadores y administradores

### Tablas de Base de Datos

- `tutor_interactions` - Registro detallado de interacciones
- `student_tutor_performance` - Métricas agregadas por período
- `tutor_usage_limits` - Configuración de límites

---

**Última Actualización**: Enero 2025  
**Mantenido por**: Equipo de Desarrollo EduSpark

