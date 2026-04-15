# 💰 Análisis de Costos: RAG Worker en Compute Engine

**Fecha:** 2025-12-08  
**VM Creada:** rag-worker-vm  
**Estado:** ✅ RUNNING

---

## 📊 Configuración de la VM

```yaml
Nombre: rag-worker-vm
Zona: us-central1-a
Machine Type: e2-standard-2
├── vCPU: 2 cores (x86/64)
├── RAM: 8 GB
├── Disk: 50 GB SSD (pd-balanced)
├── IP Interna: 10.128.0.2
└── IP Externa: 34.133.217.99
```

---

## 💵 Desglose de Costos Mensual

### **1. Compute Engine VM (e2-standard-2)**

#### **Opción A: On-Demand (Sin Compromiso)**
```
Costo por hora: $0.067
Horas por mes: 730
Total: $48.91/mes
```

#### **Opción B: Committed Use 1 Año (40% descuento)** ⭐
```
Costo por hora: $0.040
Horas por mes: 730
Total: $29.20/mes
```

#### **Opción C: Committed Use 3 Años (57% descuento)**
```
Costo por hora: $0.029
Horas por mes: 730
Total: $21.17/mes
```

---

### **2. Disco Persistente (50 GB SSD)**

```
Tipo: pd-balanced
Tamaño: 50 GB
Costo: $0.10/GB/mes
Total: $5.00/mes
```

---

### **3. Tráfico de Red**

```
Egress (salida):
├── Primeros 1 GB/mes: GRATIS
├── 1-10 TB/mes: $0.12/GB
└── Estimado: ~5 GB/mes = $0.60/mes
```

---

## 💰 Costo Total Mensual

| Componente | On-Demand | 1-Year Commit | 3-Year Commit |
|------------|-----------|---------------|---------------|
| **VM e2-standard-2** | $48.91 | $29.20 | $21.17 |
| **Disco 50 GB SSD** | $5.00 | $5.00 | $5.00 |
| **Tráfico de red** | $0.60 | $0.60 | $0.60 |
| **Subtotal Google Cloud** | $54.51 | $34.80 | $26.77 |
| **Supabase Small** | $15.00 | $15.00 | $15.00 |
| **TOTAL** | **$69.51** | **$49.80** | **$41.77** |

---

## 📊 Comparación con Solución Anterior

### **Antes (Cloud Run):**
```
Cloud Run (2 GB RAM):
├── 5 jobs/día × 30 min
├── Costo: $15/mes
└── Supabase: $15/mes
Total: $30/mes
```

### **Después (Compute Engine):**
```
VM e2-standard-2 (8 GB RAM):
├── Ilimitados jobs
├── Costo: $34.80/mes (1-year commit)
└── Supabase: $15/mes
Total: $49.80/mes
```

### **Diferencia:**
```
Incremento: +$19.80/mes (+66%)

Beneficios:
✅ 4x más RAM (8 GB vs 2 GB)
✅ Sin límite de timeout (∞ vs 60 min)
✅ CPU dedicada (vs compartida)
✅ Procesa archivos 4x más grandes (900 MB vs 200 MB)
✅ Ilimitados jobs (vs pago por uso)
```

---

## 🎯 ROI (Retorno de Inversión)

### **Punto de Equilibrio:**

**Cloud Run cuesta lo mismo que VM si procesas:**
```
$34.80 (VM) ÷ $3 (por job) = 11.6 jobs/mes

Si procesas >12 jobs/mes → VM es más barata
Si procesas <12 jobs/mes → Cloud Run es más barata
```

### **Escenarios:**

| Jobs/Mes | Cloud Run | VM (1-year) | Mejor Opción |
|----------|-----------|-------------|--------------|
| 5 | $15 | $34.80 | Cloud Run |
| 10 | $30 | $34.80 | Cloud Run |
| 15 | $45 | $34.80 | **VM** ✅ |
| 20 | $60 | $34.80 | **VM** ✅ |
| 50 | $150 | $34.80 | **VM** ✅ |

---

## 💡 Optimizaciones de Costo

