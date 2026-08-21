# 🔍 Diagnóstico: Tarjeta de Procesamiento Mostrando Etapa Incorrecta

**Fecha:** Noviembre 2025  
**Estado:** 🐛 PROBLEMA IDENTIFICADO

---

## 📋 Problema Reportado

La tarjeta de procesamiento muestra "📄 Extrayendo texto del PDF..." cuando el job está en estado `pending` (en cola), lo cual es incorrecto. Debería mostrar "⏳ Esperando en cola de procesamiento...".

### Síntomas Observados:
- Job en estado `pending` (según logs)
- Tarjeta muestra: "📄 Extrayendo texto del PDF..."
- Muestra "0 de 5 chunks completados" con 0%
- Tiempo transcurrido: 08:23
- Tiempo estimado total: 10m

---

## 🔍 Análisis del Código

### 1. Función `getProcessingStage()`

**Ubicación:** `src/pages/FileProcessingPage.tsx` línea ~1277

```typescript
const getProcessingStage = () => {
  if (!isProcessingJob) return null;
  
  // Si el job está en "pending", mostrar mensaje de espera
  if (mainJob?.status === 'pending') {
    return '⏳ Esperando en cola de procesamiento...';
  }
  
  // Si el job está en "processing", mostrar etapas según progreso
  if (mainJob?.status === 'processing') {
    if (chunksProcessed === 0) {
      // Calcular tiempo transcurrido para estimar etapa
      const startTime = mainJob.startedAt || mainJob.createdAt;
      if (startTime) {
        const elapsed = (new Date().getTime() - new Date(startTime).getTime()) / 1000 / 60; // minutos
        if (elapsed < 2) return '📥 Descargando archivo...';
        if (elapsed < 10) return '📄 Extrayendo texto del PDF...';
        return '⏳ Preparando chunks...';
      }
      return '🔄 Iniciando procesamiento...';
    }
    // ... más lógica para chunks
  }
  
  return null;
};
```

**Problema Identificado:**
La lógica parece correcta, pero hay un posible problema:
- Si `mainJob?.status` no es exactamente `'pending'` (por ejemplo, si es `'Pending'` con mayúscula), la condición falla
- Si hay algún problema con cómo se está pasando el estado, podría estar entrando en la lógica de `'processing'`

### 2. Variable `isProcessingJob`

**Ubicación:** `src/pages/FileProcessingPage.tsx` línea ~1241

```typescript
const isProcessingJob = mainJob?.status === 'processing' || mainJob?.status === 'pending';
```

**Análisis:**
- Esta variable es `true` tanto para `'pending'` como para `'processing'`
- Esto es correcto para mostrar la tarjeta, pero la función `getProcessingStage()` debería distinguir entre ambos

### 3. Renderizado de `processingStage`

**Ubicación:** `src/pages/FileProcessingPage.tsx` línea ~1356

```typescript
{processingStage && (
  <div className="flex items-center gap-2 text-sm text-blue-700 bg-white rounded-lg px-3 py-2 border border-blue-300 shadow-sm">
    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
    <div className="flex-1">
      <span className="font-semibold">{processingStage}</span>
      {/* ... */}
    </div>
  </div>
)}
```

**Análisis:**
- El renderizado parece correcto
- Si `processingStage` tiene el valor correcto, debería mostrarse

---

## 🐛 Posibles Causas

### Causa 1: Estado del Job No Es Exactamente 'pending'
- El estado podría estar en mayúsculas (`'Pending'`) o con espacios
- La comparación estricta `===` fallaría

### Causa 2: Lógica de Tiempo Transcurrido
- Si el job está en `pending` pero tiene `chunksTotal` definido (5 chunks), podría haber confusión
- El tiempo transcurrido (08:23) sugiere que el job lleva 8 minutos en cola
- Si la lógica de tiempo se ejecuta antes de verificar el estado, podría mostrar "Extrayendo texto"

### Causa 3: Orden de Evaluación
- Si hay alguna condición que evalúa el tiempo antes de verificar el estado, podría mostrar el mensaje incorrecto

### Causa 4: Job Realmente en 'processing' pero con Datos Incompletos
- El job podría haber cambiado a `'processing'` pero no tener `startedAt` actualizado
- Esto haría que use `createdAt` y calcule el tiempo desde ahí

---

## ✅ Solución Propuesta

### 1. Verificar Estado con Normalización

