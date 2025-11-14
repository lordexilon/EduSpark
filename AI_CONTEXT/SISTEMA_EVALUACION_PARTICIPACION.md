# 📊 Sistema de Evaluación y Participación

**Fecha:** Diciembre 2024  
**Estado:** 🚧 Implementación Inicial

---

## 🎯 Objetivo

Permitir a los docentes evaluar y monitorear:
1. **Acceso al contenido**: Qué unidades y sesiones está viendo el estudiante
2. **Participación activa**: Cuánto tiempo dedica a cada unidad/sesión
3. **Progreso**: Qué tan avanzado está en el curso
4. **Completitud**: Si completó las unidades y sesiones requeridas

---

## 🗄️ Estructura de Base de Datos

### Tablas Nuevas:

#### `unit_progress`
Tracking por unidad de contenido:
```sql
CREATE TABLE unit_progress (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    course_id INTEGER NOT NULL,
    
    -- Métricas
    is_completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Tracking temporal
    first_accessed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    
    UNIQUE(student_id, unit_id)
);
```

#### `session_progress`
Tracking por sesión de aprendizaje:
```sql
CREATE TABLE session_progress (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    session_id UUID NOT NULL,
    unit_id UUID,
    course_id INTEGER NOT NULL,
    
    -- Métricas
    is_completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Actividades
    activities_completed INTEGER DEFAULT 0,
    total_activities INTEGER DEFAULT 0,
    
    -- Tracking temporal
    first_accessed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    
    UNIQUE(student_id, session_id)
);
```

### Integración con Tablas Existentes:

#### `course_enrollments`
Contiene métricas globales del curso:
- `completion_percentage`: Automáticamente calculado desde `unit_progress`
- `time_spent_minutes`: Tiempo total invertido
- `attendance_percentage`: Puede calcularse desde sesiones asistidas
- `participation_score`: Basado en actividades completadas

---

## 📈 Eventos de Tracking Automático

### 1. Acceso a Unidad
**Cuándo:** Estudiante expande una unidad en `/courses/{id}`  
**Qué se registra:**
- `first_accessed_at` si es primera vez
- `last_accessed_at` en cada acceso
- Crea registro en `unit_progress` si no existe

**Código:** `CourseViewPage.tsx` → `toggleUnit()`

### 2. Acceso a Sesión
**Cuándo:** Estudiante abre una sesión en `/session/{id}`  
**Qué se registra:**
- `first_accessed_at` si es primera vez
- `last_accessed_at` en cada acceso
- Crea registro en `session_progress` si no existe

**Código:** `SessionDetailPage.tsx` → `useEffect()`

### 3. Tiempo en Contenido
**Cuándo:** Estudiante está leyendo visualizando contenido  
**Qué se registra:**
- Actualiza `time_spent_minutes` en `unit_progress`
- Puede medirse con `Performance API` o timers

**Implementación futura:** Medición con `IntersectionObserver` o `Visibility API`

### 4. Completitud de Actividades
**Cuándo:** Estudiante completa actividades dentro de una sesión  
**Qué se registra:**
- Actualiza `activities_completed` y `total_activities`
- Calcula `completion_percentage` automáticamente
- Marca `is_completed` si `activities_completed >= total_activities`

**Implementación futura:** Tracking en actividades interactivas

---

## 🎓 Métricas de Evaluación

### Para Docentes

#### Dashboard de Curso
Pueden ver:
1. **Lista de estudiantes** con progreso general
2. **Estadísticas agregadas:**
   - Porcentaje promedio de completitud
   - Tiempo promedio dedicado
   - Unidades más/menos completadas
   - Sesiones con más actividad

3. **Detalle por estudiante:**
   - Porcentaje de completitud del curso
   - Tiempo total dedicado
   - Unidades completadas vs pendientes
   - Sesiones con actividad
   - Actividades completadas

#### Filtros y Segmentación
- Estudiante específico
- Por unidad o sesión
- Por rango de fechas
- Por nivel de participación (alto/medio/bajo)

### Para Estudiantes

#### Vista de Progreso Personal
Pueden ver:
1. **Progreso del curso:** % completado
2. **Estado de unidades:** Completadas/Pendientes/En progreso
3. **Tiempo dedicado:** Por unidad y total
4. **Sesiones:** Completadas y por completar
5. **Estadísticas personales:**
   - Días de actividad
   - Promedio diario de tiempo
   - Racha de días consecutivos

---

## 🔄 Actualización Automática

### Trigger de Base de Datos

**Función:** `update_course_completion_from_units()`  
**Cuando:** Se marca una unidad como completada  
**Qué hace:** Calcula automáticamente el `completion_percentage` del curso

```sql
-- Ejemplo de cálculo:
total_units = COUNT(units) FROM course_units WHERE course_id = X
completed_units = COUNT(*) FROM unit_progress 
    WHERE student_id = Y AND course_id = X AND is_completed = true

completion_percentage = (completed_units / total_units) * 100
```

**Resultado:** `course_enrollments.completion_percentage` se actualiza automáticamente

---

## 📊 Ejemplos de Queries Útiles

### Para Docentes

