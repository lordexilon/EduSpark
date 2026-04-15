# 📊 Sistema de Tracking de Progreso

## 🚀 Quick Start

### 1. Ejecutar Migración
```bash
# Ejecuta en Supabase SQL Editor:
sql_scripts/87_create_unit_session_progress.sql
```

### 2. Verificar Instalación
El script verifica automáticamente que:
- ✅ Tablas creadas: `unit_progress` y `session_progress`
- ✅ Políticas RLS configuradas correctamente
- ✅ Triggers funcionando

### 3. Verificar en Código
El tracking ya está implementado en:
- ✅ `services/progressService.ts` - Servicios de tracking
- ✅ `pages/CourseViewPage.tsx` - Tracking al expandir unidades

---

## 📋 Funcionamiento

### Qué se Registra Automáticamente:

#### Al expandir una unidad:
```typescript
// Se ejecuta automáticamente en CourseViewPage
progressService.trackUnitAccess(studentId, unitId, courseId);
```

**Registra:**
- `first_accessed_at` - Primera vez que accede
- `last_accessed_at` - Última vez que accede
- Crea registro si no existe

#### Cálculo automático de completitud:
```sql
-- Trigger automático actualiza completion_percentage
-- en course_enrollments cuando se completa una unidad
```

---

## 📊 Consultas Útiles

### Ver progreso de un estudiante en un curso:
```sql
SELECT 
    u.first_name || ' ' || u.last_name as estudiante,
    cu.number as unidad,
    cu.title,
    up.is_completed,
    up.time_spent_minutes,
    up.first_accessed_at,
    up.last_accessed_at,
    up.completed_at
FROM unit_progress up
JOIN users u ON u.id = up.student_id
JOIN course_units cu ON cu.id = up.unit_id
WHERE up.student_id = 'UUID_DEL_ESTUDIANTE'
  AND up.course_id = 1
ORDER BY cu.number;
```

### Ver progreso general del curso:
```sql
SELECT 
    u.email as estudiante,
    COUNT(DISTINCT up.id) FILTER (WHERE up.is_completed = true) as unidades_completadas,
    SUM(up.time_spent_minutes) as minutos_totales,
    ce.completion_percentage as %_completitud
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
LEFT JOIN unit_progress up ON up.student_id = ce.student_id AND up.course_id = ce.course_id
WHERE ce.course_id = 1
GROUP BY ce.id, u.email, ce.completion_percentage
ORDER BY ce.completion_percentage DESC;
```

---

## 🔧 API Disponible

### En el Frontend:

```typescript
import { progressService } from '../services/progressService';

// Track acceso a unidad
await progressService.trackUnitAccess(studentId, unitId, courseId);

// Marcar unidad como completada
await progressService.completeUnit(studentId, unitId);

// Obtener progreso del curso
const progress = await progressService.getStudentCourseProgress(studentId, courseId);
```

---

## ⚠️ Notas

- El tracking es asíncrono y no bloquea la UI
- Si falla, el error se loguea pero no interrumpe la experiencia
- Los datos son privados: cada estudiante solo ve su propio progreso
- Los docentes solo ven progreso de estudiantes en sus cursos