```typescript
const getProcessingStage = () => {
  if (!isProcessingJob) return null;
  
  // Normalizar estado a minúsculas para comparación
  const jobStatus = (mainJob?.status || '').toLowerCase();
  
  // Si el job está en "pending", mostrar mensaje de espera
  if (jobStatus === 'pending') {
    return '⏳ Esperando en cola de procesamiento...';
  }
  
  // Si el job está en "processing", mostrar etapas según progreso
  if (jobStatus === 'processing') {
    // Solo calcular etapas si realmente está procesando
    if (!mainJob?.startedAt && chunksProcessed === 0) {
      // Si no tiene startedAt, aún no ha comenzado realmente
      return '🔄 Iniciando procesamiento...';
    }
    
    if (chunksProcessed === 0) {
      const startTime = mainJob.startedAt || mainJob.createdAt;
      if (startTime) {
        const elapsed = (new Date().getTime() - new Date(startTime).getTime()) / 1000 / 60;
        if (elapsed < 2) return '📥 Descargando archivo...';
        if (elapsed < 10) return '📄 Extrayendo texto del PDF...';
        return '⏳ Preparando chunks...';
      }
      return '🔄 Iniciando procesamiento...';
    }
    // ... resto de la lógica
  }
  
  return null;
};
```

### 2. Añadir Logs de Depuración

```typescript
const getProcessingStage = () => {
  if (!isProcessingJob) return null;
  
  console.log('[ProcessingStage] Estado del job:', {
    status: mainJob?.status,
    statusLower: (mainJob?.status || '').toLowerCase(),
    startedAt: mainJob?.startedAt,
    createdAt: mainJob?.createdAt,
    chunksProcessed,
    chunksTotal
  });
  
  const jobStatus = (mainJob?.status || '').toLowerCase();
  
  if (jobStatus === 'pending') {
    console.log('[ProcessingStage] Retornando: Esperando en cola');
    return '⏳ Esperando en cola de procesamiento...';
  }
  
  // ... resto de la lógica
};
```

### 3. Verificar que `startedAt` Esté Presente para Jobs en 'processing'

Si un job está en `'processing'` pero no tiene `startedAt`, debería mostrar "Iniciando procesamiento..." en lugar de calcular etapas basadas en tiempo.

---

## 🔧 Pasos de Verificación

### 1. Verificar Estado Real del Job en la Base de Datos

```sql
SELECT id, status, created_at, started_at, updated_at,
       metadata->>'chunksProcessed' as chunks_processed,
       metadata->>'chunksTotal' as chunks_total
FROM file_processing_jobs
WHERE id = '921d6540-2962-4969-a8b1-c98e6cfe0323';
```

### 2. Verificar Logs del Frontend

Buscar en la consola del navegador:
- `[ProcessingStage] Estado del job:` - Debería mostrar el estado real
- `[FileProcessing] Timer para Williams Gineco.pdf:` - Debería mostrar `status: 'pending'`

### 3. Verificar Conversión desde Supabase

En `src/services/firestoreService.ts`, verificar que `convertFromSupabase` esté mapeando correctamente el estado:

```typescript
status: row.status as JobStatus,
```

---

## 📊 Información Adicional

### Datos del Job Según Logs:
- **Job ID:** `921d6540-2962-4969-a8b1-c98e6cfe0323`
- **Estado reportado:** `pending`
- **sourceFileId:** `1CWlVoc7XhJ5emmpauUcj6diLnfERPJfW`
- **Tiempo transcurrido:** 08:23 (desde `createdAt`)
- **chunksTotal:** 5 (según UI)
- **chunksProcessed:** 0

### Observaciones:
- El job tiene `chunksTotal: 5` definido, lo que sugiere que el análisis inicial se completó
- El tiempo transcurrido (08:23) es mayor a 2 minutos, por lo que si estuviera en `processing`, mostraría "Extrayendo texto"
- Esto confirma que el problema es que la lógica está entrando en la rama de `processing` cuando debería estar en `pending`

---

## 🚀 Implementación de la Solución

1. **Normalizar comparación de estado** a minúsculas
2. **Añadir verificación de `startedAt`** antes de calcular etapas basadas en tiempo
3. **Añadir logs de depuración** para rastrear el problema
4. **Verificar que el estado se esté pasando correctamente** desde Supabase

---

**Última actualización:** Noviembre 2025

