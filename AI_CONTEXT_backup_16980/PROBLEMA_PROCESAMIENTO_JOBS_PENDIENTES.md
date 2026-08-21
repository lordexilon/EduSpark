# 🐛 Problema: Jobs Pendientes No Se Procesan

**Fecha:** Noviembre 2025  
**Estado:** 🔴 PROBLEMA CRÍTICO IDENTIFICADO

---

## 📋 Problema Reportado

Los jobs quedan en estado `pending` y no se procesan, incluso después de mucho tiempo. El usuario reporta: "porque no procesa los chunks ha pasado demasiado tiempo".

---

## 🔍 Análisis del Problema

### Flujo Actual de Procesamiento

1. **Usuario crea job** → `createFileProcessingJob` crea el job en Supabase con estado `pending`
2. **Intento de invocación** → `createFileProcessingJob` intenta invocar el rag-worker asíncronamente
3. **Problema:** Si la invocación falla, el job queda en `pending` y nunca se procesa

### Código Actual en `createFileProcessingJob/index.ts`:

```typescript
// Invocar el rag-worker para procesar el job inmediatamente
// Esto es asíncrono y no bloquea la respuesta
const ragWorkerUrl = process.env.RAG_WORKER_URL || 'https://rag-worker-mcc5aevj6a-uc.a.run.app';
fetch(ragWorkerUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(response => {
    if (response.ok) {
      console.log(`[createFileProcessingJob] ✅ RAG worker invocado exitosamente`);
    } else {
      console.warn(`[createFileProcessingJob] ⚠️ RAG worker respondió con error`);
    }
  })
  .catch(error => {
    // No fallar si el trigger falla - el job está creado y se procesará eventualmente
    console.warn(`[createFileProcessingJob] ⚠️ Error invocando RAG worker (el job está en cola y se procesará eventualmente):`, error.message);
  });
```

### Problemas Identificados:

1. **No hay scheduler:** No existe un Cloud Scheduler o cron job que procese jobs pendientes periódicamente
2. **Invocación puede fallar:** Si el fetch falla (timeout, CORS, error de red), el job nunca se procesa
3. **No hay retry:** Si la invocación falla, no hay mecanismo de reintento
4. **No hay verificación:** No hay forma de verificar si hay jobs pendientes que no se están procesando

---

## ✅ Soluciones Propuestas

### Solución 1: Cloud Scheduler (Recomendada)

Crear un Cloud Scheduler que invoque el rag-worker cada 1-2 minutos para procesar jobs pendientes.

**Ventajas:**
- Procesa jobs pendientes automáticamente
- No depende de la invocación inicial
- Maneja casos donde la invocación inicial falla

**Desventajas:**
- Requiere configuración adicional en Google Cloud
- Costo adicional (mínimo)

### Solución 2: Mejorar Invocación con Retry

Mejorar la invocación en `createFileProcessingJob` con:
- Retry automático (3 intentos)
- Logging mejorado
- Verificación de que el job se procesó

**Ventajas:**
- Implementación simple
- No requiere configuración adicional

**Desventajas:**
- Aún puede fallar si hay problemas de red persistentes
- No procesa jobs antiguos que quedaron pendientes

### Solución 3: Híbrida (Recomendada)

Combinar ambas soluciones:
1. Mejorar la invocación inicial con retry
2. Crear Cloud Scheduler como respaldo

---

## 🚀 Implementación: Solución Híbrida

### Paso 1: Mejorar Invocación con Retry

Modificar `createFileProcessingJob/index.ts` para incluir retry:

```typescript
// Función para invocar rag-worker con retry
async function invokeRagWorkerWithRetry(jobId: string, maxRetries = 3): Promise<boolean> {
  const ragWorkerUrl = process.env.RAG_WORKER_URL || 'https://rag-worker-mcc5aevj6a-uc.a.run.app';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[createFileProcessingJob] Intento ${attempt}/${maxRetries} de invocar RAG worker para job ${jobId}`);
      
      const response = await fetch(ragWorkerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });
      
      if (response.ok) {
        console.log(`[createFileProcessingJob] ✅ RAG worker invocado exitosamente en intento ${attempt}`);
        return true;
      } else {
        const errorText = await response.text();
        console.warn(`[createFileProcessingJob] ⚠️ RAG worker respondió con error ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      console.warn(`[createFileProcessingJob] ⚠️ Error en intento ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        // Esperar antes del siguiente intento (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[createFileProcessingJob] ❌ No se pudo invocar RAG worker después de ${maxRetries} intentos. El job quedará en cola y será procesado por el scheduler.`);
  return false;
}
```

### Paso 2: Crear Cloud Scheduler

Crear un script o documentación para configurar Cloud Scheduler:

```bash
# Crear Cloud Scheduler que invoca rag-worker cada 2 minutos
gcloud scheduler jobs create http rag-worker-scheduler \
  --location=us-central1 \
  --schedule="*/2 * * * *" \
  --uri="https://rag-worker-mcc5aevj6a-uc.a.run.app" \
  --http-method=POST \
  --time-zone="America/Montevideo" \
  --description="Procesa jobs pendientes de RAG cada 2 minutos"
```

### Paso 3: Función de Verificación Manual

Crear una función que se pueda invocar manualmente para procesar jobs pendientes:

```typescript
// En una nueva función o endpoint
export const processPendingJobs = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    maxInstances: 1,
    invoker: 'public',
  },
  async (req, res) => {
    const ragWorkerUrl = process.env.RAG_WORKER_URL || 'https://rag-worker-mcc5aevj6a-uc.a.run.app';
    
    try {
      const response = await fetch(ragWorkerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      res.status(200).json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

---

## 🔧 Verificación y Diagnóstico

### Verificar Jobs Pendientes en Supabase

```sql
-- Ver jobs pendientes
SELECT 
  id,
  file_name,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
FROM file_processing_jobs
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Verificar Logs del RAG Worker

1. Ir a Google Cloud Console
2. Cloud Run > rag-worker
3. Ver logs recientes
4. Buscar errores o mensajes de "No hay jobs pendientes"

### Verificar Invocación desde createFileProcessingJob

Buscar en los logs de `createFileProcessingJob`:
- `✅ RAG worker invocado exitosamente`
- `⚠️ Error invocando RAG worker`
- `❌ No se pudo invocar RAG worker`

---

## 📊 Métricas a Monitorear

1. **Tiempo promedio en cola:** ¿Cuánto tiempo pasan los jobs en `pending`?
2. **Tasa de fallos de invocación:** ¿Cuántas veces falla la invocación inicial?
3. **Jobs atascados:** ¿Hay jobs que llevan más de X minutos en `pending`?

---

## 🚨 Acción Inmediata

Para procesar jobs pendientes manualmente:

1. **Opción 1: Invocar rag-worker directamente**
   ```bash
   curl -X POST https://rag-worker-mcc5aevj6a-uc.a.run.app
   ```

2. **Opción 2: Verificar y procesar desde Supabase**
   - Ver jobs pendientes
   - Invocar rag-worker manualmente

3. **Opción 3: Crear función de emergencia**
   - Función que procesa todos los jobs pendientes en batch

---

## ✅ Checklist de Implementación

- [ ] Mejorar invocación con retry en `createFileProcessingJob`
- [ ] Crear Cloud Scheduler para procesar jobs pendientes cada 2 minutos
- [ ] Añadir logging mejorado para diagnosticar problemas
- [ ] Crear función de verificación manual
- [ ] Documentar proceso de diagnóstico
- [ ] Probar con job real
- [ ] Monitorear métricas

---

**Última actualización:** Noviembre 2025

