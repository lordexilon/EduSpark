# Agregar Fechas de Inicio/Fin a Unidades - Instrucciones

## 1. Ejecutar Script SQL

Primero, ejecuta el script SQL que agrega los campos a la base de datos:

**Archivo:** `sql_scripts/add_starts_ends_to_units.sql`

Ve a Supabase SQL Editor y ejecuta este script. Agregará:
- `starts_at` - Cuándo empieza la unidad  
- `ends_at` - Cuándo termina la unidad

## 2. Actualizar CourseModulesPage.tsx

Ya actualicé la interfaz `CourseUnit` en `teacherCourses.ts` ✅

Ahora necesitas agregar los campos visuales en `src/pages/CourseModulesPage.tsx`:

### 2.1: Actualizar UnitCard - Agregar Estados

**Ubicación:** Busca la línea donde se definen `availableFrom` y `availableUntil`  
**Agregar después:**

```typescript
const [startsAt, setStartsAt] = useState<string>(toDatetimeLocal(unit.starts_at));
const [endsAt, setEndsAt] = useState<string>(toDatetimeLocal(unit.ends_at));
```

### 2.2: Actualizar handleSave

**Buscar:** La función `handleSave` 
**Reemplazar:**

```typescript
const handleSave = () => {
  onSave(
    unit.id,
    title,
    number,
    orderIndex,
    toISOString(startsAt),
    toISOString(endsAt),
    toISOString(availableFrom),
    toISOString(availableUntil)
  );
};
```

### 2.3: Agregar Campos en el UI

**Buscar:** La sección que dice "Control de Disponibilidad"  
**Agregar ANTES de esa sección:**

```tsx
{/* Período de la Unidad */}
<div className="border-t pt-3 mt-2">
  <h4 className="text-sm font-medium text-gray-700 mb-2">📆 Período de la Unidad</h4>
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        Fecha de Inicio:
      </label>
      <input
        type="datetime-local"
        className="px-3 py-2 border rounded text-sm w-full"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
      />
      <p className="text-xs text-gray-500 mt-1">
        Cuándo empieza esta unidad
      </p>
    </div>
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        Fecha de Fin:
      </label>
      <input
        type="datetime-local"
        className="px-3 py-2 border rounded text-sm w-full"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
      />
      <p className="text-xs text-gray-500 mt-1">
        Cuándo termina esta unidad
      </p>
    </div>
  </div>
</div>
```

### 2.4: Actualizar saveUnit function

**Buscar:** La función `saveUnit` (línea ~69)  
**Actualizar la firma:**

```typescript
const saveUnit = async (
  id: string,
  title: string,
  number: number,
  orderIndex: number,
  startsAt?: string,
  endsAt?: string,
  availableFrom?: string,
  availableUntil?: string
) => {
  try {
    const updated = await unitService.updateUnit(id, {
      title,
      number,
      order_index: orderIndex,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      available_from: availableFrom || null,
      available_until: availableUntil || null
    });
    setUnits(prev => prev.map(u => (u.id === id ? updated : u)));
  } catch (e: any) {
    alert(e.message || 'Error actualizando  unidad');
  }
};
```

### 2.5: Actualizar UnitCardProps interface

**Buscar:** `interface UnitCardProps`  
**Actualizar:**

```typescript
interface UnitCardProps {
  unit: CourseUnit;
  onSave: (
    id: string,
    title: string,
    number: number,
    orderIndex: number,
    startsAt?: string,
    endsAt?: string,
    availableFrom?: string,
    availableUntil?: string
  ) => void;
  onDelete: (id: string) => void;
  courseId: number;
}
```

## 3. Diferencia entre los campos

**Período (starts_at / ends_at):**
- Cuándo empieza y termina la unidad en términos del cronograma del curso
- Ejemplo: "Unidad 1: Del 1 al 15 de diciembre"

**Disponibilidad (available_from / available_until):**
- Cuándo los estudiantes pueden ACCEDER al contenido
- Ejemplo: "Disponible para acceso del 1 de diciembre al 31 de enero"

**Caso de uso típico:**
- Período: 1-15 dic (la unidad se "cursa" en estas fechas)
- Disponibilidad: 1 dic - 31 enero (pero pueden acceder al material hasta fin de enero para repasar)

## Resumen Visual

```
┌─────────────────────────────────┐
│ 📆 Período de la Unidad         │
│ ├─ Fecha de Inicio              │ ← starts_at
│ └─ Fecha de Fin                 │ ← ends_at
├─────────────────────────────────┤
│ 📅 Control de Disponibilidad    │
│ ├─ Disponible desde             │ ← available_from
│ └─ Disponible hasta             │ ← available_until
└─────────────────────────────────┘
```

## ¿Listo para Probar?

Una vez hagas estos cambios:
1. Ejecuta el script SQL en Supabase
2. Reinicia el servidor de desarrollo si es necesario
3. Ve a `http://localhost:5173/teacher/courses/{ID}/modules`
4. Deberías ver 4 campos de fecha en cada unidad
