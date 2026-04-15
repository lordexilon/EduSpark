# 📊 Análisis de Servicios Google Cloud para RAG Worker

**Fecha:** 2025-12-08  
**Objetivo:** Evaluar alternativas a Cloud Run para procesamiento de PDFs grandes

---

## 🎯 Requisitos del RAG Worker

### **Carga de Trabajo:**
- **Archivos:** PDFs de 50-200 MB (hasta 900 MB)
- **Páginas:** 500-2000 páginas por PDF
- **Procesamiento:** Extracción de texto + Embeddings + Inserción en BD
- **Tiempo:** 10-60 minutos por archivo
- **Frecuencia:** Bajo (1-5 archivos por día)

### **Recursos Necesarios:**
- **CPU:** 2-4 cores
- **RAM:** 4-8 GB
- **Timeout:** 30-60 minutos
- **Concurrencia:** 1-2 jobs simultáneos

---

## 🔍 Opciones de Google Cloud

### **1. Cloud Run (ACTUAL)**

#### **Configuración Actual:**
```yaml
Memory: 2 GB
CPU: 2-core ARM
Timeout: 540s (9 minutos)
Concurrency: 1
```

#### **Pros:**
- ✅ Serverless (paga solo por uso)
- ✅ Auto-scaling
- ✅ Fácil deployment
- ✅ Integración con Cloud Build

#### **Contras:**
- ❌ **Timeout máximo: 60 minutos** (puede ser insuficiente)
- ❌ **RAM limitada a 32 GB** (caro para 8+ GB)
- ❌ **CPU compartida** (performance variable)
- ❌ **Costo alto** para jobs largos

#### **Costo Estimado:**
```
Configuración: 4 GB RAM, 2 CPU, 30 min/job
- CPU: $0.00002400/vCPU-second
- RAM: $0.00000250/GB-second

Por job (30 min = 1800s):
- CPU: 2 × 1800 × $0.000024 = $0.0864
- RAM: 4 × 1800 × $0.0000025 = $0.018
- Total: ~$0.10 por job

5 jobs/día × 30 días = $15/mes
```

---

### **2. Cloud Functions Gen 2 (ALTERNATIVA)**

#### **Configuración Recomendada:**
```yaml
Memory: 4 GB
CPU: 2 cores
Timeout: 3600s (60 minutos)
Concurrency: 1
```

#### **Pros:**
- ✅ Serverless (paga solo por uso)
- ✅ **Timeout: hasta 60 minutos**
- ✅ Más barato que Cloud Run para jobs largos
- ✅ Fácil deployment

#### **Contras:**
- ❌ Timeout aún limitado (60 min)
- ❌ Menos flexible que Cloud Run
- ❌ RAM máxima: 16 GB

#### **Costo Estimado:**
```
Configuración: 4 GB RAM, 30 min/job
- Compute: $0.0000167/GB-second
- Invocations: $0.40/million

Por job (30 min = 1800s):
- Compute: 4 × 1800 × $0.0000167 = $0.12
- Invocation: $0.0000004
- Total: ~$0.12 por job

5 jobs/día × 30 días = $18/mes
```

**Veredicto:** Similar a Cloud Run, no hay ventaja significativa.

---

### **3. Compute Engine (VM) - ⭐ RECOMENDADO**

#### **Configuración Recomendada:**
```yaml
Machine Type: e2-medium (2 vCPU, 4 GB RAM)
Disk: 20 GB SSD
Preemptible: NO (para jobs críticos)
Region: us-central1
```

#### **Pros:**
- ✅ **Sin límite de timeout**
- ✅ **Performance consistente** (CPU dedicada)
- ✅ **Muy económico** con uso continuo
- ✅ **Escalable** (puedes aumentar RAM/CPU fácilmente)
- ✅ **Control total** del entorno

#### **Contras:**
- ⚠️ Requiere gestión de VM
- ⚠️ Pagas 24/7 (incluso sin uso)
- ⚠️ Deployment manual

#### **Costo Estimado:**
```
e2-medium (2 vCPU, 4 GB RAM):
- On-demand: $0.0335/hour
- Committed 1-year: $0.0201/hour (40% descuento)
- Committed 3-year: $0.0143/hour (57% descuento)

Mensual (730 horas):
- On-demand: $24.46/mes
- 1-year commit: $14.67/mes
- 3-year commit: $10.44/mes

Disk (20 GB SSD): $3.40/mes

Total con 1-year commit: ~$18/mes
```

**Ventaja:** Procesas ILIMITADOS jobs sin costo adicional.

---

### **4. Cloud Run Jobs - ⭐⭐ MÁS RECOMENDADO**

#### **Configuración Recomendada:**
```yaml
Memory: 4 GB
CPU: 2 cores
Timeout: 3600s (60 minutos)
Max retries: 3
Parallelism: 1
```

#### **Pros:**
- ✅ **Diseñado para jobs largos**
- ✅ **Timeout: hasta 24 horas** 🔥
- ✅ **Más barato que Cloud Run** para jobs largos
- ✅ **Auto-retry** en caso de fallo
- ✅ **Serverless** (paga solo por uso)
- ✅ **Fácil deployment** (mismo que Cloud Run)

