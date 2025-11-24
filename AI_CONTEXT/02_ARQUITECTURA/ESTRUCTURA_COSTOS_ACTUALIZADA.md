# Estructura de Costos - EduSpark RAG System
## Actualización: Enero 2025

## 📊 Modelos y Precios

### Google Gemini API (Precios por 1M tokens)

| Modelo | Input (1M tokens) | Output (1M tokens) | Uso |
|--------|-------------------|---------------------|-----|
| `gemini-2.5-flash` | $0.075 | $0.30 | **Modelo principal** (recomendado) |
| `gemini-1.5-flash` | $0.075 | $0.30 | Alternativa compatible |
| `gemini-1.5-pro` | $1.25 | $5.00 | Solo para consultas complejas |

**Configuración actual:** `gemini-2.5-flash` (mejor balance costo/rendimiento)

---

## 💰 Costos por Tipo de Operación

### 1. Búsqueda de Texto Completo (PostgreSQL)
- **Costo:** $0.00 (GRATIS)
- **Uso:** Primera opción para todas las búsquedas
- **Función:** `search_course_content_chunks_text_clean()`
- **Ventaja:** Sin costo, muy rápida

### 2. Generación de Embeddings
- **Costo:** ~$0.00001 por consulta
- **Uso:** Solo si búsqueda de texto completo no encuentra resultados
- **Caché:** 24 horas (evita regenerar embeddings similares)
- **Función:** `embedContent()` de Gemini API

### 3. Generación de Respuestas
- **Costo:** Variable según tokens
  - Input: $0.075 por 1M tokens
  - Output: $0.30 por 1M tokens
- **Promedio por consulta:** ~$0.0002-0.0004
- **Caché:** 30 minutos (respuestas similares)

### 4. Procesamiento de Archivos (OCR)
- **Costo:** $0.00 (procesamiento local)
- **Función:** `cleanOCRText()` en TypeScript/SQL
- **Nota:** No genera costos de API, solo procesamiento

---

## 📈 Costos Estimados por Escenario

### Consulta Simple (Sin Caché)
1. Búsqueda texto completo: $0.00
2. Generación respuesta: ~$0.0002-0.0003
3. **Total:** ~$0.0002-0.0003

### Consulta Simple (Con Caché)
1. Búsqueda texto completo: $0.00
2. Respuesta desde caché: $0.00
3. **Total:** $0.00

### Consulta Compleja (Con Embeddings)
1. Búsqueda texto completo: $0.00 (no encuentra)
2. Generación embedding: ~$0.00001
3. Generación respuesta: ~$0.0003-0.0005
4. **Total:** ~$0.0003-0.0005

### Consulta Compleja (Con Rangos de Páginas)
1. Búsqueda texto completo: $0.00
2. Expansión de chunks: $0.00 (solo SQL)
3. Generación respuesta: ~$0.0004-0.0006
4. **Total:** ~$0.0004-0.0006

---

## 🎯 Límites por Usuario

### Límites Diarios
- **Consultas:** 50 consultas/día
- **Costo:** $0.05/día máximo
- **Reset:** Automático cada día

### Límites Mensuales
- **Consultas:** 1000 consultas/mes
- **Costo:** $1.00/mes máximo
- **Reset:** Manual (ejecutar `reset_monthly_limits()` día 1)

### Personalización
```sql
-- Ejemplo: Aumentar límites para usuario específico
UPDATE user_query_limits
SET 
  daily_queries = 100,
  daily_cost_limit = 0.10,
  monthly_queries = 2000,
  monthly_cost_limit = 2.00
WHERE user_id = 'user-uuid-here'::uuid;
```

---

## 📊 Proyección de Costos

### Escenario Conservador (50 usuarios activos)
- Consultas por usuario: 50/mes
- Total consultas: 2,500/mes
- Costo promedio: $0.0003/consulta
- **Costo total:** ~$0.75/mes
- **Con límites:** Máximo $50/mes (50 usuarios × $1.00)

### Escenario Moderado (100 usuarios activos)
- Consultas por usuario: 100/mes
- Total consultas: 10,000/mes
- Costo promedio: $0.0003/consulta
- **Costo total:** ~$3.00/mes
- **Con límites:** Máximo $100/mes (100 usuarios × $1.00)

