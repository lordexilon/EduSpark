# Mejoras Implementadas en File Processing Page

## Fecha: 2025-11-27

## Problemas Resueltos

### 1. ✅ Archivos Fallados que No Desaparecen
**Problema**: Los archivos que fallaron en el procesamiento seguían mostrándose con error sin opción de ocultarlos.

**Solución Implementada**:
- Agregado estado `hiddenFileIds` para mantener un registro de archivos ocultos
- Agregada función `handleHideFile()` que permite ocultar archivos específicos
- Los archivos ocultos se guardan en `localStorage` y persisten entre sesiones
- Agregado botón "Ocultar" que aparece solo en archivos con estado `failed`
- Agregado botón "Mostrar X ocultos" en el encabezado para restaurar archivos ocultos

### 2. ✅ Marcador de Procesamiento que No se Detiene
**Problema**: El frontend seguía mostrando "Procesando" aunque el job ya no estaba activo.

**Solución Implementada**:
- Mejorada la lógica de detección de `isProcessing`
- Agregada verificación de timestamp para detectar jobs "colgados"
- Jobs que llevan más de 2 horas sin actualizar se consideran como no procesando
- Se muestra advertencia en consola cuando se detecta un job colgado

### 3. ✅ Limpieza de "Estado de Procesamiento" (NUEVO)
**Problema**: La columna derecha "Estado de Procesamiento" mostraba jobs antiguos, fallados o colgados sin opción de limpiarlos.

**Solución Implementada**:
- Actualizado componente `ProcessingProgress` para aceptar `hiddenFileIds`
- Agregado botón "X" en la esquina de cada tarjeta de trabajo para ocultarlo
- Los jobs colgados (más de 2 horas) ahora se muestran en color naranja con estado "Tiempo Excedido"
- Se detiene el temporizador para jobs colgados para evitar tiempos irreales

## Cambios en el Código

### Archivo: `src/pages/FileProcessingPage.tsx`

#### 1. Nuevo Estado (línea 73)
```typescript
const [hiddenFileIds, setHiddenFileIds] = useState<Set<string>>(new Set());
```

#### 2. Carga de Archivos Ocultos desde localStorage (línea 164-176)
```typescript
// Cargar archivos ocultos
const hiddenFilesKey = `hidden_files_${user.id}`;
try {
  const storedHidden = localStorage.getItem(hiddenFilesKey);
  if (storedHidden) {
    const hiddenIds = JSON.parse(storedHidden) as string[];
    setHiddenFileIds(new Set(hiddenIds));
  }
} catch (err) {
  console.warn('Error cargando archivos ocultos:', err);
}
```

#### 3. Función para Ocultar Archivos (línea 488-502)
```typescript
// Ocultar archivo de la vista
const handleHideFile = (fileId: string) => {
  setHiddenFileIds(prev => {
    const newSet = new Set(prev);
    newSet.add(fileId);
    if (user) {
      try {
        localStorage.setItem(`hidden_files_${user.id}`, JSON.stringify(Array.from(newSet)));
      } catch (err) {
        console.warn('Error guardando archivos ocultos:', err);
      }
    }
    return newSet;
  });
};
```

#### 4. Integración en ProcessingProgress (línea 1200)
```typescript
<ProcessingProgress 
  jobs={jobs} 
  onHideFile={handleHideFile}
  hiddenFileIds={hiddenFileIds}
/>
```

### Archivo: `src/components/ProcessingProgress.tsx`

#### 1. Lógica de Jobs Colgados
```typescript
const isJobStuck = (job: FileProcessingJob): boolean => {
  if (job.status !== 'processing') return false;
  const updatedAt = job.updatedAt ? new Date(job.updatedAt) : new Date(job.createdAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate > 2;
};
```

#### 2. Botón de Ocultar en Tarjeta
```typescript
{onHideFile && (
  <button
    onClick={() => onHideFile(fileId)}
    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
    title="Ocultar de la lista"
  >
    <XCircle size={18} />
  </button>
)}
```

## Cómo Usar las Nuevas Funcionalidades

### Ocultar un Archivo Fallado o Colgado
1. Pasa el mouse sobre la tarjeta del trabajo en "Estado de Procesamiento"
2. Aparecerá una "X" en la esquina superior derecha
3. Haz clic para ocultar el trabajo
4. El trabajo desaparecerá de ambas listas (Archivos Disponibles y Estado de Procesamiento)

### Identificar Jobs Colgados
- Los jobs que llevan mucho tiempo sin actualizarse aparecerán con borde naranja
- El estado dirá "Tiempo Excedido" en lugar de "Procesando"
- El temporizador se detendrá y mostrará un mensaje informativo

### Restaurar Archivos Ocultos
1. Si hay archivos ocultos, verás un botón azul en el encabezado de "Archivos Disponibles"
2. Haz clic en "Mostrar X ocultos" para restaurar todos
