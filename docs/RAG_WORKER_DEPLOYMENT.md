# RAG Processing Worker - Google Cloud Run Deployment

## 📋 Descripción

Este worker procesa archivos PDF desde Google Drive o Supabase Storage para generar embeddings y alimentar el sistema RAG (Retrieval-Augmented Generation) de EduSpark.

---

## 🏗️ Arquitectura

```
Frontend → Supabase (file_processing_jobs) → Cloud Run Worker
                                                    ↓
                                            Descarga archivo
                                                    ↓
                                            Extrae texto → Divide en chunks
                                                    ↓
                                            Gemini API (genera embeddings)
                                                    ↓
                                            Guarda en Supabase (rag_file_chunks)
```

---

## 🚀 Deployment

### **Prerrequisitos:**

1. **Google Cloud SDK** instalado y configurado
2. **Proyecto de Google Cloud** (`eduspark-py`)
3. **APIs habilitadas:**
   - Cloud Run API
   - Container Registry API
   - Cloud Build API

### **Pasos de Deployment:**

```bash
# 1. Dar permisos de ejecución al script
chmod +x deploy-rag-worker.sh

# 2. Ejecutar deployment
./deploy-rag-worker.sh
```

### **Configurar Variables de Entorno:**

Después del deployment, configura estas variables en Google Cloud Console:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key de Supabase | `eyJhbG...` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID de Google | `468517556859-...` |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | `GOCSPK-...` |
| `VITE_GEMINI_API_KEY` | API Key de Google Gemini | `AIza...` |
| `WORKER_INTERVAL_MS` | Intervalo de polling en ms | `30000` (default) |

**Enlace directo:** [Cloud Run Console](https://console.cloud.google.com/run/detail/us-central1/rag-processing-worker/revisions?project=eduspark-py)

---

## ⚙️ Configuración

### **Recursos Asignados:**

- **Memoria:** 2 GB
- **CPU:** 2 vCPUs
- **Timeout:** 60 minutos (3600s)
- **Instancias mínimas:** 1 (siempre activo)
- **Instancias máximas:** 10 (escala automáticamente)

### **Intervalo de Polling:**

El worker verifica nuevos jobs cada 30 segundos (configurable con `WORKER_INTERVAL_MS`).

---

## 🔄 Flujo de Procesamiento

### **1. Detección de Jobs**

```sql
SELECT * FROM file_processing_jobs 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 10
```

### **2. Descarga del Archivo**

- **Desde Google Drive:** Usa el `driveFileId` y token del usuario
- **Desde Supabase Storage:** Usa el `bucket_path`

### **3. Extracción de Texto**

- Usa `pdf-lib` para extraer texto página por página
- Soporta PDFs de texto (no OCR para escaneados)

### **4. División en Chunks**

- Tamaño máximo: 30,000 caracteres por chunk
- Overlap: 10% entre chunks contiguos

### **5. Generación de Embeddings**

- API: Google Gemini (`text-embedding-004`)
- Dimensiones: 768

### **6. Almacenamiento**

```sql
INSERT INTO rag_file_chunks (
  material_id,
  chunk_number,
  content,
  embedding,
  page_start,
  page_end
) VALUES (...)
```

---

## 📊 Monitoreo

### **Logs:**

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rag-processing-worker" --limit 50 --format json
```

### **Métricas:**

- **CPU Usage:** Monitorea picos durante procesamiento
- **Memory Usage:** Vigila para archivos grandes
- **Request Count:** Número de polls por minuto
- **Error Rate:** % de jobs fallidos

**Enlace:** [Cloud Run Metrics](https://console.cloud.google.com/run/detail/us-central1/rag-processing-worker/metrics?project=eduspark-py)

---

## 🐛 Troubleshooting

### **Worker no procesa jobs:**

1. Verificar que las variables de entorno estén configuradas
2. Revisar logs: `gcloud logging read ...`
3. Verificar que `min-instances=1` (siempre activo)

### **Error de timeout:**

- Aumentar el timeout: `--timeout 3600`
- Aumentar CPU/memoria si el archivo es muy grande

### **Error de conexión a Supabase:**

- Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`
- Asegurar que el Service Key tenga permisos

### **Error descargando desde Google Drive:**

- Verificar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
- Asegurar que el token del usuario no haya expirado

---

## 🔧 Actualizar el Worker

```bash
# Rebuilder y redeployar
./deploy-rag-worker.sh
```

Los cambios se aplicarán automáticamente a la siguiente revisión.

---

## 💰 Costos Estimados

### **Cloud Run:**
- **Costo por instancia activa:** ~$0.024/hora
- **Costo por GB-segundo:** $0.0000025
- **Estimado mensual (1 instancia siempre activa):** ~$18/mes

### **Gemini API:**
- **Costo por 1000 embeddings:** $0.00001
- **Estimado por archivo de 100 páginas:** ~$0.003

**Total estimado:** ~$20-30/mes (dependiendo del volumen)

---

## 📝 Notas

- El worker se ejecuta 24/7 con `min-instances=1`
- Escala automáticamente hasta 10 instancias si hay muchos jobs
- Los archivos se procesan en memoria (no persisten en disco)
- Los embeddings se almacenan en Supabase de forma permanente
