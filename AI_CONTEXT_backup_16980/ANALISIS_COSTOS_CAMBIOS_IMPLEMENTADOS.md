# Análisis de Costos: Cambios Implementados

**Fecha:** Enero 2025

---

## 🎯 Cambios Implementados

1. **Calificación Automática de Respuestas** (usando Gemini 2.5 Flash)
2. **Sistema de Retroalimentación** (guardado y procesamiento)
3. **Edge Function para Procesamiento** (cron job diario)
4. **Reporte de Administración** (sin costo adicional)

---

## 💰 Costos de Gemini API

### Modelos Utilizados:
- **Gemini 2.5 Flash** (principal para tutor y calificación)
- **text-embedding-004** (para embeddings)

### Precios Actuales (Google AI Studio, enero 2025):
- **Gemini 2.5 Flash**:
  - Input: ~$0.075 por 1M tokens
  - Output: ~$0.30 por 1M tokens
- **text-embedding-004**:
  - ~$0.025 por 1M tokens

---

## 📊 Análisis de Costos por Componente

### 1. Calificación Automática de Respuestas

**Frecuencia:** Se ejecuta **automáticamente** después de cada respuesta del tutor.

**Costo por Calificación:**
- Prompt de calificación: ~800 tokens (input)
- Respuesta JSON: ~150 tokens (output)
- **Total:** ~950 tokens por calificación
- **Costo:** ~$0.00036 por calificación
  - Input: 800 * $0.075 / 1,000,000 = $0.00006
  - Output: 150 * $0.30 / 1,000,000 = $0.000045

**Escenario Realista:**
- 100 interacciones de tutor por día
- 100 calificaciones automáticas por día
- **Costo diario:** 100 * $0.00036 = **$0.036/día**
- **Costo mensual:** $0.036 * 30 = **~$1.08/mes**

---

### 2. Sistema de Retroalimentación

#### 2.1 Guardado de Respuestas
- **Costo:** $0 (solo almacenamiento en base de datos)
- **Impacto:** Mínimo (texto simple en PostgreSQL)

#### 2.2 Procesamiento de Retroalimentación (Edge Function)

**Frecuencia:** Diario (cron job a las 2:00 AM UTC)

**Procesamiento por Lote:**
- Obtiene respuestas pendientes (máx 100 por ejecución)
- Para cada respuesta:
  - Genera embedding: ~500 tokens * $0.025 / 1M = $0.0000125
  - Inserta chunk en RAG
- **Costo por respuesta procesada:** ~$0.0000125

**Escenario Realista:**
- 50 respuestas pendientes por día
- 50 procesamientos diarios
- **Costo diario:** 50 * $0.0000125 = **$0.000625/día**
- **Costo mensual:** $0.000625 * 30 = **~$0.019/mes**

---

### 3. Costos Totales Adicionales

#### Componente 1: Calificación Automática
- **Diario:** $0.036
- **Mensual:** ~$1.08

#### Componente 2: Procesamiento de Retroalimentación
- **Diario:** $0.000625
- **Mensual:** ~$0.019

#### **TOTAL ADICIONAL:**
- **Diario:** ~$0.037
- **Mensual:** ~$1.10

---

## 📈 Comparación con Costos Existentes

### Costos Actuales del Tutor (sin cambios):

**Por interacción típica:**
- Embedding de consulta: ~500 tokens = $0.0000125
- Prompt RAG: ~2000 tokens (input) = $0.00015
- Respuesta del tutor: ~300 tokens (output) = $0.00009
- **Total por interacción:** ~$0.0002525

**Escenario Realista (100 interacciones/día):**
- **Diario:** 100 * $0.0002525 = $0.02525
- **Mensual:** ~$0.76

### Costos Totales (Con Cambios):

**Sin cambios:**
- Tutor: ~$0.76/mes
- **Total:** ~$0.76/mes

**Con cambios:**
- Tutor: ~$0.76/mes
- Calificación automática: ~$1.08/mes
- Procesamiento feedback: ~$0.019/mes
- **Total:** ~$1.86/mes

**Incremento:** ~$1.10/mes (144% más)

---

## 💡 Optimizaciones Recomendadas

### 1. Reducir Frecuencia de Calificación Automática

**Opción A: Calificar solo respuestas nuevas (no todas)**
- Si ya hay calificación manual, no calificar automáticamente
- Ahorro: ~30% = **$0.32/mes**

**Opción B: Calificar solo respuestas de baja confianza RAG**
- Solo calificar cuando `rag_confidence < 0.5`
- Ahorro: ~50% = **$0.54/mes**

### 2. Procesamiento Batch Más Eficiente

**Opción A: Procesar solo respuestas con alta calidad**
- Filtrar por `quality_score >= 0.7` antes de procesar
- Ahorro en embeddings: ~20% = **$0.004/mes** (mínimo)

### 3. Desactivar Calificación Automática en Producción

**Opción: Solo metadata interna (sin Gemini)**
- Usar heurísticas simples (longitud, estructura)
- Ahorro: **$1.08/mes**

---

## 📊 Proyección de Costos por Volumen

| Interacciones/Día | Calificación Auto | Procesamiento | Total Adicional/Mes |
|-------------------|-------------------|---------------|---------------------|
| 50                | $0.54             | $0.009        | ~$0.55              |
| 100               | $1.08             | $0.019        | ~$1.10              |
| 200               | $2.16             | $0.038        | ~$2.20              |
| 500               | $5.40             | $0.095        | ~$5.50              |
| 1000              | $10.80            | $0.19         | ~$11.00             |

---

## ✅ Recomendación Final

### Costo-Beneficio:

**Costo adicional:** ~$1.10/mes (144% más que antes)

**Beneficios:**
1. ✅ Calidad automática de respuestas (metadata interna)
2. ✅ Sistema de retroalimentación para mejorar RAG
3. ✅ Reporte para administradores
4. ✅ Mejora continua del sistema

**Recomendación:**
- **Mantener calificación automática** solo como metadata interna (desactivar llamada a Gemini)
- **Mantener procesamiento de retroalimentación** (costo mínimo)
- **Evaluar activación de calificación con Gemini** solo si el presupuesto lo permite

---

## 🔧 Implementación de Optimización

### Opción Recomendada: Calificación Heurística (Sin Gemini)

Cambiar `tutorAutoRatingService.ts` para usar solo heurísticas:
- Longitud de respuesta
- Estructura (párrafos, listas)
- Completitud básica
- **Costo:** $0 (sin llamadas a Gemini)

**Ahorro:** $1.08/mes

**Costo total optimizado:** ~$0.019/mes (solo procesamiento de retroalimentación)

---

**Última actualización:** Enero 2025
