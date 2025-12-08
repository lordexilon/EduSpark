# ✅ Sistema de Control de Disponibilidad por Fechas - Estado de Implementación

## Resumen

Se ha implementado exitosamente un sistema para controlar cuándo las unidades y sesiones están disponibles para los estudiantes basándose en fechas de inicio (`available_from`) y fin (`available_until`).

## Estado Actual: Base de Datos ✅

### Tablas Modificadas

**1. `course_units`**
- ✅ Campo `available_from` agregado
- ✅ Campo `available_until` agregado
- ✅ Constraint de validación `valid_unit_dates` creado

**2. `sessions`**
- ✅ Campo `available_from` agregado
- ✅ Campo `available_until` agregado
- ✅ Constraint de validación `valid_session_dates` creado

### Funciones SQL Creadas

- ✅ `is_unit_available_for_student(p_unit_id, p_student_id, p_check_time)`: Verifica disponibilidad de unidad
- ✅ `is_session_available_for_student(p_session_id, p_student_id, p_check_time)`: Verifica disponibilidad de sesión

### Índices Creados

- ✅ `idx_course_units_availability`: Optimiza consultas de disponibilidad para unidades
- ✅ `idx_sessions_availability`: Optimiza consultas de disponibilidad para sesiones

## Estado Actual: Frontend ✅

### Interfaces TypeScript Actualizadas

**1. `src/services/teacherCourses.ts`**
- ✅ Interfaz `CourseUnit` actualizada con `available_from` y `available_until`
- ✅ Interfaz `Session` actualizada con `available_from` y `available_until`

**2. `src/services/availabilityService.ts`**
- ✅ Creado con funciones helper:
  - `isUnitAvailable(unit, checkTime?)`
  - `isSessionAvailable(session, parentUnit?, checkTime?)`
  - `getUnitAvailabilityMessage(unit, checkTime?)`
  - `getSessionAvailabilityMessage(session, parentUnit?, checkTime?)`
  - `filterAvailableUnits(units, checkTime?)`
  - `filterAvailableSessions(sessions, unitMap?, checkTime?)`

## Próximos Pasos: Integración en UI

### 1. Agregar Campos de Fecha en Editor de Unidades

**Archivo a modificar:** `src/pages/CourseModulesPage.tsx` (o similar)

**Cambios necesarios:**

```typescript
// Agregar estados para las fechas
const [availableFrom, setAvailableFrom] = useState<string>('');
const [availableUntil, setAvailableUntil] = useState<string>('');

// Agregar inputs en el formulario
<div className="form-group">
  <label htmlFor="available_from">Disponible Desde</label>
  <input
    type="datetime-local"
    id="available_from"
    value={availableFrom}
    onChange={(e) => setAvailableFrom(e.target.value)}
    className="form-control"
  />
  <small className="form-text text-muted">
    Los estudiantes podrán acceder a esta unidad desde esta fecha/hora
  </small>
</div>

<div className="form-group">
  <label htmlFor="available_until">Disponible Hasta</label>
  <input
    type="datetime-local"
    id="available_until"
    value={availableUntil}
    onChange={(e) => setAvailableUntil(e.target.value)}
    className="form-control"
  />
  <small className="form-text text-muted">
    Los estudiantes NO podrán acceder después de esta fecha/hora (opcional)
  </small>
</div>

// Al guardar la unidad
await unitService.updateUnit(unitId, {
  ...otherFields,
  available_from: availableFrom || null,
  available_until: availableUntil || null
});
```

### 2. Agregar Campos de Fecha en Editor de Sesiones

**Archivos a modificar:**
- `src/pages/ModuleEditorPage.tsx` (o similar)
- `src/components/SessionEditorModal.tsx` (si existe)

**Cambios similares a los de Unidades**

### 3. Aplicar Filtros en Vista del Estudiante

**Archivo principal a modificar:** `src/pages/CourseViewPage.tsx`

**Implementación:**

```typescript
import { 
  isUnitAvailable, 
  isSessionAvailable,
  getUnitAvailabilityMessage,
  getSessionAvailabilityMessage 
} from '../services/availabilityService';

// En el componente
const renderUnit = (unit: CourseUnit) => {
  const available = isUnitAvailable(unit);
  const message = getUnitAvailabilityMessage(unit);

  return (
    <div className={`unit-card ${!available ? 'opacity-50' : ''}`}>
      <div className="unit-header">
        <h3>{unit.title}</h3>
        {!available && (
          <span className="badge badge-warning">
            No disponible
          </span>
        )}
      </div>
      
      {!available && message && (
        <div className="alert alert-warning">
          <i className="fas fa-clock"></i> {message}
        </div>
      )}

      {available && (
        <Link 
          to={`/student/courses/${courseId}/units/${unit.id}`}
          className="btn btn-primary"
        >
          Acceder a la unidad
        </Link>
      )}
    </div>
  );
};

const renderSession = (session: Session, parentUnit?: CourseUnit) => {
  const available = isSessionAvailable(session, parentUnit);
  const message = getSessionAvailabilityMessage(session, parentUnit);

  return (
    <div className={`session-item ${!available ? 'disabled' : ''}`}>
      <div className="session-title">
        {session.title}
        {!available && (
          <i className="fas fa-lock text-muted ml-2" title={message || 'No disponible'}></i>
        )}
      </div>

      {!available && message && (
        <small className="text-warning">
          <i className="fas fa-clock"></i> {message}
        </small>
      )}

      <div className="session-actions">
        {available ? (
          <Link 
            to={`/student/sessions/${session.id}`}
            className="btn btn-sm btn-outline-primary"
          >
            Ver sesión
          </Link>
        ) : (
          <button className="btn btn-sm btn-outline-secondary" disabled>
            No disponible
          </button>
        )}
      </div>
    </div>
  );
};
```

