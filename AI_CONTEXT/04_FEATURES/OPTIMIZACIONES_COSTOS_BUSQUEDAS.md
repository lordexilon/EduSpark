# Optimizaciones de Costos y Búsquedas - Enero 2025

## 📋 Resumen Ejecutivo

Sistema completo de optimización implementado para:
- ✅ Control de costos por usuario (límites diarios y mensuales)
- ✅ Búsquedas optimizadas (prioriza texto completo, filtra ruido)
- ✅ Caché mejorado (30 min respuestas, 24h embeddings)
- ✅ Reducción de tokens (5 chunks iniciales, 500 caracteres por chunk)
- ✅ Filtrado de ruido y basura en resultados
- ✅ **Limpieza OCR mejorada** (elimina ruido preservando contenido válido)
- ✅ **Extracción de contenido relevante** (busca palabras clave en lugar de solo inicio)

**Ahorro estimado:** 50-70% en costos de consultas

---

## 🗄️ Scripts SQL Implementados

### 1. `sql_scripts/create_user_cost_limits.sql`

Sistema completo de límites por usuario:

**Tabla:** `user_query_limits`
- Límites diarios: 50 consultas, $0.05/día
- Límites mensuales: 1000 consultas, $1.00/mes
- Contadores automáticos con reset diario

**Funciones:**
- `check_user_query_limits()` - Verifica límites antes de consulta
- `update_user_query_usage()` - Actualiza contadores después de consulta
- `reset_monthly_limits()` - Resetea límites mensuales (ejecutar día 1)

**Vista:** `v_user_usage_summary` - Monitoreo de uso por usuario

### 2. `sql_scripts/improve_search_with_noise_filtering.sql`

Búsquedas mejoradas con filtrado de ruido:

**Funciones nuevas:**
- `search_course_content_chunks_text_clean()` - Texto completo con filtrado
- `search_course_content_chunks_hybrid_clean()` - Híbrida con filtrado
- `mark_chunk_as_noise()` - Marcar chunks como ruido manualmente
- `detect_and_mark_noise_chunks()` - Detección automática de ruido

**Filtros implementados:**
- Contenido mínimo: 50 caracteres
- Máximo 30% caracteres especiales
- Máximo 50% números
- Excluye chunks marcados como ruido
- Score de relevancia mínimo

---

## 🔧 Modificaciones en Código

### `audio-tutor/services/ragService.ts`

#### Optimizaciones Implementadas:

1. **Verificación de límites ANTES de procesar**
   ```typescript
   // Verifica límites antes de cualquier procesamiento
   const limitsCheck = await supabase.rpc('check_user_query_limits', {...});
   if (!limitsCheck.can_proceed) {
     return { error: limitsCheck.message };
   }
   ```

2. **Caché mejorado**
   - Respuestas: 30 minutos TTL, 500 entradas máximo
   - Embeddings: 24 horas TTL, 500 entradas máximo
   - Verificación PRIMERO (ahorra todo el procesamiento)

3. **Priorización de búsqueda de texto completo**
   - PRIMERO: Intenta `search_course_content_chunks_text_clean()` (GRATIS)
   - SOLO si no hay resultados: Usa embeddings ($0.00001)
   - Caché de embeddings para consultas similares

4. **Reducción de chunks y tokens**
   - Chunks iniciales: 5 (aumentado de 3 para mejor cobertura)
   - Chunks expandidos: hasta 10 adicionales (solo si se detecta rango de páginas)
   - Tokens de salida: Aumentado de 800 a 2048 (para respuestas más completas)
   - Ahorro estimado: 20-30% en tokens vs. búsqueda completa

5. **Limpieza OCR mejorada** (Nuevo - Enero 2025)
   - Función `cleanOCRText()` en TypeScript y SQL
   - Elimina secuencias repetitivas de números (ej: "77777777")
   - Elimina secuencias repetitivas de caracteres especiales
   - Preserva contenido válido (texto con letras)
   - Script SQL: `limpiar_chunks_ocr_existentes.sql` para limpiar chunks existentes

6. **Extracción de contenido relevante** (Nuevo - Enero 2025)
   - Función `extractRelevantContent()` en `ragService.ts`
   - Busca palabras clave de la consulta en el chunk (no solo muestra inicio)
   - Muestra contexto alrededor de palabras clave encontradas (200 chars antes, 300 después)
   - Crucial cuando hay ruido OCR al inicio del chunk
   - Aumenta probabilidad de encontrar información relevante

7. **Filtrado de ruido**
   - Usa funciones SQL con filtrado automático
   - Excluye contenido muy corto o con demasiados caracteres especiales
   - Filtra chunks marcados como ruido

8. **Actualización de contadores**
   - Actualiza límites después de cada consulta
   - Registra costos reales en `ai_usage_tracking`
   - Actualiza contadores en `user_query_limits`

---

## 📊 Impacto en Costos

### Antes de Optimizaciones:
- Consulta promedio: ~$0.00075
- Con 100 usuarios activos: ~$75/mes (100 consultas/usuario/mes)
- Sin límites: Riesgo de exceder presupuesto

### Después de Optimizaciones (v8):
- Consulta promedio: ~$0.0003-0.0004 (50-60% reducción)
- Con caché: ~30-40% consultas sin costo
- Con límites: Máximo $1/usuario/mes = $100/mes para 100 usuarios
- **Ahorro total: 50-70%**

