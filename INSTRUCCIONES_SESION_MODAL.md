# Cambios Pendientes para SessionEditorModal.tsx

## Estado Actual
✅ Ya se agregaron las variables de estado `availableFrom` y `availableUntil`
✅ Ya se agregaron al objeto `sessionData` que se envía al guardar

## Cambios Pendientes

### 1. Cargar valores desde la sesión existente

**Ubicación:** Dentro del `useEffect` que carga los datos de la sesión (líneas 61-83 aproximadamente)

**Agregar después de la línea que setea `googleCalendarEventId`:**

```typescript
setAvailableFrom(session.available_from ? new Date(session.available_from).toISOString().slice(0, 16) : '');
setAvailableUntil(session.available_until ? new Date(session.available_until).toISOString().slice(0, 16) : '');
```

### 2. Agregar campos en el formulario UI

**Ubicación:** Después de la sección de "Fechas" (líneas 497-522 aproximadamente)

**Agregar justo después del cierre del `div` de las fechas de inicio/fin:**

```tsx
{/* Control de Disponibilidad */}
<div className="border-t pt-4 mt-4">
  <h3 className="text-sm font-semibold text-gray-800 mb-3">
    📅 Control de Disponibilidad para Estudiantes
  </h3>
  <p className="text-xs text-gray-600 mb-4">
    Configura cuándo los estudiantes podrán acceder a esta sesión. Si no configuras fechas, la sesión estará siempre disponible.
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

## Cómo Aplicar los Cambios

1. Abre el archivo: `src/components/SessionEditorModal.tsx`
2. Busca el `useEffect` que contiene `setGoogleCalendarEventId`
3. Agrega las dos líneas de `setAvailableFrom` y `setAvailableUntil` justo después
4. Busca la sección de "Fechas" (que tiene `Fecha/Hora de Inicio` y `Fecha/Hora de Fin`)
5. Después del cierre de ese grid (`</div>`), agrega toda la sección de "Control de Disponibilidad"

## Resultado Esperado

Cuando abras el modal de editar sesión:
- Verás una nueva sección "📅 Control de Disponibilidad para Estudiantes"
- Podrás configurar desde cuándo y hasta cuándo está disponible la sesión
- Al guardar, las fechas se almacenarán en la base de datos
- Si no configuras fechas, la sesión estará siempre disponible
