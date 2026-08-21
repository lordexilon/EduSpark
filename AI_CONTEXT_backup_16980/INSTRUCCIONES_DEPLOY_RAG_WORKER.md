# 🚀 Instrucciones para Deploy del RAG Worker

**Fecha:** Diciembre 2025  
**Cambios:** Lógica para resumir procesamiento de chunks

---

## 📋 Resumen de Cambios

Este deploy incluye mejoras importantes:

- ✅ **Resumir procesamiento:** El worker ahora puede continuar desde donde quedó si se interrumpe
- ✅ **Verificación de chunks existentes:** No reprocesa chunks ya insertados
- ✅ **Mejor manejo de errores:** Más robusto ante interrupciones

---

## 🔧 Pasos para Deploy

### **Opción 1: Deploy Directo (Recomendado)**

Desde la carpeta `functions/rag-worker/`, ejecuta:

```powershell
gcloud functions deploy rag-worker `
  --gen2 `
  --runtime=nodejs20 `
  --region=us-central1 `
  --source=. `
  --entry-point=processRagJobs `
  --trigger-http `
  --allow-unauthenticated `
  --timeout=3600s `
  --memory=4GB `
  --max-instances=10 `
  --project=eduspark-py `
  --set-env-vars="SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co,SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8,GEMINI_API_KEY=TU_GEMINI_API_KEY"
```

**⚠️ IMPORTANTE:** Reemplaza `TU_GEMINI_API_KEY` con tu clave real de Gemini API.

### **Opción 2: Usar Script con Variable de Entorno**

1. Configurar la variable de entorno:
   ```powershell
   $env:GEMINI_API_KEY = "tu-api-key-aqui"
   ```

2. Ejecutar el script:
   ```powershell
   cd functions/rag-worker
   .\deploy.ps1
   ```

---

## ✅ Verificación Post-Deploy

### **1. Verificar que el deploy fue exitoso:**

```powershell
gcloud functions describe rag-worker --region=us-central1 --gen2
```

### **2. Ver logs del worker:**

```powershell
gcloud functions logs read rag-worker --limit=50 --region=us-central1
```

### **3. Probar invocación manual (opcional):**

```powershell
gcloud functions call rag-worker --region=us-central1 --gen2
```

---

## 🔍 Cambios Técnicos Implementados

### **1. Verificación de Chunks Ya Procesados**

El worker ahora verifica cuántos chunks ya están en la base de datos antes de comenzar:

```javascript
// Consulta chunks ya procesados
const { data: existingChunks } = await supabase
    .from('course_content_chunks')
    .select('chunk_index, metadata')
    .eq('metadata->>material_id', materialId.toString())
    .order('chunk_index', { ascending: true });
```

### **2. Continuación Automática**

Si encuentra chunks ya procesados, continúa desde donde quedó:

```javascript
const maxChunkIndex = Math.max(...existingChunks.map(c => c.chunk_index || 0));
startFromIndex = maxChunkIndex; // Continuar desde el siguiente chunk
```

### **3. Loop Optimizado**

El loop de procesamiento ahora comienza desde `startFromIndex`:

```javascript
for (let embeddingBatchStart = startFromIndex; embeddingBatchStart < chunks.length; ...) {
    // Solo procesa chunks que faltan
}
```

---

## 📊 Qué Esperar Después del Deploy

1. **El worker reanudará automáticamente** el procesamiento de jobs que estaban en "processing"
2. **Para el archivo "Schwartz Principios de Cirugia 11a Edicion.pdf"** que estaba en 1660 chunks:
   - Verificará que hay 1660 chunks ya procesados
   - Continuará desde el chunk 1661
   - No reprocesará los chunks anteriores

3. **Los logs mostrarán:**
   ```
   [RAG Worker] ✅ Encontrados 1660 chunks ya procesados. Continuando desde chunk 1661/5000
   ```

---

## 🐛 Solución de Problemas

### **Error: "GEMINI_API_KEY is required"**
- Verifica que la variable de entorno esté configurada correctamente
- Asegúrate de incluirla en el comando `--set-env-vars`

### **Error: "Function deployment failed"**
- Verifica que tienes permisos en el proyecto `eduspark-py`
- Revisa los logs: `gcloud functions logs read rag-worker --limit=20`

### **El worker no reanuda el procesamiento**
- Espera 2-3 minutos después del deploy
- Verifica que el job esté en estado "processing" y que tenga `chunksProcessed` > 0
- Revisa los logs para ver si detectó chunks ya procesados

---

## 📝 Notas Importantes

- ⏱️ **Tiempo de deploy:** Puede tardar 5-10 minutos
- 🔄 **Reinicio automático:** El worker se reiniciará automáticamente
- 📊 **Monitoreo:** Revisa los logs después del deploy para verificar que todo funcione correctamente

---

**Última actualización:** Diciembre 2025  
**Autor:** Sistema EduSpark

