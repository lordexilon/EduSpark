# Mejoras para FileProcessingPage - Manejo de Archivos Fallados

## Problema Identificado

1. **Archivos fallados siguen visibles**: No hay forma de ocultar archivos que fallaron y ya no se necesitan
2. **Marcador de procesamiento no se detiene**: El frontend sigue mostrando "Procesando" aunque el job ya terminó

## Solución Propuesta

### 1. Agregar botón "Ocultar" para archivos fallados
- Permitir al usuario ocultar archivos específicos de la vista
- Guardar preferencias en localStorage
- Agregar opción para "Mostrar archivos ocultos"

### 2. Mejorar detección de estado de procesamiento
- Verificar timestamp del job para detectar jobs "colgados"
- Agregar timeout para jobs que llevan demasiado tiempo en "processing"
- Mostrar advertencia si un job lleva más de X minutos sin actualizar

### 3. Agregar filtros de vista
- Filtro "Todos"
- Filtro "Procesando"
- Filtro "Completados"
- Filtro "Fallidos"

## Implementación

Los cambios se realizarán en:
- `src/pages/FileProcessingPage.tsx`: Agregar estados y funciones
- UI: Agregar botones y filtros

## Archivos a Modificar

1. `FileProcessingPage.tsx` - Agregar:
   - Estado `hiddenFileIds` para archivos ocultos
   - Estado `fileFilter` para filtro activo
   - Función `handleHideFile()` para ocultar archivos
   - Función `handleShowHiddenFiles()` para mostrar archivos ocultos
   - useEffect para cargar archivos ocultos desde localStorage
   - Lógica mejorada para detectar jobs "colgados"
