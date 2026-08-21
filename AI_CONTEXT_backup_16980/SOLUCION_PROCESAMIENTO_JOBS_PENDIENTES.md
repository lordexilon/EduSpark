# ✅ Solución Implementada: Procesamiento de Jobs Pendientes

**Fecha:** Noviembre 2025  
**Estado:** ✅ IMPLEMENTADO

---

## 📋 Resumen

Se ha implementado una solución híbrida para asegurar que los jobs pendientes se procesen correctamente:

1. **Mejora en la invocación inicial** con retry automático (3 intentos)
2. **Nueva función para procesamiento manual** de jobs pendientes
3. **Documentación para Cloud Scheduler** como respaldo automático

---

## ✅ Cambios Implementados

### 1. Mejora en `createFileProcessingJob` con Retry

**Archivo:** `functions/createFileProcessingJob/index.ts`

**Cambios:**
- Nueva función `invokeRagWorkerWithRetry()` con:
  - 3 intentos automáticos
  - Exponential backoff (1s, 2s, 4s)
  - Timeout de 15 segundos por intento
  - Logging detallado de cada intento
  - Manejo de errores 4xx (no reintenta)

**Código:**
```typescript
async function invokeRagWorkerWithRetry(jobId: string, maxRetries = 3): Promise<boolean> {
  // ... implementación con retry y exponential backoff
}
```

### 2. Nueva Función `processPendingJobs`

**Archivo:** `functions/processPendingJobs/index.ts`

**Propósito:**
- Procesar jobs pendientes manualmente
- Útil para diagnóstico y emergencias
- Puede ser invocada desde la consola de Google Cloud o HTTP

**Características:**
- Pública (para facilitar diagnóstico)
- Timeout de 30 segundos
- Solo 1 instancia simultánea
- Logging detallado

### 3. Configuración en `firebase.json`

Se agregó la nueva función a la configuración de Firebase para permitir su despliegue.

---

## 🚀 Pasos para Completar la Solución

### Paso 1: Desplegar la Función Mejorada

```bash
# Desde la raíz del proyecto
firebase deploy --only functions:createFileProcessingJob
```

### Paso 2: Desplegar la Nueva Función

```bash
# Desde la raíz del proyecto
firebase deploy --only functions:processPendingJobs
```

### Paso 3: Configurar Cloud Scheduler (Recomendado)

```bash
gcloud scheduler jobs create http rag-worker-scheduler \
  --location=us-central1 \
  --schedule="*/2 * * * *" \
  --uri="https://rag-worker-mcc5aevj6a-uc.a.run.app" \
  --http-method=POST \
  --time-zone="America/Montevideo" \
  --description="Procesa jobs pendientes de RAG cada 2 minutos" \
  --headers="Content-Type=application/json"
```

**Nota:** El scheduler procesará jobs pendientes cada 2 minutos automáticamente, incluso si la invocación inicial falla.

---

## 🔧 Uso de la Nueva Función

### Invocar Manualmente desde Línea de Comandos

```bash
# Obtener la URL de la función después del despliegue
curl -X POST https://[REGION]-[PROJECT-ID].cloudfunctions.net/processPendingJobs
```

### Invocar desde el Código

```typescript
// En caso de emergencia, invocar desde el frontend o backend
fetch('https://[REGION]-[PROJECT-ID].cloudfunctions.net/processPendingJobs', {
  method: 'POST'
})
  .then(response => response.json())
  .then(data => console.log('Resultado:', data));
```

### Invocar desde Google Cloud Console

1. Ir a Cloud Functions
2. Seleccionar `processPendingJobs`
3. Hacer clic en "Probar función"
4. Enviar request

---

## 📊 Verificación

### Verificar que los Cambios Funcionan

1. **Crear un nuevo job:**
   - El job debería procesarse automáticamente con retry
   - Verificar logs en `createFileProcessingJob` para ver los intentos

2. **Verificar jobs pendientes:**
   ```sql
   SELECT id, file_name, status, created_at,
          EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
   FROM file_processing_jobs
   WHERE status = 'pending'
   ORDER BY created_at ASC;
   ```

3. **Procesar jobs pendientes manualmente:**
   - Invocar `processPendingJobs`
   - Verificar que los jobs cambien de `pending` a `processing`

### Logs a Monitorear

**En `createFileProcessingJob`:**
- `🔄 Intento X/3 de invocar RAG worker`
- `✅ RAG worker invocado exitosamente`
- `❌ No se pudo invocar RAG worker después de 3 intentos`

**En `processPendingJobs`:**
- `Iniciando procesamiento de jobs pendientes...`
- `✅ RAG worker procesado exitosamente`

**En `rag-worker`:**
- `[RAG Worker] Procesando job: [job-id]`
- `[RAG Worker] No hay jobs pendientes`

---

## 🎯 Beneficios de la Solución

1. **Mayor Confiabilidad:** Retry automático reduce fallos por problemas temporales de red
2. **Procesamiento Garantizado:** Cloud Scheduler asegura que los jobs se procesen eventualmente
3. **Diagnóstico Fácil:** Función manual permite verificar y procesar jobs pendientes cuando sea necesario
4. **Logging Mejorado:** Logs detallados facilitan el diagnóstico de problemas

---

## 🚨 Acción Inmediata para Jobs Pendientes Actuales

Si hay jobs pendientes que no se están procesando:

### Opción 1: Invocar rag-worker directamente

```bash
curl -X POST https://rag-worker-mcc5aevj6a-uc.a.run.app
```

### Opción 2: Usar la nueva función (después de desplegar)

```bash
curl -X POST https://[REGION]-[PROJECT-ID].cloudfunctions.net/processPendingJobs
```

### Opción 3: Verificar y procesar desde Supabase

1. Ver jobs pendientes en Supabase
2. Invocar rag-worker manualmente
3. Verificar que los jobs cambien de estado

---

## 📝 Próximos Pasos

1. ✅ Desplegar `createFileProcessingJob` mejorado
2. ✅ Desplegar `processPendingJobs`
3. ⏳ Configurar Cloud Scheduler
4. ⏳ Probar con un job real
5. ⏳ Monitorear logs durante 24 horas
6. ⏳ Verificar que no haya jobs atascados

---

## 🔍 Troubleshooting

### Si los jobs siguen sin procesarse:

1. **Verificar que el rag-worker esté funcionando:**
   - Ir a Cloud Run > rag-worker
   - Ver logs recientes
   - Verificar que no haya errores

2. **Verificar que el scheduler esté configurado:**
   ```bash
   gcloud scheduler jobs list --location=us-central1
   ```

3. **Verificar jobs pendientes:**
   ```sql
   SELECT COUNT(*) FROM file_processing_jobs WHERE status = 'pending';
   ```

4. **Invocar manualmente:**
   - Usar `processPendingJobs` o invocar rag-worker directamente

---

**Última actualización:** Noviembre 2025

