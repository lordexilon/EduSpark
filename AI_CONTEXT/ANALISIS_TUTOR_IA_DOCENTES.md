# 📊 Análisis y Propuesta: Tutor IA para Docentes/Administradores

**Fecha:** Diciembre 2024  
**Estado:** Análisis y Propuesta de Implementación

---

## 📋 Tabla de Contenidos

1. [Estado Actual del Sistema](#estado-actual)
2. [Arquitectura de Agentes](#arquitectura-agentes)
3. [Propuestas de Mejora](#propuestas-mejora)
4. [Dashboard de Administración](#dashboard-admin)
5. [Plan de Implementación](#plan-implementacion)

---

## 🔍 Estado Actual del Sistema {#estado-actual}

### Sistema de Tutor IA Actual

**Componentes Principales:**
- **Frontend:** `pages/TutorVirtualPage.tsx` - Interfaz principal del tutor
- **Servicios:**
  - `services/ragService.ts` - Integración con n8n workflow para RAG
  - `services/agentService.ts` - Coordinador A2A (no activo actualmente)
  - `audio-tutor/services/tokenMonitoringService.ts` - Monitoreo de tokens local
- **Agentes:** Sistema multi-agente en `audio-tutor/agents/`

### Flujo Actual

```
Estudiante → TutorVirtualPage → RAG Service (n8n) → Gemini API → Respuesta
```

**Características:**
- ✅ Chat interactivo con tutor IA
- ✅ Integración con contenido del curso (RAG)
- ✅ Monitoreo básico de tokens (local, no persistente)
- ✅ Soporte de voz (opcional)
- ❌ **NO hay dashboard para docentes**
- ❌ **NO hay tracking de participación de estudiantes**
- ❌ **NO hay análisis de desempeño individual**
- ❌ **NO hay control de costos para administradores**

### Limitaciones Actuales

1. **Para Docentes:**
   - No pueden ver qué estudiantes están usando el tutor
   - No pueden ver el desempeño de los estudiantes con el tutor
   - No pueden identificar estudiantes que necesitan ayuda
   - No tienen métricas de participación

2. **Para Administradores:**
   - Monitoreo de tokens solo local (no persistente)
   - No hay control de costos por curso/usuario
   - No hay límites de uso configurable
   - No hay alertas de costos

3. **Para el Sistema:**
   - No hay tracking de interacciones en BD
   - No hay análisis de efectividad del tutor
   - No hay métricas de satisfacción

---

## 🤖 Arquitectura de Agentes {#arquitectura-agentes}

### Sistema Multi-Agente Actual

**Ubicación:** `audio-tutor/agents/`

**Agentes Implementados:**

1. **AgentCoordinator** (`AgentCoordinator.ts`)
   - Coordina todos los agentes
   - Punto único de entrada/salida
   - Estado: ✅ Implementado

2. **ContextAgent**
   - Obtiene contexto relevante desde RAG
   - Búsqueda semántica en Supabase (pgvector)
   - Estado: ✅ Implementado

3. **RAGAgent**
   - Construye prompts finales
   - Llama a Gemini API
   - Estado: ✅ Implementado

4. **VoiceAgent**
   - Manejo de audio y voz
   - Estado: ✅ Implementado (opcional)

### Flujo de Interacción

```
┌─────────────┐
│   Usuario    │
│  (Estudiante)│
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│ AgentCoordinator│ ◄─── Coordina todos los agentes
└────────┬────────┘
         │
         ├──► ContextAgent ──► Supabase (pgvector) ──► Contexto RAG
         │
         ├──► RAGAgent ──► Gemini API ──► Respuesta
         │
         └──► VoiceAgent ──► Audio (opcional)
```

### Interacción Actual

**Servicio Principal:** `services/ragService.ts`
- Llama a n8n webhook: `https://applicandola.auto.hostybee.com/webhook/tutor-chat`
- Envía: `{ question, courseId }`
- Recibe: `{ answer }`

**Monitoreo de Tokens:**
- Servicio: `audio-tutor/services/tokenMonitoringService.ts`
- Almacenamiento: **Solo en memoria (localStorage)**
- Precios: Gemini 1.5 Flash ($0.075/1M input, $0.30/1M output)

**Problema:** No hay persistencia en BD, los datos se pierden al recargar.

---

## 🚀 Propuestas de Mejora {#propuestas-mejora}

### 1. Dashboard para Docentes/Coordinadores/Administradores

#### Funcionalidades Propuestas

**A. Vista de Participación de Estudiantes**

Permitir a docentes ver:
- ✅ Qué estudiantes están usando el tutor
- ✅ Frecuencia de uso por estudiante
- ✅ Tiempo promedio de sesión
- ✅ Temas más consultados
- ✅ Estudiantes que no están usando el tutor

**B. Análisis de Desempeño Individual**

Por cada estudiante:
- ✅ Preguntas realizadas al tutor
- ✅ Tareas completadas después de usar el tutor
- ✅ Mejoras en calificaciones
- ✅ Temas donde necesita más ayuda
- ✅ Progreso temporal

**C. Alertas y Recomendaciones**

Sistema automático para:
- ⚠️ Estudiantes con bajo uso del tutor
- ⚠️ Estudiantes con muchas preguntas (necesitan ayuda adicional)
- ⚠️ Temas problemáticos (muchas consultas)
- ✅ Estudiantes destacados (alto uso + buenos resultados)

### 2. Sistema de Control de Tokens y Costos

#### Para Administradores

**A. Dashboard de Costos**

- 📊 Costos diarios/semanales/mensuales
- 📊 Costos por curso
- 📊 Costos por usuario
- 📊 Proyección de costos mensuales
- 📊 Gráficos de tendencias

**B. Configuración de Límites**

- 🔒 Límite de tokens por usuario
- 🔒 Límite de tokens por curso
- 🔒 Límite de costo diario
- 🔒 Alertas cuando se alcanzan límites
- 🔒 Restricción automática al exceder límites

**C. Métricas de Uso**

- 📈 Tokens usados por modelo
- 📈 Promedio de tokens por consulta
- 📈 Eficiencia de respuestas
- 📈 Análisis de costos por tipo de pregunta

### 3. Estrategias de Contacto y Mejora

#### Detección de Necesidades

**A. Estudiantes que Quieren Contactar**

- Identificar estudiantes con:
  - Muchas preguntas repetidas
  - Frustración en mensajes (análisis de sentimiento)
  - Bajo desempeño a pesar de usar el tutor
  - Solicitudes explícitas de ayuda

**B. Recomendaciones Proactivas**

- Sugerir al docente contactar estudiantes:
  - Que no han usado el tutor en X días
  - Con bajo desempeño
  - Con preguntas no resueltas satisfactoriamente

**C. Estrategias de Mejora**

- Personalización del tutor según perfil del estudiante
- Ajuste de estrategias pedagógicas basado en datos
- Identificación de brechas en el contenido del curso

---

## 📊 Dashboard de Administración {#dashboard-admin}

### Estructura Propuesta

#### 1. Dashboard Principal para Docentes

**Ruta:** `/teacher/tutor-analytics`

**Componentes:**

```
┌─────────────────────────────────────────┐
│  Tutor IA - Análisis de Estudiantes    │
├─────────────────────────────────────────┤
│                                         │
│  [Selector de Curso]                   │
│                                         │
│  ┌───────────┐  ┌───────────┐         │
│  │Participación│  │Desempeño  │         │
│  │   Total    │  │  Promedio │         │
│  └───────────┘  └───────────┘         │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  Lista de Estudiantes           │  │
│  │  - Nombre                       │  │
│  │  - Uso del tutor (X sesiones)   │  │
│  │  - Desempeño (nota promedio)    │  │
│  │  - Estado: [Activo/Necesita Ay]│  │
│  │  - [Ver Detalles] [Contactar]   │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  Temas Más Consultados          │  │
│  │  - Tema 1 (X consultas)         │  │
│  │  - Tema 2 (Y consultas)         │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 2. Dashboard de Costos para Administradores

**Ruta:** `/admin/tutor-costs`

**Componentes:**

```
┌─────────────────────────────────────────┐
│  Control de Costos - Tutor IA          │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────┐  ┌───────────┐         │
│  │Costo Hoy  │  │Costo Mes  │         │
│  │  $X.XX    │  │  $XX.XX   │         │
│  └───────────┘  └───────────┘         │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  Gráfico de Costos (7 días)     │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  Costos por Curso               │  │
│  │  - Curso 1: $X.XX               │  │
│  │  - Curso 2: $Y.YY               │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  Configuración de Límites       │  │
│  │  - Límite diario: $XX.XX        │  │
│  │  - Límite por usuario: XXX      │  │
│  │  - [Guardar]                    │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 📋 Plan de Implementación {#plan-implementacion}

### Fase 1: Persistencia de Datos (Semana 1)

#### 1.1 Tablas de Base de Datos

**Script SQL:** `sql_scripts/92_tutor_analytics_tables.sql`

```sql
-- Tabla para tracking de interacciones del tutor
CREATE TABLE IF NOT EXISTS tutor_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES tutor_conversations(id),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    question TEXT NOT NULL,
    answer TEXT,
    tokens_used INTEGER,
    cost DECIMAL(10, 6),
    model TEXT,
    response_time_ms INTEGER,
    satisfaction_rating INTEGER, -- 1-5 (opcional, futuro)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para métricas de desempeño del estudiante
CREATE TABLE IF NOT EXISTS student_tutor_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,
    average_response_time_ms INTEGER,
    topics_covered TEXT[],
    performance_improvement DECIMAL(5, 2), -- % de mejora
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, period_start)
);

-- Tabla para configuración de límites
CREATE TABLE IF NOT EXISTS tutor_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    user_id UUID REFERENCES users(id), -- NULL = límite global
    limit_type TEXT NOT NULL, -- 'daily_cost', 'monthly_cost', 'tokens_per_day'
    limit_value DECIMAL(10, 6) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tutor_interactions_student ON tutor_interactions(student_id);
CREATE INDEX idx_tutor_interactions_course ON tutor_interactions(course_id);
CREATE INDEX idx_tutor_interactions_created ON tutor_interactions(created_at);
CREATE INDEX idx_student_performance_lookup ON student_tutor_performance(student_id, course_id, period_start);
```

#### 1.2 Servicio de Tracking

**Archivo:** `services/tutorTrackingService.ts`

```typescript
// Servicio para persistir interacciones del tutor
export const trackTutorInteraction = async (
  studentId: string,
  courseId: string,
  question: string,
  answer: string,
  tokens: { input: number; output: number },
  cost: number,
  model: string,
  responseTime: number
) => {
  // Guardar en BD
  // Actualizar métricas de desempeño
  // Verificar límites
};
```

### Fase 2: Dashboard para Docentes (Semana 2)

#### 2.1 Página de Análisis

**Archivo:** `pages/TeacherTutorAnalyticsPage.tsx`

**Funcionalidades:**
- Lista de estudiantes con métricas
- Gráficos de participación
- Análisis de desempeño
- Alertas y recomendaciones

#### 2.2 Servicios de Datos

**Archivo:** `services/tutorAnalyticsService.ts`

```typescript
// Obtener métricas de estudiantes
export const getStudentMetrics = async (courseId: string) => {
  // Agregar datos de tutor_interactions
  // Combinar con datos de progreso
  // Calcular métricas
};
```

### Fase 3: Dashboard de Costos (Semana 3)

#### 3.1 Página de Administración

**Archivo:** `pages/AdminTutorCostsPage.tsx`

**Funcionalidades:**
- Visualización de costos
- Configuración de límites
- Alertas de costos
- Exportación de reportes

#### 3.2 Servicio de Costos

**Archivo:** `services/tutorCostService.ts`

```typescript
// Obtener costos agregados
export const getCostMetrics = async (filters: {
  startDate?: Date;
  endDate?: Date;
  courseId?: string;
  userId?: string;
}) => {
  // Agregar costos desde tutor_interactions
  // Calcular proyecciones
  // Retornar métricas
};
```

### Fase 4: Integración con Tutor Actual (Semana 4)

#### 4.1 Modificar TutorVirtualPage

- Agregar tracking después de cada respuesta
- Persistir en BD
- Actualizar métricas en tiempo real

#### 4.2 Modificar tokenMonitoringService

- Persistir tokens en BD
- Sincronizar con tutor_interactions
- Mantener compatibilidad con localStorage

---

## 🔧 Componentes Técnicos Necesarios

### Nuevos Servicios

1. **`services/tutorTrackingService.ts`**
   - Tracking de interacciones
   - Actualización de métricas

2. **`services/tutorAnalyticsService.ts`**
   - Análisis de datos
   - Agregaciones de métricas

3. **`services/tutorCostService.ts`**
   - Gestión de costos
   - Verificación de límites

### Nuevas Páginas

1. **`pages/TeacherTutorAnalyticsPage.tsx`**
   - Dashboard para docentes

2. **`pages/AdminTutorCostsPage.tsx`**
   - Dashboard de costos para admin

### Nuevas Tablas SQL

1. **`tutor_interactions`** - Tracking detallado
2. **`student_tutor_performance`** - Métricas agregadas
3. **`tutor_usage_limits`** - Configuración de límites

---

## 📈 Métricas Propuestas

### Para Docentes

- **Participación:** % de estudiantes usando el tutor
- **Frecuencia:** Promedio de consultas por estudiante
- **Temas:** Top 10 temas más consultados
- **Desempeño:** Correlación entre uso del tutor y calificaciones
- **Alertas:** Estudiantes que necesitan atención

### Para Administradores

- **Costos:** Diarios, semanales, mensuales
- **Uso:** Tokens por curso/usuario
- **Eficiencia:** Costo por interacción
- **Límites:** Estado de límites configurados
- **Proyecciones:** Estimación de costos futuros

---

## 🎯 Próximos Pasos

1. ✅ **Aprobar propuesta** - Revisar y aprobar este documento
2. 📝 **Crear script SQL** - Implementar tablas de BD
3. 🔧 **Implementar servicios** - Crear servicios de tracking
4. 🎨 **Desarrollar dashboards** - Crear interfaces de usuario
5. 🔗 **Integrar con tutor** - Conectar tracking con tutor actual
6. 🧪 **Testing** - Probar funcionalidades
7. 📚 **Documentación** - Documentar uso para docentes

---

## 💡 Consideraciones Adicionales

### Privacidad

- Los datos de interacciones son sensibles
- Implementar RLS (Row Level Security) en Supabase
- Solo docentes pueden ver datos de sus cursos
- Solo administradores pueden ver costos globales

### Performance

- Agregaciones de métricas pueden ser pesadas
- Considerar índices adecuados
- Cachear métricas agregadas
- Actualizar métricas en background

### Escalabilidad

- Considerar particionamiento de tablas por fecha
- Archivar datos antiguos (más de 1 año)
- Optimizar consultas de agregación

---

**Fin del Documento**