### 4. (Opcional) Filtrar Contenido No Disponible

Si quieres ocultar completamente el contenido no disponible en lugar de mostrarlo deshabilitado:

```typescript
// Filtrar unidades
const availableUnits = filterAvailableUnits(allUnits);

// Filtrar sesiones
const unitMap = new Map(units.map(u => [u.id, u]));
const availableSessions = filterAvailableSessions(allSessions, unitMap);

// Renderizar solo las disponibles
{availableUnits.map(unit => renderUnit(unit))}
{availableSessions.map(session => renderSession(session))}
```

## Casos de Uso Comunes

### Caso 1: Liberar Contenido Semanalmente

```typescript
// Semana 1
unit1.available_from = '2025-12-02T00:00:00Z';
unit1.available_until = null; // Sin límite

// Semana 2 (7 días después)
unit2.available_from = '2025-12-09T00:00:00Z';
unit2.available_until = null;

// Semana 3 (14 días después)
unit3.available_from = '2025-12-16T00:00:00Z';
unit3.available_until = null;
```

### Caso 2: Examen con Ventana de Tiempo

```typescript
// Examen disponible solo el 15 de diciembre de 9am a 6pm
examSession.available_from = '2025-12-15T09:00:00Z';
examSession.available_until = '2025-12-15T18:00:00Z';
```

### Caso 3: Unidad con Deadline

```typescript
// Unidad disponible hasta fin de mes
unit.available_from = '2025-12-01T00:00:00Z';
unit.available_until = '2025-12-31T23:59:59Z';
```

## Testing

### Probar en Desarrollo

```typescript
// Probar con fecha futura
const futureUnit: CourseUnit = {
  id: 'test',
  available_from: '2025-12-31T00:00:00Z',
  // ... otros campos
};

console.log(isUnitAvailable(futureUnit)); // false
console.log(getUnitAvailabilityMessage(futureUnit)); 
// "Esta unidad estará disponible desde 31/12/2025 00:00"

// Probar con fecha pasada
const pastUnit: CourseUnit = {
  id: 'test2',
  available_from: '2025-01-01T00:00:00Z',
  available_until: '2025-01-31T23:59:59Z',
  // ... otros campos
};

console.log(isUnitAvailable(pastUnit)); // false (si estamos en diciembre)
console.log(getUnitAvailabilityMessage(pastUnit));
// "Esta unidad ya no está disponible (finalizó el 31/01/2025 23:59)"
```

## Archivos Relacionados

### Archivos de Base de Datos
- ✅ `sql_scripts/add_availability_dates_to_units_sessions.sql` - Script ejecutado

### Archivos de Código
- ✅ `src/services/teacherCourses.ts` - Interfaces actualizadas
- ✅ `src/services/availabilityService.ts` - Funciones helper creadas

### Archivos de Documentación
- ✅ `AI_CONTEXT/04_FEATURES/CONTROL_DISPONIBILIDAD_FECHAS.md` - Guía completa

### Archivos Pendientes de Modificar (UI)
- ⏳ `src/pages/CourseModulesPage.tsx` - Agregar campos de fecha en editor de unidades
- ⏳ `src/pages/ModuleEditorPage.tsx` - Agregar campos de fecha en editor de sesiones
- ⏳ `src/pages/CourseViewPage.tsx` - Aplicar filtros de disponibilidad para estudiantes
- ⏳ `src/components/SessionEditorModal.tsx` - (Si existe) Agregar campos de fecha

## Notas Importantes

1. **Zonas Horarias**: Todas las fechas se almacenan en UTC (TIMESTAMPTZ)
2. **Validación**: Los constraints de base de datos aseguran que `available_until >= available_from`
3. **Herencia**: Si una sesión no tiene fechas, hereda la disponibilidad de su unidad padre
4. **Sin Fechas**: Si no hay fechas configuradas, el contenido está siempre disponible
5. **Performance**: Los índices optimizan las consultas de disponibilidad

## Próximo Paso Recomendado

Comenzar con la **integración en el editor de unidades** (`CourseModulesPage.tsx`) para que los profesores puedan configurar las fechas de disponibilidad.

¿Quieres que te ayude con la implementación del editor de unidades ahora?
