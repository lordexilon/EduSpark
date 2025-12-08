# 🔍 Diagnóstico de Errores en Procesamiento de Archivos

**Fecha:** Enero 2025  
**Problema:** Archivos grandes (40MB+) quedan como "fallido" en el procesamiento

---

## 📋 Cómo Diagnosticar Errores

### 1. Verificar el Error en la Base de Datos

Consulta la tabla `file_processing_jobs` para ver el mensaje de error específico:

```sql
SELECT 
    id,
    file_name,
    status,
    error_message,
    created_at,
    updated_at,
    metadata
FROM file_processing_jobs
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;
```

### 2. Verificar el Estado del Material

```sql
SELECT 
    id,
    title,
    rag_status,
    size_bytes,
    metadata->>'sourceFileId' as source_file_id,
    updated_at
FROM materials
WHERE rag_status = 'failed'
ORDER BY updated_at DESC;
```

### 3. Ver Logs del Worker en Google Cloud

```bash
gcloud functions logs read rag-worker \
  --region=us-central1 \
  --project=eduspark-py \
  --limit=50
```

O desde la consola:
- https://console.cloud.google.com/functions/details/us-central1/rag-worker?project=eduspark-py

---

## 🔧 Errores Comunes y Soluciones

### Error: "Timeout: El procesamiento del archivo tardó demasiado"

**Causa:** El archivo es muy grande y el procesamiento excede el timeout.

**Solución:**
- El timeout está configurado a 60 minutos
- Para archivos de 500-900MB, el procesamiento puede tardar 30-90 minutos
- Si el archivo es mayor a 900MB, considera dividirlo

**Verificación:**
```sql
SELECT 
    id,
    file_name,
    status,
    error_message,
    (metadata->>'fileSize')::bigint / (1024*1024) as size_mb
FROM file_processing_jobs
WHERE error_message LIKE '%Timeout%';
```

### Error: "No Google Drive token found"

**Causa:** El usuario no tiene un token válido de Google Drive.

**Solución:**
1. Ir al perfil del usuario
2. Reconectar Google Drive
3. Verificar que los permisos estén otorgados

**Verificación:**
```sql
SELECT 
    user_id,
    service_type,
    expires_at,
    created_at
FROM user_google_tokens
WHERE user_id = '<USER_ID>'
  AND service_type IN ('drive', 'both');
```

### Error: "Error de memoria"

**Causa:** El archivo es demasiado grande para procesar en memoria.

**Solución:**
- Dividir el archivo en partes más pequeñas
- Comprimir el PDF antes de subirlo
- El límite actual es 900MB

### Error: "No se pudo extraer texto del PDF"

**Causa:** 
- El PDF es una imagen escaneada sin OCR
- El PDF está corrupto
- El PDF está protegido con contraseña

**Solución:**
- Usar un PDF con texto extraíble
- Aplicar OCR al PDF antes de subirlo
- Verificar que el PDF no esté protegido

---

## 📊 Verificar Progreso de Procesamiento

### Ver Jobs en Procesamiento

```sql
SELECT 
    id,
    file_name,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM file_processing_jobs
WHERE status = 'processing'
ORDER BY updated_at DESC;
```

### Ver Chunks Procesados

```sql
SELECT 
    material_id,
    COUNT(*) as total_chunks,
    MAX(chunk_number) as max_chunk_number
FROM rag_file_chunks
WHERE material_id = '<MATERIAL_ID>'
GROUP BY material_id;
```

---

## 🔄 Reintentar un Job Fallido

### Opción 1: Desde la Interfaz

1. Ir a `/teacher/file-processing`
2. Buscar el archivo fallido
3. Hacer clic en "Re-procesar"

### Opción 2: Desde la Base de Datos

```sql
-- Resetear el job a pending
UPDATE file_processing_jobs
SET 
    status = 'pending',
    error_message = NULL,
    updated_at = NOW()
WHERE id = '<JOB_ID>';

-- Resetear el material
UPDATE materials
SET 
    rag_status = 'pending',
    updated_at = NOW()
WHERE id = '<MATERIAL_ID>';
```

Luego, el worker procesará el job automáticamente en la próxima ejecución.

---

## 🚨 Verificar Configuración del Worker

### Verificar Timeout y Memoria

```bash
gcloud functions describe rag-worker \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.timeoutSeconds,serviceConfig.availableMemory)"
```

**Valores esperados:**
- Timeout: 3600 segundos (60 minutos)
- Memoria: 4G

### Verificar Variables de Entorno

```bash
gcloud functions describe rag-worker \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.environmentVariables)"
```

**Debe incluir:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`

---

## 📝 Logs Detallados

El worker ahora registra información detallada:

1. **Tamaño del archivo** en MB
2. **Progreso de descarga**
3. **Progreso de extracción de texto**
4. **Progreso de generación de embeddings** (cada 50 chunks)
5. **Errores específicos** con código y stack trace

### Ver Últimos Logs

```bash
gcloud functions logs read rag-worker \
  --region=us-central1 \
  --project=eduspark-py \
  --limit=100 \
  --format="table(timestamp,severity,textPayload)"
```

---

## ✅ Checklist de Diagnóstico

Cuando un archivo falla:

- [ ] Verificar el mensaje de error en `file_processing_jobs.error_message`
- [ ] Verificar el tamaño del archivo (no debe exceder 900MB)
- [ ] Verificar que el usuario tenga token de Google Drive válido
- [ ] Verificar los logs del worker en Google Cloud Console
- [ ] Verificar que el timeout del worker sea 3600s
- [ ] Verificar que la memoria del worker sea 4GB
- [ ] Verificar que el archivo no esté corrupto o protegido
- [ ] Verificar que el PDF tenga texto extraíble (no solo imágenes)

---

## 🔗 Enlaces Útiles

- **Cloud Console:** https://console.cloud.google.com/functions/details/us-central1/rag-worker?project=eduspark-py
- **Logs:** Disponibles en Cloud Console → Functions → rag-worker → Logs
- **Documentación:** `AI_CONTEXT/CORRECCION_LIMITE_ARCHIVOS_MATERIALES_40MB.md`

---

**Última actualización:** Enero 2025

