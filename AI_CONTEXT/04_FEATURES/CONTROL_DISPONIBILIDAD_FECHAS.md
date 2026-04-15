# Control de Disponibilidad por Fechas para Unidades y Sesiones

## Descripción General

Este sistema permite a los profesores controlar cuándo los estudiantes pueden acceder a unidades y sesiones específicas de un curso, basándose en fechas de inicio y fin.

## Componentes del Sistema

### 1. Base de Datos (SQL)

**Archivo**: `sql_scripts/add_availability_dates_to_units_sessions.sql`

#### Campos Agregados

**Para `course_units`:**
- `available_from (TIMESTAMPTZ)`: Fecha/hora desde la cual la unidad estará disponible
- `available_until (TIMESTAMPTZ)`: Fecha/hora hasta la cual la unidad estará disponible

**Para `sessions`:**
- `available_from (TIMESTAMPTZ)`: Fecha/hora desde la cual la sesión estará disponible
- `available_until (TIMESTAMPTZ)`: Fecha/hora hasta la cual la sesión estará disponible

#### Funciones SQL Creadas

**`is_unit_available_for_student(p_unit_id, p_student_id, p_check_time)`**
- Verifica si una unidad está disponible para un estudiante en un momento dado
- Retorna `BOOLEAN`

**`is_session_available_for_student(p_session_id, p_student_id, p_check_time)`**
- Verifica si una sesión está disponible para un estudiante
- También verifica la disponibilidad de la unidad padre
- Retorna `BOOLEAN`

### 2. TypeScript/Frontend

**Archivo**: `src/services/availabilityService.ts`

#### Funciones Principales

**`isUnitAvailable(unit, checkTime?)`**
```typescript
// Verifica si una unidad está disponible
const available = isUnitAvailable(unit);
```

**`isSessionAvailable(session, parentUnit?, checkTime?)`**
```typescript
// Verifica si una sesión está disponible
const available = isSessionAvailable(session, parentUnit);
```

**`getUnitAvailabilityMessage(unit, checkTime?)`**
```typescript
// Obtiene un mensaje descriptivo si no está disponible
const message = getUnitAvailabilityMessage(unit);
// Retorna: "Esta unidad estará disponible desde 02/12/2025 10:00"
```

**`getSessionAvailabilityMessage(session, parentUnit?, checkTime?)`**
```typescript
// Obtiene un mensaje descriptivo para sesión
const message = getSessionAvailabilityMessage(session, parentUnit);
```

**`filterAvailableUnits(units, checkTime?)`**
```typescript
// Filtra solo unidades disponibles
const availableUnits = filterAvailableUnits(allUnits);
```

**`filterAvailableSessions(sessions, unitMap?, checkTime?)`**
```typescript
// Filtra solo sesiones disponibles
const availableSessions = filterAvailableSessions(allSessions, unitMap);
```

## Cómo Usar

### Para Profesores: Configurar Fechas de Disponibilidad

#### 1. En el Editor de Unidades

```typescript
// Al crear o editar una unidad
await unitService.updateUnit(unitId, {
  available_from: '2025-12-10T08:00:00Z', // Disponible desde el 10 de dic a las 8am
  available_until: '2025-12-20T23:59:59Z'  // Hasta el 20 de dic a las 11:59pm
});
```

#### 2. En el Editor de Sesiones

```typescript
// Al crear o editar una sesión
await sessionService.updateSession(sessionId, {
  available_from: '2025-12-11T09:00:00Z',
  available_until: '2025-12-15T18:00:00Z'
});
```

#### 3. Casos de Uso Comunes

**Liberar contenido gradualmente:**
```typescript
// Unidad 1: Disponible desde hoy
unit1.available_from = new Date().toISOString();

// Unidad 2: Disponible en 1 semana
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
unit2.available_from = nextWeek.toISOString();

// Unidad 3: Disponible en 2 semanas
const twoWeeks = new Date();
twoWeeks.setDate(twoWeeks.getDate() + 14);
unit3.available_from = twoWeeks.toISOString();
```

**Contenido con límite de tiempo:**
```typescript
// Examen disponible solo durante 24 horas
examSession.available_from = '2025-12-15T09:00:00Z';
examSession.available_until = '2025-12-16T09:00:00Z';
```

### Para Estudiantes: Visualización en la Interfaz