```sql
-- Ver progreso general de todos los estudiantes en un curso
SELECT 
    u.first_name || ' ' || u.last_name as nombre_estudiante,
    u.email,
    ce.completion_percentage as progreso_curso,
    ce.time_spent_minutes as tiempo_total,
    COUNT(DISTINCT up.id) FILTER (WHERE up.is_completed = true) as unidades_completadas,
    COUNT(DISTINCT sp.id) FILTER (WHERE sp.is_completed = true) as sesiones_completadas
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
LEFT JOIN unit_progress up ON up.student_id = ce.student_id AND up.course_id = ce.course_id
LEFT JOIN session_progress sp ON sp.student_id = ce.student_id AND sp.course_id = ce.course_id
WHERE ce.course_id = 1
GROUP BY ce.id, u.id, ce.completion_percentage, ce.time_spent_minutes
ORDER BY ce.completion_percentage DESC;

-- Ver progreso detallado de un estudiante
SELECT 
    cu.number as num_unidad,
    cu.title as titulo_unidad,
    up.is_completed as completada,
    up.time_spent_minutes as minutos_dedicados,
    up.first_accessed_at as primer_acceso,
    up.last_accessed_at as ultimo_acceso,
    up.completed_at as fecha_completitud
FROM course_units cu
LEFT JOIN unit_progress up 
    ON up.unit_id = cu.id 
    AND up.student_id = 'STUDENT_UUID'
WHERE cu.course_id = 1
ORDER BY cu.number;
```

### Para Reportes

```sql
-- Tasa de participación diaria
SELECT 
    DATE(first_accessed_at) as fecha,
    COUNT(DISTINCT student_id) as estudiantes_activos,
    SUM(time_spent_minutes) as minutos_totales
FROM unit_progress
WHERE course_id = 1
GROUP BY DATE(first_accessed_at)
ORDER BY fecha DESC;

-- Unidades más visitadas
SELECT 
    cu.title,
    cu.number,
    COUNT(DISTINCT up.student_id) as estudiantes_que_accedieron,
    AVG(up.time_spent_minutes) as tiempo_promedio
FROM course_units cu
LEFT JOIN unit_progress up ON up.unit_id = cu.id
WHERE cu.course_id = 1
GROUP BY cu.id, cu.title, cu.number
ORDER BY estudiantes_que_accedieron DESC;
```

---

## 🚀 Plan de Implementación

### Fase 1: ✅ Tracking Básico (Completado)
- [x] Crear tablas `unit_progress` y `session_progress`
- [x] Agregar políticas RLS
- [x] Crear servicio `progressService.ts`
- [x] Implementar tracking de acceso a unidades

### Fase 2: ⏳ Tracking de Sesiones
- [ ] Implementar tracking en `SessionDetailPage.tsx`
- [ ] Agregar tracking de tiempo en sesiones
- [ ] Registrar actividades completadas

### Fase 3: ⏳ Dashboard de Progreso para Docentes
- [ ] Crear página de reportes del curso
- [ ] Mostrar métricas agregadas
- [ ] Implementar filtros y búsquedas
- [ ] Exportar reportes a CSV/PDF

### Fase 4: ⏳ Visualización de Progreso para Estudiantes
- [ ] Agregar indicadores visuales en `CourseViewPage`
- [ ] Mostrar badges de completitud
- [ ] Mostrar tiempo dedicado por unidad
- [ ] Crear página de "Mi Progreso"

### Fase 5: ⏳ Medición Precisa de Tiempo
- [ ] Implementar `Visibility API` para detectar cuando está viendo
- [ ] Agregar pausas automáticas cuando cambia de pestaña
- [ ] Calcular tiempo "real" de lectura (descontando inactividad)

---

## 🔒 Seguridad y Privacidad

### Políticas RLS

**Estudiantes:**
- Pueden ver y gestionar SOLO su propio progreso
- NO pueden ver el progreso de otros estudiantes

**Docentes:**
- Pueden ver el progreso de estudiantes en SUS cursos
- NO pueden ver progreso de otros cursos

**Administradores:**
- Acceso completo a todos los progresos
- Pueden generar reportes globales

### Privacidad de Datos

- El tracking es transparente: los estudiantes saben qué se registra
- Los datos se usan solo para evaluación académica
- Cumplimiento con regulaciones de protección de datos

---

## 📝 Notas Importantes

1. **Tracking Pasivo:** Por ahora solo registramos accesos, no medimos tiempo real
2. **Sin Cookies:** Todo se guarda en la base de datos
3. **Asíncrono:** El tracking no bloquea la interfaz del usuario
4. **Resiliente:** Si falla el tracking, el acceso al contenido sigue funcionando

---

## 🎯 Métricas Clave (KPIs)

### Para Evaluar Participación:

1. **Tasa de Acceso:** % estudiantes que accedieron a cada unidad
2. **Tiempo Promedio:** Minutos promedio por unidad/sesión
3. **Tasa de Completitud:** % unidades completadas
4. **Engagement:** Días activos en el último mes
5. **Progreso Lineal:** Aceleración del progreso a lo largo del tiempo

---

## 🔗 Próximos Pasos

1. Ejecutar `87_create_unit_session_progress.sql` en Supabase
2. Implementar tracking en `SessionDetailPage.tsx`
3. Crear vistas de reportes para docentes
4. Agregar visualización de progreso para estudiantes
5. Implementar medidor de tiempo preciso