#### **Contras:**
- ⚠️ Requiere trigger manual o Cloud Scheduler
- ⚠️ No tiene HTTP endpoint (usa Pub/Sub o Scheduler)

#### **Costo Estimado:**
```
Configuración: 4 GB RAM, 2 CPU, 30 min/job
- CPU: $0.00002400/vCPU-second
- RAM: $0.00000250/GB-second

Por job (30 min = 1800s):
- CPU: 2 × 1800 × $0.000024 = $0.0864
- RAM: 4 × 1800 × $0.0000025 = $0.018
- Total: ~$0.10 por job

5 jobs/día × 30 días = $15/mes
```

**Ventaja:** Mismo costo que Cloud Run pero **timeout de 24 horas**.

---

## 📊 Comparación Final

| Servicio | Costo/Mes | Timeout | Performance | Gestión | Recomendación |
|----------|-----------|---------|-------------|---------|---------------|
| **Cloud Run** | $15 | 60 min | Variable | Fácil | ⚠️ Actual |
| **Cloud Functions** | $18 | 60 min | Variable | Fácil | ❌ No ventaja |
| **Compute Engine** | $18 | Ilimitado | Alta | Media | ⭐ Buena |
| **Cloud Run Jobs** | $15 | **24 horas** | Alta | Fácil | ⭐⭐ **MEJOR** |

---

## 🎯 Recomendación Final

### **🥇 Opción 1: Cloud Run Jobs** (MEJOR)

**Por qué:**
- ✅ Mismo costo que Cloud Run actual
- ✅ **Timeout de 24 horas** (vs 60 min)
- ✅ Diseñado para procesamiento batch
- ✅ Fácil migración desde Cloud Run
- ✅ Auto-retry y logging integrado

**Migración:**
```bash
# Mismo Dockerfile, solo cambiar el deployment
gcloud run jobs create rag-worker \
  --image gcr.io/eduspark-py/rag-worker \
  --region us-central1 \
  --memory 4Gi \
  --cpu 2 \
  --max-retries 3 \
  --task-timeout 3600s
```

**Trigger:**
```bash
# Desde el frontend o Cloud Scheduler
gcloud run jobs execute rag-worker \
  --region us-central1 \
  --args="job-id-123"
```

---

### **🥈 Opción 2: Compute Engine** (Alternativa)

**Por qué:**
- ✅ Sin límite de timeout
- ✅ Performance consistente
- ✅ Económico con committed use

**Cuándo usar:**
- Si procesas >10 jobs/día
- Si necesitas >8 GB RAM
- Si quieres control total

---

## 🚀 Plan de Migración a Cloud Run Jobs

### **Paso 1: Crear el Job**
```bash
cd src/workers/file-processing-worker

gcloud run jobs create file-processing-worker \
  --source . \
  --region us-central1 \
  --memory 4Gi \
  --cpu 2 \
  --max-retries 3 \
  --task-timeout 3600s \
  --set-env-vars="SUPABASE_URL=...,SUPABASE_SERVICE_KEY=...,GEMINI_API_KEY=..."
```

### **Paso 2: Modificar Frontend**
```typescript
// En lugar de HTTP request a Cloud Run
const response = await fetch('https://cloud-run-url', {...});

// Usar Cloud Run Jobs API
import { JobsClient } from '@google-cloud/run';
const client = new JobsClient();
await client.runJob({
  name: 'projects/eduspark-py/locations/us-central1/jobs/file-processing-worker',
  overrides: {
    containerOverrides: [{
      args: [jobId]
    }]
  }
});
```

### **Paso 3: Configurar Cloud Scheduler (Opcional)**
```bash
gcloud scheduler jobs create http rag-worker-scheduler \
  --location us-central1 \
  --schedule "*/10 * * * *" \
  --uri "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/eduspark-py/jobs/file-processing-worker:run" \
  --http-method POST \
  --oauth-service-account-email eduspark-py@appspot.gserviceaccount.com
```

---

## 💰 Ahorro Estimado

| Escenario | Cloud Run | Cloud Run Jobs | Ahorro |
|-----------|-----------|----------------|--------|
| 5 jobs/día | $15/mes | $15/mes | $0 |
| 10 jobs/día | $30/mes | $30/mes | $0 |
| Jobs >60 min | ❌ Falla | ✅ Funciona | ∞ |

**Ventaja principal:** No es ahorro de costo, es **confiabilidad** (24h timeout vs 60 min).

---

## ✅ Conclusión

**Migrar a Cloud Run Jobs** es la mejor opción porque:
1. ✅ Mismo costo
2. ✅ **24 horas de timeout** (vs 60 min)
3. ✅ Diseñado para batch processing
4. ✅ Migración fácil (mismo Dockerfile)
5. ✅ Auto-retry integrado

**Próximo paso:** ¿Quieres que implemente la migración a Cloud Run Jobs?
