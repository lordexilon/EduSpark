# Diseño UI/UX por Rol
## Especificaciones de Interfaz y Experiencia de Usuario

**Fecha:** Octubre 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Coordinador Académico](#coordinador-académico)
2. [Docente](#docente)
3. [Estudiante](#estudiante)
4. [Componentes Compartidos](#componentes-compartidos)
5. [Flujos de Navegación](#flujos-de-navegación)
6. [Principios de Diseño](#principios-de-diseño)

---

## 1. Coordinador Académico

### 1.1. Dashboard Principal

**Ruta:** `/coordinator/dashboard`

**Componentes:**
- **Resumen Estadístico**
  - Total de carreras activas
  - Total de materias definidas
  - Total de docentes asignados
  - Total de estudiantes matriculados
  - Estudiantes en riesgo (destacado)

- **Accesos Rápidos**
  - Crear nueva carrera
  - Gestionar materias
  - Asignar docentes
  - Ver reportes académicos

- **Alertas y Notificaciones**
  - Materias sin docente asignado
  - Cursos con baja inscripción
  - Estudiantes en riesgo

**Código de Ejemplo:**
```tsx
// pages/CoordinatorDashboard.tsx
export const CoordinatorDashboard = () => {
  const { data: stats } = useCoordinatorStats();
  const { data: alerts } = useCoordinatorAlerts();
  
  return (
    <div className="p-6">
      <h1>Panel de Coordinador Académico</h1>
      
      {/* Resumen Estadístico */}
      <StatsGrid stats={stats} />
      
      {/* Accesos Rápidos */}
      <QuickActions />
      
      {/* Alertas */}
      <AlertsPanel alerts={alerts} />
    </div>
  );
};
```

### 1.2. Gestión de Carreras

**Ruta:** `/coordinator/careers`

**Funcionalidades:**
- Lista de carreras con filtros (activas/inactivas)
- Crear nueva carrera
- Editar carrera existente
- Ver detalles de carrera (materias, estudiantes matriculados)

**Formulario de Carrera:**
```
- Nombre *
- Código * (único)
- Descripción
- Duración (meses) *
- Total de créditos *
- Tipo de grado (bachelor/master/diploma)
- Coordinador responsable
- Estado (activo/inactivo)
```

**Vista de Detalles:**
- Información general
- Lista de materias (con semestre)
- Árbol de prerrequisitos
- Estudiantes matriculados (gráfico de progreso)
- Docentes asignados

### 1.3. Gestión de Materias

**Ruta:** `/coordinator/subjects`

**Funcionalidades:**
- Lista de materias por carrera
- Crear/editar materia
- Definir prerrequisitos (interfaz drag-and-drop para árbol)
- Ver materias sin docente asignado

**Formulario de Materia:**
```
- Carrera * (select)
- Nombre *
- Código * (único dentro de carrera)
- Descripción
- Créditos *
- Horas semanales
- Semestre (1-10 o "Electiva")
- Materia prerrequisito (select, opcional)
- Tipo (obligatoria/electiva)
- Nivel de dificultad
```

**Vista de Prerrequisitos:**
- Visualización de árbol
- Validar ciclos en prerrequisitos
- Mostrar materias bloqueadas por prerrequisitos no aprobados

### 1.4. Asignación de Docentes

**Ruta:** `/coordinator/assignments`

**Funcionalidades:**
- Asignar docente a materia por período
- Ver asignaciones actuales
- Historial de asignaciones
- Reasignar docente (si es necesario)

**Formulario de Asignación:**
```
- Materia * (select)
- Docente * (select de usuarios con rol teacher)
- Período académico * (select: "2025-1", "2025-2")
- Fecha inicio *
- Fecha fin *
- Notas (opcional)
```

**Vista de Calendario:**
- Vista de calendario mensual
- Mostrar asignaciones por período
- Alertar conflictos de horario

---

## 2. Docente

### 2.1. Dashboard Principal

**Ruta:** `/teacher/dashboard`

**Componentes:**
- **Mis Cursos Activos**
  - Lista de cursos asignados
  - Estudiantes inscritos por curso
  - Progreso promedio
  - Alertas (tareas pendientes de revisar, estudiantes en riesgo)

- **Reportes de IA**
  - Resumen de engagement del último período
  - Estudiantes en riesgo destacados
  - Recomendaciones de intervención

- **Actividades Recientes**
  - Últimas entregas de estudiantes
  - Últimas consultas al tutor IA
  - Participaciones recientes

**Código de Ejemplo:**
```tsx
// pages/TeacherDashboard.tsx
export const TeacherDashboard = () => {
  const { data: courses } = useTeacherCourses();
  const { data: aiReport } = useAIReport();
  const { data: recentActivity } = useRecentActivity();
  
  return (
    <div className="p-6">
      <h1>Panel de Docente</h1>
      
      {/* Cursos Activos */}
      <CourseCardGrid courses={courses} />
      
      {/* Reporte IA */}
      <AIInsightsPanel report={aiReport} />
      
      {/* Actividades Recientes */}
      <ActivityFeed items={recentActivity} />
    </div>
  );
};
```

### 2.2. Gestión de Curso

**Ruta:** `/teacher/courses/:courseId`

**Componentes:**
- **Tabs Principales:**
  1. Información General
  2. Módulos y Contenido
  3. Sesiones de Clase
  4. Asignaciones
  5. Quizz
  6. Estudiantes
  7. Reportes

**Tab: Módulos y Contenido**
- Lista de módulos del curso
- Drag-and-drop para reordenar
- Agregar material a módulo
- Vista previa de materiales

**Tab: Sesiones de Clase**
- Calendario de sesiones
- Crear nueva sesión (formulario)
- Tomar asistencia (lista rápida)
- Registrar participación

**Tab: Asignaciones**
- Lista de tareas creadas
- Crear nueva asignación
- Revisar entregas pendientes
- Calificar con rubrica

**Tab: Estudiantes**
- Lista de estudiantes inscritos
- Ver progreso individual
- Engagement score por estudiante
- Acciones rápidas (contactar, ver reporte)

**Tab: Reportes**
- Reportes de IA generados
- Estadísticas de curso
- Gráficos de progreso

### 2.3. Editor de Sesión de Clase

**Ruta:** `/teacher/courses/:courseId/sessions/new`

**Formulario:**
```
- Módulo asociado (select, opcional)
- Número de sesión * (auto-increment)
- Título *
- Fecha y hora programada *
- Duración (minutos) *
- Tipo (regular/examen/taller/laboratorio)
- Ubicación (aula física o URL virtual)
- Descripción
- Resumen de materiales a cubrir
- ¿Es obligatoria? (checkbox)
```

**Funcionalidades Adicionales:**
- Generar quizz pre-clase automático (botón)
- Enviar notificación a estudiantes (checkbox)
- Crear sesión recurrente (opción avanzada)

### 2.4. Tomar Asistencia

**Ruta:** `/teacher/courses/:courseId/sessions/:sessionId/attendance`

**Interfaz:**
- Lista de estudiantes inscritos
- Botones rápidos: Presente / Ausente / Tarde / Excusado
- Búsqueda/filtro rápido
- Guardar en tiempo real
- Opción de asistencia automática (si hay check-in en ubicación)

**Vista:**
```tsx
// components/AttendanceList.tsx
export const AttendanceList = ({ sessionId, students }) => {
  const [attendance, setAttendance] = useState({});
  
  const markAttendance = (studentId, status) => {
    // Actualizar estado y guardar
  };
  
  return (
    <div>
      {students.map(student => (
        <AttendanceRow
          key={student.id}
          student={student}
          status={attendance[student.id]}
          onStatusChange={(status) => markAttendance(student.id, status)}
        />
      ))}
    </div>
  );
};
```

### 2.5. Crear Asignación

**Ruta:** `/teacher/courses/:courseId/assignments/new`

**Formulario:**
```
- Título *
- Descripción
- Tipo (tarea/proyecto/examen/ensayo)
- Módulo asociado (select)
- Sesión asociada (select, opcional)
- Fecha límite *
- Puntos máximos *
- ¿Permitir entrega tardía? (checkbox)
- Penalización por día (%) (si aplica)
- Intentos máximos
- ¿Es trabajo en grupo? (checkbox)
- Tamaño máximo de grupo
- Rubrica (editor de rubrica)
- Adjuntos (upload)
```

**Editor de Rubrica:**
- Criterios de evaluación
- Puntos por criterio
- Descripción de niveles de desempeño

### 2.6. Revisar Entregas

**Ruta:** `/teacher/courses/:courseId/assignments/:assignmentId/submissions`

**Interfaz:**
- Lista de entregas (pendientes/calificadas)
- Filtros: pendientes, calificadas, tardías
- Vista de entrega individual:
  - Archivos entregados
  - Texto de respuesta
  - Rubrica para calificar
  - Campo de feedback
  - Botón "Generar feedback con IA"
  - Historial de intentos

### 2.7. Crear Quizz

**Ruta:** `/teacher/courses/:courseId/quizzes/new`

**Opciones:**
1. **Crear Manualmente**
   - Agregar preguntas una por una
   - Tipos: opción múltiple, verdadero/falso, respuesta corta

2. **Generar con IA**
   - Seleccionar materiales del curso
   - Tipo: pre-clase / post-clase
   - Número de preguntas
   - Dificultad
   - Botón "Generar Quizz"

**Configuración del Quizz:**
```
- Título *
- Descripción
- Tipo (formative/summative/practice)
- Puntos máximos
- Límite de tiempo (minutos, opcional)
- ¿Aleatorizar preguntas? (checkbox)
- ¿Aleatorizar opciones? (checkbox)
- ¿Mostrar resultados inmediatamente? (checkbox)
- ¿Permitir múltiples intentos? (checkbox)
- Puntaje mínimo para aprobar
```

---

## 3. Estudiante

### 3.1. Dashboard Principal

**Ruta:** `/student/dashboard`

**Componentes:**
- **Mis Cursos Activos**
  - Cards de cursos con progreso visual
  - Próximas sesiones
  - Tareas pendientes (con fecha límite)
  - Quizz disponibles

- **Mi Progreso**
  - Gráfico de progreso general
  - Puntos y logros recientes
  - Ranking en cursos

- **Recomendaciones de IA**
  - Sugerencias de estudio
  - Áreas de mejora
  - Materiales recomendados

- **Actividades Próximas**
  - Próxima sesión de clase
  - Tareas con fecha límite próxima
  - Eventos del curso

**Código de Ejemplo:**
```tsx
// pages/StudentDashboard.tsx
export const StudentDashboard = () => {
  const { data: enrollments } = useStudentEnrollments();
  const { data: recommendations } = useAIRecommendations();
  const { data: upcoming } = useUpcomingActivities();
  
  return (
    <div className="p-6">
      <h1>Mi Panel de Estudiante</h1>
      
      {/* Cursos Activos */}
      <CourseProgressGrid enrollments={enrollments} />
      
      {/* Recomendaciones IA */}
      <RecommendationsPanel recommendations={recommendations} />
      
      {/* Actividades Próximas */}
      <UpcomingActivitiesPanel items={upcoming} />
    </div>
  );
};
```

### 3.2. Vista de Curso

**Ruta:** `/student/courses/:courseId`

**Componentes:**
- **Navegación por Tabs:**
  1. Contenido
  2. Sesiones
  3. Tareas
  4. Quizz
  5. Progreso
  6. Tutor IA

**Tab: Contenido**
- Lista de módulos
- Indicador de progreso por módulo
- Materiales del módulo (con visto/no visto)
- Botón "Marcar como visto"
- Tiempo estimado por material

**Tab: Sesiones**
- Calendario de sesiones
- Estado de asistencia (presente/ausente)
- Grabaciones de sesiones (si disponibles)
- Materiales de la sesión

**Tab: Tareas**
- Lista de tareas asignadas
- Estado: pendiente / entregada / calificada
- Fecha límite destacada
- Botón "Entregar Tarea"
- Ver calificación y feedback

**Tab: Quizz**
- Quizz disponibles (pre-clase recomendados, post-clase obligatorios)
- Estado: disponible / completado / expirado
- Resultados de intentos anteriores
- Botón "Tomar Quizz"

**Tab: Progreso**
- Gráfico de progreso general
- Métricas: completación, asistencia, participación
- Puntos ganados
- Logros obtenidos
- Ranking en curso (si está habilitado)

**Tab: Tutor IA**
- Interfaz de chat
- Historial de conversaciones
- Sugerencias de preguntas
- Materiales relacionados destacados

### 3.3. Entregar Tarea

**Ruta:** `/student/courses/:courseId/assignments/:assignmentId/submit`

**Formulario:**
```
- Instrucciones de la tarea (readonly)
- Archivos adjuntos (upload, múltiples)
- Respuesta de texto (editor rico)
- Botón "Guardar Borrador"
- Botón "Enviar Entrega" (confirmación)
- Tiempo transcurrido trabajando (tracking automático)
```

**Validaciones:**
- Fecha límite (bloquear si pasó y no permite tardías)
- Intentos máximos
- Tamaño de archivos

**Vista Post-Entrega:**
- Confirmación de entrega
- Fecha y hora de envío
- Estado: "En revisión"
- Notificación cuando sea calificada

### 3.4. Tomar Quizz

**Ruta:** `/student/courses/:courseId/quizzes/:quizId/take`

**Interfaz:**
- Timer (si hay límite de tiempo)
- Número de pregunta actual
- Barra de progreso
- Pregunta actual:
  - Texto de pregunta
  - Opciones (si es múltiple choice)
  - Campo de respuesta (si es texto)
  - Botón "Siguiente" / "Anterior"
  - Botón "Finalizar Quizz"
  
**Confirmación de Finalización:**
- Resumen de preguntas contestadas/no contestadas
- Confirmar envío
- Mostrar resultados (si está configurado)
- Mostrar explicaciones de respuestas correctas

**Vista de Resultados:**
- Puntaje obtenido
- Porcentaje
- ¿Aprobado? (destacado)
- Puntos ganados (si aplica)
- Desglose por pregunta
- Recomendaciones de estudio

### 3.5. Consultar Tutor IA

**Ruta:** `/student/courses/:courseId/tutor`

**Interfaz:**
- Panel de chat (similar a TutorVirtualPage existente)
- Contexto del curso y módulo visible
- Sugerencias de preguntas:
  - "¿Qué significa [término]?"
  - "Explícame [concepto]"
  - "¿Cómo resuelvo [problema]?"
- Historial de consultas del curso

**Funcionalidades:**
- Chat con contexto del módulo actual
- Sugerencias basadas en materiales vistos
- Respuestas con referencias a materiales

### 3.6. Ver Reporte Personal de IA

**Ruta:** `/student/courses/:courseId/report`

**Componentes:**
- **Resumen de Progreso**
  - Porcentaje de completación
  - Asistencia
  - Participación

- **Fortalezas Identificadas**
  - Lista de áreas donde se destaca
  - Evidencia de logros

- **Áreas de Mejora**
  - Áreas que necesitan más trabajo
  - Recomendaciones específicas

- **Predicción de Calificación**
  - Calificación proyectada
  - Probabilidad de aprobar
  - Qué se necesita para mejorar

- **Recomendaciones Personalizadas**
  - Acciones sugeridas
  - Materiales prioritarios
  - Horas de estudio sugeridas

---

## 4. Componentes Compartidos

### 4.1. ProgressBar Component

```tsx
// components/ProgressBar.tsx
interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export const ProgressBar = ({ value, label, showPercentage, color = 'primary' }: ProgressBarProps) => {
  const colorClasses = {
    primary: 'bg-indigo-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  };
  
  return (
    <div>
      {label && <div className="flex justify-between mb-1">
        <span>{label}</span>
        {showPercentage && <span>{value}%</span>}
      </div>}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${colorClasses[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};
```

### 4.2. EngagementBadge Component

```tsx
// components/EngagementBadge.tsx
interface EngagementBadgeProps {
  score: number; // 0-100
  riskLevel?: 'low' | 'medium' | 'high';
}

export const EngagementBadge = ({ score, riskLevel }: EngagementBadgeProps) => {
  const getRiskColor = () => {
    if (riskLevel === 'high') return 'bg-red-100 text-red-800';
    if (riskLevel === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };
  
  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${getRiskColor()}`}>
      <span className="text-sm font-medium">
        Engagement: {score}/100
        {riskLevel && ` (${riskLevel})`}
      </span>
    </div>
  );
};
```

### 4.3. PointsDisplay Component

```tsx
// components/PointsDisplay.tsx
interface PointsDisplayProps {
  totalPoints: number;
  recentPoints?: number;
  showAnimation?: boolean;
}

export const PointsDisplay = ({ totalPoints, recentPoints, showAnimation }: PointsDisplayProps) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-2xl">🎯</div>
      <div>
        <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
        {recentPoints && recentPoints > 0 && (
          <div className="text-sm text-green-600">
            +{recentPoints} puntos recientes
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4.4. AchievementBadge Component

```tsx
// components/AchievementBadge.tsx
interface AchievementBadgeProps {
  achievement: {
    icon: string;
    title: string;
    description: string;
    rarity: string;
    earnedAt?: Date;
  };
  size?: 'small' | 'medium' | 'large';
}

export const AchievementBadge = ({ achievement, size = 'medium' }: AchievementBadgeProps) => {
  const sizeClasses = {
    small: 'w-12 h-12 text-xl',
    medium: 'w-16 h-16 text-2xl',
    large: 'w-24 h-24 text-4xl'
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg`}>
      <span>{achievement.icon}</span>
      <div className="tooltip">
        <strong>{achievement.title}</strong>
        <p>{achievement.description}</p>
      </div>
    </div>
  );
};
```

---

## 5. Flujos de Navegación

### 5.1. Flujo: Coordinador Crea Malla Curricular

```
Dashboard Coordinador
  → Click "Gestionar Carreras"
  → Lista de Carreras
  → Click "Nueva Carrera"
  → Formulario de Carrera
  → Guardar
  → Click "Gestionar Materias"
  → Agregar Materias
  → Definir Prerrequisitos (drag-and-drop)
  → Click "Asignar Docentes"
  → Asignar Docente a Materia
  → Sistema crea Curso automáticamente
```

### 5.2. Flujo: Docente Gestiona Curso

```
Dashboard Docente
  → Click en Curso
  → Vista de Curso
  → Tab "Módulos"
  → Agregar Módulo
  → Agregar Material al Módulo
  → Tab "Sesiones"
  → Crear Sesión de Clase
  → Programar fecha/hora
  → Tab "Asignaciones"
  → Crear Tarea
  → Configurar Rubrica
  → Tab "Quizz"
  → Generar Quizz con IA (o crear manual)
  → Tab "Estudiantes"
  → Ver Progreso
  → Revisar Entregas
  → Calificar
```

### 5.3. Flujo: Estudiante Completa Actividad

```
Dashboard Estudiante
  → Click en Curso
  → Tab "Contenido"
  → Ver Material
  → Marcar como visto (actualiza progreso)
  → Tab "Sesiones"
  → Ver próxima sesión
  → Asistir a sesión
  → Tab "Quizz"
  → Tomar Quizz Pre-Clase
  → Ver resultados
  → Ganar puntos
  → Tab "Tareas"
  → Ver tarea asignada
  → Entregar tarea
  → Tab "Progreso"
  → Ver logros obtenidos
  → Consultar Tutor IA si tiene dudas
```

---

## 6. Principios de Diseño

### 6.1. Consistencia Visual

- **Colores:**
  - Primary: Indigo (acciones principales)
  - Success: Green (completado, aprobado)
  - Warning: Yellow (pendiente, atención)
  - Danger: Red (riesgo, bloqueado)

- **Tipografía:**
  - Títulos: Inter Bold
  - Texto: Inter Regular
  - Códigos: Fira Code

- **Espaciado:**
  - Sistema de 4px (4, 8, 12, 16, 24, 32, 48, 64)

### 6.2. Feedback Inmediato

- Loading states en todas las acciones
- Mensajes de éxito/error claros
- Confirmaciones para acciones destructivas
- Indicadores visuales de progreso

### 6.3. Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Navegación adaptativa por dispositivo

### 6.4. Accesibilidad

- Contraste WCAG AA mínimo
- Navegación por teclado
- Screen reader friendly
- Labels descriptivos

### 6.5. Performance

- Lazy loading de componentes
- Paginación en listas largas
- Debounce en búsquedas
- Cache de datos frecuentes

---

**Fin del Documento**

