# 💰 Guía de Optimización de Costos: RAG Worker VM

**Objetivo:** Reducir costos apagando la VM cuando no se usa

---

## 🎯 Estrategias de Ahorro

### **Estrategia 1: Apagar Manualmente** ⭐ (MÁS SIMPLE)

**Cuándo usar:**
- Procesas archivos esporádicamente (1-5 veces/semana)
- Puedes planificar cuándo procesar

**Cómo:**
```bash
# Antes de procesar: Encender VM
gcloud compute instances start rag-worker-vm --zone=us-central1-a

# Esperar 2 minutos a que inicie
sleep 120

# Procesar archivos...

# Después de procesar: Apagar VM
gcloud compute instances stop rag-worker-vm --zone=us-central1-a
```

**Ahorro:**
```
Si procesas 5 horas/mes:
VM: 5h × $0.040 = $0.20/mes
Disco: $5.00/mes
Total: $5.20/mes

Ahorro vs 24/7: $29/mes (85%)
```

---

### **Estrategia 2: Horario Fijo** (RECOMENDADO)

**Cuándo usar:**
- Procesas archivos en horarios predecibles
- Ejemplo: Solo de 9 AM a 6 PM

**Cómo:**
```bash
# Crear Cloud Scheduler para encender/apagar

# Encender a las 9 AM (lunes a viernes)
gcloud scheduler jobs create compute start-rag-worker \
  --schedule="0 9 * * 1-5" \
  --time-zone="America/Montevideo" \
  --location=us-central1 \
  --action=start \
  --instance=rag-worker-vm \
  --instance-zone=us-central1-a

# Apagar a las 6 PM (lunes a viernes)
gcloud scheduler jobs create compute stop-rag-worker \
  --schedule="0 18 * * 1-5" \
  --time-zone="America/Montevideo" \
  --location=us-central1 \
  --action=stop \
  --instance=rag-worker-vm \
  --instance-zone=us-central1-a
```

**Ahorro:**
```
9 horas/día × 5 días/semana × 4 semanas = 180 horas/mes
VM: 180h × $0.040 = $7.20/mes
Disco: $5.00/mes
Total: $12.20/mes

Ahorro vs 24/7: $22/mes (64%)
```

---

### **Estrategia 3: Auto-Apagado Inteligente** (AVANZADO)

**Cuándo usar:**
- Procesas archivos de forma impredecible
- Quieres máxima optimización

**Cómo:**

1. **Instalar script de auto-apagado:**
```bash
# Copiar script a la VM
gcloud compute scp scripts/auto-shutdown-vm.sh rag-worker-vm:/opt/ --zone=us-central1-a

# SSH a la VM
gcloud compute ssh rag-worker-vm --zone=us-central1-a

# Configurar cron job
sudo crontab -e

# Agregar línea (ejecutar cada 10 minutos):
*/10 * * * * /opt/auto-shutdown-vm.sh
```

2. **Encender VM desde el frontend cuando hay job:**
```typescript
// En el frontend, antes de crear el job
import { Compute } from '@google-cloud/compute';
const compute = new Compute();

// Encender VM
await compute.zone('us-central1-a')
  .vm('rag-worker-vm')
  .start();

// Esperar 2 minutos
await new Promise(r => setTimeout(r, 120000));

// Crear job en Firestore
await createJob(...);
```

**Ahorro:**
```
Solo encendida cuando procesa (estimado 10h/mes):
VM: 10h × $0.040 = $0.40/mes
Disco: $5.00/mes
Total: $5.40/mes

Ahorro vs 24/7: $28.80/mes (84%)
```

---

## 📊 Comparación de Estrategias

| Estrategia | Horas/Mes | Costo VM | Costo Total | Ahorro | Complejidad |
|------------|-----------|----------|-------------|--------|-------------|
| **24/7** | 730 | $29.20 | $49.20 | $0 | Baja |
| **Manual** | 5 | $0.20 | $20.20 | $29 | Baja ⭐ |
| **Horario Fijo** | 180 | $7.20 | $27.20 | $22 | Media |
| **Auto-Apagado** | 10 | $0.40 | $20.40 | $28.80 | Alta |

