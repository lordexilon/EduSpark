# ⚠️ SITUACIÓN ACTUAL - RAG Worker

**Fecha:** 2025-12-08 22:15  
**Estado:** ❌ PROBLEMA CRÍTICO IDENTIFICADO

---

## 🚨 Problema Actual

### **El Frontend en Producción Sigue Fallando:**
```
Error: Invalid string length
Archivo: Harrison 21ª (137 MB, 703 páginas)
```

### **Causa Raíz:**
El frontend en producción está llamando al **worker ANTIGUO** en Cloud Functions que **NO tiene** el procesamiento página por página.

**Flujo Actual (INCORRECTO):**
```
Frontend → createfileprocessingjob-mcc5aevj6a-uc.a.run.app
  → Cloud Functions (worker antiguo)
    → ❌ Error "Invalid string length"
```

**Lo que creamos hoy:**
```
VM rag-worker-vm → ✅ Código optimizado (procesamiento página por página)
Pero el frontend NO lo está usando
```

---

## 🔧 Soluciones Propuestas

### **Opción 1: Actualizar Cloud Functions** ⭐ (MÁS RÁPIDO)

Deployar el código optimizado a las Cloud Functions existentes:

**Pasos:**
1. Restaurar `functions/rag-worker/index.js` desde git (está corrupto)
2. Integrar el código de procesamiento página por página
3. Deploy argo functions deploy rag-worker --gen2`

**Ventaja:** El frontend sigue funcionando sin cambios  
**Desventaja:** Sigue usando Cloud Functions (menos flexible que VM)

---

### **Opción 2: Migrar Frontend a usar VM** (MEJOR A LARGO PLAZO)

Actualizar el frontend para que llame a la VM en lugar de Cloud Functions:

**Cambios necesarios:**
```typescript
// En el frontend
// Antes:
const WORKER_URL = 'https://createfileprocessingjob-mcc5aevj6a-uc.a.run.app';

// Después:
const WORKER_URL = 'http://34.133.217.99:8080'; // IP de la VM
```

**Problema:** La VM no tiene IP pública configurada correctamente  
**Solución:** Configurar Cloud Load Balancer o Cloud Run que llame a la VM

---

### **Opción 3: Hybrid Approach** ⭐⭐ (RECOMENDADO)

1. **Corto plazo (HOY/MAÑANA):**
   - Arreglar `functions/rag-worker/index.js`
   - Deployar código optimizado a Cloud Functions
   - Frontend funciona inmediatamente

2. **Mediano plazo (ESTA SEMANA):**
   - Migrar gradualmente a usar la VM
   - Configurar Load Balancer
   - Deprecar Cloud Functions

---

## 🔧 Plan de Acción Inmediato (Mañana)

### **Paso 1: Restaurar index.js**
```bash
cd functions/rag-worker
git checkout HEAD -- index.js
```

### **Paso 2: Integrar código optimizado**
Agregar la función de procesamiento página por página directamente en `index.js` (sin archivo separado)

### **Paso 3: Deploy a Cloud Functions**
```bash
gcloud functions deploy rag-worker \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=./functions/rag-worker \
  --entry-point=processRagJobs \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=540s \
  --memory=4GB
```

### **Paso 4: Probar con Harrison 21ª**
Verificar que procesa sin error "Invalid string length"

---

## 📊 Estado de Recursos

### **VM (rag-worker-vm):**
- Estado: ✅ Activa y funcionando
- Código: ✅ Optimizado con procesamiento página por página
- Problema: ❌ Frontend no la está usando

### **Cloud Functions (rag-worker):**
- Estado: ✅ Activa
- Código: ❌ Versión antigua (sin optimización)
- Problema: ❌ Causa error "Invalid string length"

### **Frontend:**
- Estado: ✅ Funcionando
- Problema: ❌ Llama al worker antiguo

---

## 💰 Impacto de Costos

### **Con Cloud Functions (4 GB):**
```
Costo por job (30 min): ~$0.25
5 jobs/mes: ~$1.25/mes
Total con Supabase: ~$16.25/mes
```

### **Con VM (apagado manual):**
```
Costo por job (2h): ~$0.08
5 jobs/mes: ~$0.40/mes
Total con Supabase: ~$20.80/mes
```

**Cloud Functions es más barato** para pocos jobs, pero tiene límite de timeout.

---

## ✅ Recomendación Final

### **Para HOY:**
Apagar la VM para ahorrar costos:
```powershell
Stop-RagWorker
```

### **Para MAÑANA:**
1. Restaurar `functions/rag-worker/index.js`
2. Integrar procesamiento página por página
3. Deployar a Cloud Functions
4. Probar con Harrison 21ª

### **Para ESTA SEMANA:**
1. Si Cloud Functions funciona → Deprecar VM (ahorrar costos)
2. Si necesitamos más timeout → Migrar a VM con Load Balancer

---

## 📝 Archivos que Necesitan Arreglo

### **Corrupto:**
- `functions/rag-worker/index.js` (le faltan las primeras líneas)

### **Solución:**
```bash
git checkout HEAD -- functions/rag-worker/index.js
```

---

## 🎯 Próxima Sesión - Checklist

- [ ] Restaurar index.js desde git
- [ ] Agregar función de procesamiento página por página
- [ ] Deployar a Cloud Functions (NO a VM)
- [ ] Probar con Harrison 21ª
- [ ] Decidir si mantener VM o deprecarla

---

**Documentado por:** Sistema EduSpark  
**Fecha:** 2025-12-08 22:15  
**Estado:** Worker antiguo causando errores, código optimizado disponible pero no en uso