### Escenario Alto (200 usuarios activos)
- Consultas por usuario: 100/mes
- Total consultas: 20,000/mes
- Costo promedio: $0.0003/consulta
- **Costo total:** ~$6.00/mes
- **Con límites:** Máximo $200/mes (200 usuarios × $1.00)

---

## ⚡ Optimizaciones Implementadas

### 1. Priorización de Búsqueda Gratuita
- **Impacto:** 80-90% de consultas sin costo de embeddings
- **Ahorro:** ~$0.00001 por consulta evitada

### 2. Caché de Respuestas (30 min)
- **Impacto:** 30-40% de consultas desde caché
- **Ahorro:** ~$0.0003 por consulta cacheada

### 3. Caché de Embeddings (24h)
- **Impacto:** Reduce regeneración de embeddings
- **Ahorro:** ~$0.00001 por embedding cacheado

### 4. Reducción de Tokens
- **Chunks:** 5 iniciales (vs. 10-15 antes)
- **Caracteres por chunk:** 500 (vs. 1000 antes)
- **Ahorro:** 20-30% en tokens de input

### 5. Limpieza OCR (Sin Costo)
- **Impacto:** Mejora precisión sin aumentar costos
- **Ahorro:** Indirecto (menos consultas fallidas)

### 6. Extracción de Contenido Relevante
- **Impacto:** Encuentra información relevante más rápido
- **Ahorro:** Indirecto (menos consultas repetidas)

---

## 📈 Monitoreo de Costos

### Tablas de Seguimiento

1. **`ai_usage_tracking`**
   - Registra cada consulta
   - Tokens input/output
   - Costo real
   - Modelo usado

2. **`user_query_limits`**
   - Límites por usuario
   - Contadores diarios/mensuales
   - Estado de límites

3. **`v_user_usage_summary`** (Vista)
   - Resumen de uso por usuario
   - Estado de límites
   - Costos acumulados

### Consultas Útiles

```sql
-- Costos diarios últimos 7 días
SELECT 
  DATE(created_at) as date,
  COUNT(*) as queries,
  SUM(total_cost) as total_cost,
  AVG(total_cost) as avg_cost
FROM ai_usage_tracking
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Usuarios cerca de límites
SELECT * FROM v_user_usage_summary
WHERE status IN ('daily_limit_reached', 'monthly_limit_reached', 'approaching_daily_limit', 'approaching_monthly_limit')
ORDER BY monthly_cost_used DESC;

-- Costos por modelo
SELECT 
  model,
  COUNT(*) as queries,
  SUM(total_cost) as total_cost,
  AVG(total_cost) as avg_cost
FROM ai_usage_tracking
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY model
ORDER BY total_cost DESC;
```

---

## 🔧 Configuración de Precios

**Archivo:** `audio-tutor/services/tokenMonitoringService.ts`

```typescript
const GEMINI_PRICING = {
  'gemini-2.5-flash': {
    input: 0.075,   // $0.075 por 1M tokens de entrada
    output: 0.30    // $0.30 por 1M tokens de salida
  },
  // ...
};
```

**Actualizar precios:** Modificar constantes en `tokenMonitoringService.ts`

---

## 📝 Notas Importantes

1. **Búsqueda de texto completo es GRATIS:** Siempre se intenta primero
2. **Embeddings solo si es necesario:** Solo si búsqueda de texto falla
3. **Caché reduce costos significativamente:** 30-40% de consultas sin costo
4. **Límites protegen presupuesto:** Máximo $1/usuario/mes por defecto
5. **Limpieza OCR no genera costos:** Solo procesamiento local
6. **Extracción de contenido relevante:** Mejora precisión sin aumentar costos

---

## 🎯 Recomendaciones

1. **Monitorear costos diarios:** Revisar `ai_usage_tracking` regularmente
2. **Ajustar límites según necesidad:** Personalizar por usuario si es necesario
3. **Optimizar caché:** Aumentar TTL si hay muchas consultas similares
4. **Usar búsqueda de texto completo:** Priorizar sobre embeddings
5. **Limpiar chunks periódicamente:** Ejecutar script de limpieza OCR cuando sea necesario

---

**Última actualización:** Enero 2025  
**Estado:** ✅ Implementado y monitoreado