#### Ejemplo de Integración en CourseViewPage

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
    <div className={!available ? 'opacity-50 cursor-not-allowed' : ''}>
      <h3>{unit.title}</h3>
      {!available && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
          <p className="text-yellow-800 text-sm">
            {message || 'No disponible en este momento'}
          </p>
        </div>
      )}
      {available && (
        <Link to={`/unit/${unit.id}`} className="btn btn-primary">
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
    <div className={!available ? 'opacity-50 cursor-not-allowed' : ''}>
      <h4>{session.title}</h4>
      {!available && message && (
        <div className="text-sm text-yellow-600 mt-1">
          ⚠️ {message}
        </div>
      )}
      {available && (
        <Link to={`/session/${session.id}`} className="btn btn-sm">
          Ver sesión
        </Link>
      )}
    </div>
  );
};
```

## Ejemplos de Escenarios

### Escenario 1: Curso con Cronograma Estricto

```typescript
// Semana 1
unit1.available_from = '2025-12-02T00:00:00Z';
unit1.available_until = '2025-12-08T23:59:59Z';

// Semana 2
unit2.available_from = '2025-12-09T00:00:00Z';
unit2.available_until = '2025-12-15T23:59:59Z';

// Semana 3
unit3.available_from = '2025-12-16T00:00:00Z';
unit3.available_until = '2025-12-22T23:59:59Z';
```

### Escenario 2: Contenido Siempre Disponible desde una Fecha

```typescript
// Unidad disponible desde el 10 de diciembre, sin fecha de fin
unit.available_from = '2025-12-10T00:00:00Z';
unit.available_until = null; // Sin límite de fin
```

### Escenario 3: Sesiones dentro de una Unidad

```typescript
// La unidad está disponible todo diciembre
unit.available_from = '2025-12-01T00:00:00Z';
unit.available_until = '2025-12-31T23:59:59Z';

// La sesión 1 está disponible la primera semana
session1.available_from = '2025-12-01T00:00:00Z';
session1.available_until = '2025-12-07T23:59:59Z';

// La sesión 2 está disponible la segunda semana
session2.available_from = '2025-12-08T00:00:00Z';
session2.available_until = '2025-12-14T23:59:59Z';
```

### Escenario 4: Examen con Horario Específico

```typescript
// Examen final disponible solo el 20 de diciembre de 9am a 12pm
examSession.available_from = '2025-12-20T09:00:00Z';
examSession.available_until = '2025-12-20T12:00:00Z';
```

## Reglas de Validación

1. **Constraint de Fechas**: `available_until` debe ser mayor o igual a `available_from`
2. **Herencia**: Si una sesión no tiene fechas configuradas, hereda la disponibilidad de su unidad padre
3. **Sin Fechas**: Si no hay fechas configuradas, el contenido está siempre disponible
4. **Unidad Padre**: Si la unidad padre no está disponible, ninguna de sus sesiones estará disponible

## Pasos para Implementar

### 1. Ejecutar el Script SQL

```bash
# En Supabase SQL Editor o mediante CLI
psql $DATABASE_URL -f sql_scripts/add_availability_dates_to_units_sessions.sql
```

### 2. Integrar en la UI del Profesor

Agregar campos de fecha en los formularios de edición de unidades/sesiones:

```tsx
<div className="form-group">
  <label>Disponible Desde</label>
  <input
    type="datetime-local"
    value={availableFrom}
    onChange={(e) => setAvailableFrom(e.target.value)}
  />
</div>

<div className="form-group">
  <label>Disponible Hasta</label>
  <input
    type="datetime-local"
    value={availableUntil}
    onChange={(e) => setAvailableUntil(e.target.value)}
  />
</div>
```

### 3. Aplicar Filtros en la Vista del Estudiante

```typescript
// En CourseViewPage o similar
import { filterAvailableUnits, filterAvailableSessions } from '../services/availabilityService';

// Filtrar unidades disponibles
const availableUnits = filterAvailableUnits(allUnits);

// Filtrar sesiones disponibles
const unitMap = new Map(units.map(u => [u.id, u]));
const availableSessions = filterAvailableSessions(allSessions, unitMap);
```

## Beneficios

- ✅ **Control Total**: Los profesores deciden exactamente cuándo está disponible cada contenido
- ✅ **Flexibilidad**: Fechas opcionales - sin fechas = siempre disponible
- ✅ **Experiencia de Usuario**: Mensajes claros sobre cuándo estará disponible el contenido
- ✅ **Herencia Lógica**: Las sesiones heredan la disponibilidad de sus unidades padre
- ✅ **Validación**: Constraints de base de datos aseguran fechas válidas

## Notas Técnicas

- **Zona Horaria**: Todas las fechas se almacenan en UTC (TIMESTAMPTZ)
- **Performance**: Índices creados en campos de disponibilidad para consultas rápidas
- **RLS Compatibility**: Las funciones usan `SECURITY DEFINER` para funcionar con RLS
