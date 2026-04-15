# Agregar Campos de Fecha al Modal de Editar Unidad

## Ubicación
Archivo: `src/components/UnitEditorModal.tsx`

Este es el modal que ves cuando haces clic en "Editar" en la página del curso.

## Cambios Necesarios

### 1. Agregar Estados (Después de los otros useState, línea ~35)

```typescript
// Campos de período y disponibilidad
const [startsAt, setStartsAt] = useState('');
const [endsAt, setEndsAt] = useState('');
const [availableFrom, setAvailableFrom] = useState('');
const [availableUntil, setAvailableUntil] = useState('');
```

### 2. Cargar Valores desde unit (En el useEffect, línea ~39)

Busca el `useEffect` que carga los datos de la unidad. Dentro del `if (unit)`, agrega al final:

```typescript
// Campos de fecha
setStartsAt(unit.starts_at ? new Date(unit.starts_at).toISOString().slice(0, 16) : '');
setEndsAt(unit.ends_at ? new Date(unit.ends_at).toISOString().slice(0, 16) : '');
setAvailableFrom(unit.available_from ? new Date(unit.available_from).toISOString().slice(0, 16) : '');
setAvailableUntil(unit.available_until ? new Date(unit.available_until).toISOString().slice(0, 16) : '');
```

### 3. Incluir en handleSubmit (Línea ~161, función handleSubmit)

Busca donde se crea el objeto `unitData`. Agrega los nuevos campos:

```typescript
const unitData = {
  course_id: courseId,
  number: number || 1,
  title: title.trim(),
  description: description?.trim() || undefined,
  content_html: contentHtml?.trim() || undefined,
  content_markdown: contentMarkdown?.trim() || undefined,
  learning_objectives: learningObjectives.length > 0 ? learningObjectives : undefined,
  duration_hours: durationHours,
  order_index: orderIndex,
  thumbnail_url: thumbnailUrl || undefined,
  // Campos de período
  starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
  ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
  // Campos de disponibilidad
  available_from: availableFrom ? new Date(availableFrom).toISOString() : undefined,
  available_until: availableUntil ? new Date(availableUntil).toISOString() : undefined
};
```

### 4. Agregar Campos en el Formulario (Después del campo "Duración" línea ~330)

Busca la sección donde está el campo "Duración (horas)", y agrega después:

```tsx
{/* Período de la Unidad */}
<div className="border-t pt-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-3">
    📆 Período de la Unidad
  </h3>
  <p className="text-xs text-gray-600 mb-3">
    Define cuándo empieza y termina esta unidad en el cronograma del curso
  </p>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fecha de Inicio
      </label>
      <input
        type="datetime-local"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-500 mt-1">
        Cuándo empieza esta unidad
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fecha de Fin
      </label>
      <input
        type="datetime-local"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-500 mt-1">
        Cuándo termina esta unidad
      </p>
    </div>
  </div>
</div>

{/* Control de Disponibilidad */}
<div className="border-t pt-4 mt-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-3">
    📅 Control de Disponibilidad para Estudiantes
  </h3>
  <p className="text-xs text-gray-600 mb-3">
    Configura cuándo los estudiantes podrán acceder a esta unidad
  </p>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Disponible Desde
      </label>
      <input
        type="datetime-local"
        value={availableFrom}
        onChange={(e) => setAvailableFrom(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-500 mt-1">
        Los estudiantes podrán acceder desde esta fecha/hora
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Disponible Hasta
      </label>
      <input
        type="datetime-local"
        value={availableUntil}
        onChange={(e) => setAvailableUntil(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-500 mt-1">
        Opcional. Después de esta fecha, no podrán acceder
      </p>
    </div>
  </div>
</div>
```

## Resultado Esperado

Cuando abras el modal de "Editar Unidad", verás dos nuevas secciones:

1. **📆 Período de la Unidad** (starts_at / ends_at)
   - Fecha de Inicio
   - Fecha de Fin

2. **📅 Control de Disponibilidad** (available_from / available_until)
   - Disponible Desde
   - Disponible Hasta

## Nota Importante

Asegúrate de que ya ejecutaste los scripts SQL:
- ✅ `add_availability_dates_to_units_sessions.sql` (disponibilidad)
- ✅ `add_starts_ends_to_units.sql` (período)

Si no los has ejecutado, ve a Supabase SQL Editor y ejecútalos primero.