### **1. Usar Committed Use Discount**
```
Ahorro: 40% (1 año) o 57% (3 años)
Acción: Comprar committed use en Google Cloud Console
```

### **2. Apagar VM en Horarios de Baja Demanda**
```
Si apagas 12h/día:
├── Ahorro: 50% en costo de VM
├── Costo VM: $14.60/mes (vs $29.20)
└── Total: $34.60/mes (vs $49.80)

Nota: Solo si no necesitas procesamiento 24/7
```

### **3. Usar Preemptible VM (No Recomendado)**
```
Ahorro: 60-91%
Costo: $10-15/mes
Problema: Google puede apagar la VM en cualquier momento
Recomendación: NO usar para jobs críticos
```

### **4. Reducir Disco a 30 GB**
```
Ahorro: $2/mes
Costo disco: $3/mes (vs $5/mes)
```

---

## 📈 Proyección Anual

### **Con Committed Use 1 Año:**

```
Mes 1-12:
├── VM: $29.20/mes × 12 = $350.40
├── Disco: $5.00/mes × 12 = $60.00
├── Red: $0.60/mes × 12 = $7.20
├── Supabase: $15.00/mes × 12 = $180.00
└── Total Año 1: $597.60

Promedio mensual: $49.80/mes
```

### **Con Committed Use 3 Años:**

```
Mes 1-36:
├── VM: $21.17/mes × 36 = $762.12
├── Disco: $5.00/mes × 36 = $180.00
├── Red: $0.60/mes × 36 = $21.60
├── Supabase: $15.00/mes × 36 = $540.00
└── Total 3 Años: $1,503.72

Promedio mensual: $41.77/mes
Ahorro vs On-Demand: $1,000/3 años
```

---

## 🎯 Recomendación de Costo

### **Para Tu Caso (5-10 archivos/mes):**

**Opción Recomendada: Committed Use 1 Año**

**Por qué:**
1. ✅ Ahorro de 40% vs On-Demand
2. ✅ Flexibilidad (solo 1 año de compromiso)
3. ✅ Costo predecible ($49.80/mes)
4. ✅ Escalable sin costo adicional

**Cómo activar:**
```bash
# En Google Cloud Console
1. Ir a: Compute Engine > Committed use discounts
2. Click: Purchase commitment
3. Seleccionar:
   - Region: us-central1
   - Machine type: e2-standard-2
   - Term: 1 year
   - Quantity: 1
4. Confirmar compra
```

---

## 📊 Comparación con Otras Opciones

| Opción | Costo/Mes | Timeout | RAM | Mejor Para |
|--------|-----------|---------|-----|------------|
| **Cloud Run** | $15 | 60 min | 2 GB | <10 jobs/mes |
| **Cloud Run Jobs** | $15 | 24h | 4 GB | 10-15 jobs/mes |
| **VM e2-standard-2** | $50 | ∞ | 8 GB | >15 jobs/mes ⭐ |
| **VM e2-medium** | $25 | ∞ | 4 GB | Alternativa económica |

---

## ✅ Resumen Ejecutivo

### **Costo Actual:**
```
Total: $49.80/mes (con 1-year commit)
├── Google Cloud: $34.80/mes
└── Supabase: $15.00/mes
```

### **Beneficios:**
- ✅ Procesa archivos de hasta 900 MB
- ✅ Sin límite de timeout
- ✅ 8 GB RAM (4x más que antes)
- ✅ Ilimitados jobs sin costo adicional
- ✅ Performance consistente

### **Incremento vs Anterior:**
```
+$19.80/mes (+66%)

Justificación:
- Procesa archivos 4x más grandes
- Sin límite de jobs
- Sin timeouts
- Mejor performance
```

---

## 📝 Próximos Pasos

1. **Activar Committed Use Discount** (ahorra $14/mes)
2. **Configurar alertas de costo** en Google Cloud
3. **Monitorear uso** durante 1 mes
4. **Optimizar** si es necesario

---

**Última actualización:** 2025-12-08  
**VM Status:** ✅ RUNNING  
**IP Externa:** 34.133.217.99
