# Solución Rápida para Archivos Fallados en File Processing

## Problema
1. Archivos que fallaron siguen mostrándose con error
2. El frontend sigue mostrando el marcador de "Procesando" aunque el archivo ya no se está procesando

## Solución Inmediata

### Opción 1: Limpiar Jobs Fallados desde Firestore Console

1. Abre Firebase Console: https://console.firebase.google.com/
2. Ve a Firestore Database
3. Navega a la colección `fileProcessingJobs`
4. Busca los jobs con:
   - `status === 'failed'` 
   - `status === 'processing'` pero con `updatedAt` muy antiguo (más de 1 hora)
5. Elimina manualmente esos documentos

### Opción 2: Agregar Botón "Ocultar" en el Frontend

Agrega este código en `FileProcessingPage.tsx`:

#### 1. Agregar estados (después de la línea 72):
```typescript
const [hiddenFileIds, setHiddenFileIds] = useState<Set<string>>(new Set());
```

#### 2. Cargar archivos ocultos desde localStorage (en el useEffect de la línea 152):
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

#### 3. Agregar función para ocultar archivos (después de handleCancel, línea 491):
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

#### 4. Filtrar archivos ocultos en el render (línea 870):
```typescript
{files
  .filter(file => !hiddenFileIds.has(file.id)) // Agregar este filtro
  .map((file) => {
    // ... resto del código
```

#### 5. Agregar botón "Ocultar" para archivos fallados (después del botón Cancelar, línea 1061):
```typescript
{/* Botón para ocultar archivos fallados */}
{hasFailed && (
  <button
    onClick={() => handleHideFile(file.id)}
    className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center space-x-1"
    title="Ocultar este archivo de la lista"
  >
    <XCircle className="w-4 h-4" />
    <span>Ocultar</span>
  </button>
)}
```

## Solución para Jobs que no se Detienen

### Detectar Jobs "Colgados"

Agrega esta lógica mejorada para `isProcessing` (línea 881):

```typescript
const isProcessing = fileJobs.some(j => {
  if (j.status !== 'processing') return false;
  
  // Verificar si el job lleva más de 2 horas sin actualizar
  const updatedAt = j.updatedAt ? new Date(j.updatedAt) : new Date(j.createdAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  
  // Si lleva más de 2 horas, considerarlo como no procesando
  if (hoursSinceUpdate > 2) {
    console.warn(`Job ${j.id} lleva ${hoursSinceUpdate.toFixed(1)} horas sin actualizar`);
    return false;
  }
  
  return true;
});
```

## Resultado

Después de estos cambios:
- ✅ Podrás ocultar archivos fallados con un botón
- ✅ Los jobs "colgados" no mostrarán el marcador de procesamiento
- ✅ Los archivos ocultos se guardan en localStorage y persisten entre sesiones