---

## 🎯 Recomendación para Tu Caso

### **Usar Estrategia 1: Apagar Manualmente**

**Por qué:**
- ✅ Muy simple (2 comandos)
- ✅ Máximo ahorro (85%)
- ✅ Sin complejidad adicional
- ✅ Procesas 5-10 archivos/mes

**Workflow:**
```bash
# 1. Cuando necesites procesar un archivo:
gcloud compute instances start rag-worker-vm --zone=us-central1-a

# 2. Esperar 2 minutos
# (Puedes hacer otras cosas mientras)

# 3. Subir archivo desde el frontend
# (El worker lo procesará automáticamente)

# 4. Cuando termine (verificar en logs):
gcloud compute instances stop rag-worker-vm --zone=us-central1-a
```

---

## 💰 Costo Final Optimizado

### **Con Apagado Manual (5h/mes):**

| Componente | Costo/Mes | Costo/Año |
|------------|-----------|-----------|
| **VM (5h/mes)** | $0.20 | $2.40 |
| **Disco 50 GB** | $5.00 | $60.00 |
| **Tráfico** | $0.60 | $7.20 |
| **Supabase** | $15.00 | $180.00 |
| **TOTAL** | **$20.80** | **$249.60** |

### **Comparación:**

| Escenario | Costo/Mes | Ahorro vs 24/7 |
|-----------|-----------|----------------|
| **VM 24/7** | $49.20 | $0 |
| **VM con apagado** | $20.80 | **$28.40 (58%)** ✅ |
| **Cloud Run anterior** | $30.00 | N/A |

**¡Más barato que Cloud Run y con mejor performance!** 🎉

---

## 🔧 Scripts Útiles

### **Crear alias para facilitar:**

```bash
# En tu PowerShell profile
function Start-RagWorker {
    gcloud compute instances start rag-worker-vm --zone=us-central1-a
    Write-Host "VM encendida. Espera 2 minutos antes de procesar."
}

function Stop-RagWorker {
    gcloud compute instances stop rag-worker-vm --zone=us-central1-a
    Write-Host "VM apagada."
}

function Status-RagWorker {
    gcloud compute instances describe rag-worker-vm --zone=us-central1-a --format="value(status)"
}
```

**Uso:**
```powershell
Start-RagWorker   # Encender
Status-RagWorker  # Ver estado
Stop-RagWorker    # Apagar
```

---

## ⚠️ Consideraciones Importantes

### **1. Disco SIEMPRE se cobra:**
```
Disco: $5/mes (encendida o apagada)
No se puede apagar el disco sin eliminar la VM
```

### **2. IP Externa puede cambiar:**
```
Al apagar/encender, la IP externa puede cambiar
Solución: Reservar IP estática ($7/mes adicional)
```

### **3. Tiempo de inicio:**
```
La VM tarda ~2 minutos en iniciar
Planifica este tiempo antes de procesar
```

---

## 📊 Resumen Ejecutivo

### **Costo Optimizado:**
```
Total: $20.80/mes (vs $49.20 sin optimizar)
Ahorro: $28.40/mes (58%)
Ahorro anual: $340.80
```

### **Beneficios vs Cloud Run:**
```
Costo: $20.80 vs $30 (30% más barato)
RAM: 8 GB vs 2 GB (4x más)
Timeout: ∞ vs 60 min
Max PDF: 900 MB vs 200 MB
```

### **Workflow Recomendado:**
1. Encender VM cuando necesites procesar
2. Esperar 2 minutos
3. Procesar archivos
4. Apagar VM cuando termine

---

## ✅ Checklist de Optimización

- [ ] Crear alias de PowerShell
- [ ] Probar encender/apagar VM
- [ ] Verificar tiempo de inicio
- [ ] Configurar alertas de costo
- [ ] Documentar workflow en equipo

---

**Próximo paso:** Crear los alias de PowerShell y probar encender/apagar la VM.