### Después de Búsqueda Híbrida (v9):
- Consulta simple: ~$0.0002-0.0003 (sin cambio)
- Consulta compleja (con rangos de páginas): ~$0.0003-0.0005 (ligero aumento)
- **Ventaja:** Cobertura completa del documento sin buscar en todos los chunks
- **Ahorro vs. búsqueda completa:** 85-95% (vs. $0.005 por consulta completa)

---

## 🚀 Cómo Usar

### 1. Ejecutar Scripts SQL

```sql
-- En Supabase SQL Editor
\i sql_scripts/create_user_cost_limits.sql
\i sql_scripts/improve_search_with_noise_filtering.sql
```

### 2. Verificar Funciones

```sql
-- Probar verificación de límites
SELECT * FROM check_user_query_limits(
  'user-uuid-here'::uuid,
  0.001::numeric
);

-- Probar búsqueda mejorada
SELECT * FROM search_course_content_chunks_text_clean(
  'tu consulta aquí',
  1, -- course_id
  3, -- result_limit
  0.1 -- min_relevance
);
```

### 3. Monitorear Uso

```sql
-- Ver resumen de uso por usuario
SELECT * FROM v_user_usage_summary
WHERE status != 'ok'
ORDER BY monthly_cost_used DESC;

-- Ver costos diarios
SELECT 
  DATE(created_at) as date,
  COUNT(*) as queries,
  SUM(total_cost) as total_cost
FROM ai_usage_tracking
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 4. Detectar y Marcar Ruido

```sql
-- Detectar ruido automáticamente en un curso
SELECT detect_and_mark_noise_chunks(1); -- course_id

-- Marcar chunk específico como ruido
SELECT mark_chunk_as_noise('chunk-uuid-here'::uuid);
```

---

## ⚙️ Configuración de Límites

### Límites por Defecto:
- Diarios: 50 consultas, $0.05
- Mensuales: 1000 consultas, $1.00

### Personalizar Límites:

```sql
-- Para un usuario específico
UPDATE user_query_limits
SET 
  daily_queries = 100,
  daily_cost_limit = 0.10,
  monthly_queries = 2000,
  monthly_cost_limit = 2.00
WHERE user_id = 'user-uuid-here'::uuid;
```

---

## 🔍 Filtrado de Ruido

### Criterios de Ruido:
1. Contenido < 50 caracteres
2. > 30% caracteres especiales
3. > 50% números
4. Secuencias repetitivas (ej: "77777777")
5. Chunks marcados manualmente como ruido

### Detección Automática:

```sql
-- Detectar ruido en todos los cursos
SELECT 
  course_id,
  detect_and_mark_noise_chunks(course_id) as chunks_marcados
FROM courses
WHERE id IN (SELECT DISTINCT course_id FROM course_content_chunks);
```

---

## 📈 Monitoreo y Alertas

### Vista de Resumen:
```sql
SELECT * FROM v_user_usage_summary
WHERE status IN ('daily_limit_reached', 'monthly_limit_reached');
```

### Alertas Recomendadas:
- Alerta cuando usuario alcance 80% de límite diario
- Alerta cuando costo mensual total alcance $150 (75% de $200)
- Reporte diario de costos

---

## 🎯 Próximos Pasos

1. ✅ Sistema de límites implementado
2. ✅ Búsquedas optimizadas implementadas
3. ✅ Caché mejorado implementado
4. ⏳ Dashboard de monitoreo (opcional)
5. ⏳ Alertas automáticas (opcional)
6. ⏳ Limpieza periódica de ruido (opcional)

---

## 📝 Notas Importantes

1. **Reset Automático:** Los límites diarios se resetean automáticamente cada día
2. **Reset Mensual:** Ejecutar `reset_monthly_limits()` el día 1 de cada mes (o automatizar con cron)
3. **Caché:** Se limpia automáticamente cuando alcanza el tamaño máximo (FIFO)
4. **Filtrado de Ruido:** Los chunks marcados como ruido se excluyen de todas las búsquedas
5. **Compatibilidad:** Las funciones nuevas son compatibles con el código existente

---

## 🔗 Archivos Relacionados

- `sql_scripts/create_user_cost_limits.sql` - Sistema de límites
- `sql_scripts/improve_search_with_noise_filtering.sql` - Búsquedas mejoradas
- `sql_scripts/limpiar_chunks_ocr_existentes.sql` - Limpieza OCR de chunks existentes
- `audio-tutor/services/ragService.ts` - Servicio RAG optimizado (con `extractRelevantContent`)
- `functions/processFileJob/index.ts` - Función `cleanOCRText()` para procesamiento de archivos
- `services/aiUsageService.ts` - Tracking de uso
- `audio-tutor/services/tokenMonitoringService.ts` - Monitoreo de tokens

---

## 🆕 Mejoras Recientes (Enero 2025)

### Limpieza OCR Mejorada

**Problema:** Chunks con ruido OCR mezclado con contenido válido (ej: "3 7 3 2 3 22... Richard Dedekind...")

**Solución:**
1. Función `cleanOCRText()` en TypeScript y SQL
2. Elimina secuencias repetitivas preservando contenido válido
3. Script SQL para limpiar chunks existentes
4. Función `extractRelevantContent()` que busca palabras clave en lugar de solo mostrar inicio

**Impacto:**
- ✅ Encuentra información relevante incluso con ruido OCR
- ✅ Mejora precisión de búsquedas
- ✅ No aumenta costos (solo procesamiento local)

---

**Última actualización:** Enero 2025  
**Estado:** ✅ Implementado y listo para usar

