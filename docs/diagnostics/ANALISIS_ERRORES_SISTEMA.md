# 🔍 Análisis de Errores del Sistema EduSpark

## 📋 Resumen Ejecutivo

Fecha: 2025-11-22
Estado: Sistema funcional con 3 problemas críticos identificados

---

## ❌ ERRORES CRÍTICOS IDENTIFICADOS

### 1. **Error de Timeout en Búsqueda RAG** (CRÍTICO - Alto Impacto)

**Síntoma:**
```
POST https://mckfscukxcqwntpjagar.supabase.co/rest/v1/rpc/search_course_content_chunks_text_clean 500 (Internal Server Error)

Error: {
  code: '57014',
  message: 'canceling statement due to statement timeout'
}
```

**Frecuencia:** Ocurre en CADA consulta al tutor

**Impacto:**
- ⚠️ Las búsquedas de texto completo fallan SIEMPRE
- ⚠️ El sistema hace fallback a búsqueda híbrida (también falla)
- ⚠️ Finalmente usa solo embeddings vectoriales (más lento y costoso)
- ⚠️ Experiencia de usuario degradada (respuestas más lentas)

**Causa Raíz:**
Las funciones RPC de Supabase están excediendo el timeout configurado. Posibles causas:
1. Índices de base de datos faltantes o ineficientes
2. Tablas muy grandes sin optimización
3. Queries SQL mal optimizados
4. Timeout de Supabase demasiado bajo

**Funciones Afectadas:**
- `search_course_content_chunks_text_clean`
- `search_course_content_chunks_hybrid_clean`

**Solución Propuesta:**
1. Revisar y optimizar índices en la tabla `course_content_chunks`
2. Analizar el query SQL de las funciones RPC
3. Aumentar el timeout de statement en Supabase
4. Implementar caché para búsquedas frecuentes

---

### 2. **Error de API de Text-to-Speech** (MEDIO - Funcionalidad Deshabilitada)

**Síntoma:**
```
POST https://texttospeech.googleapis.com/v1/text:synthesize 403 (Forbidden)

Error: Cloud Text-to-Speech API has not been used in project 468517556859 
before or it is disabled.
```

**Frecuencia:** Ocurre en CADA intento de síntesis de voz

**Impacto:**
- ❌ La funcionalidad de voz del tutor NO funciona
- ✅ El tutor sigue respondiendo por texto (funcionalidad core intacta)
- ⚠️ Experiencia de usuario reducida (sin audio)

**Causa Raíz:**
La API de Google Cloud Text-to-Speech no está habilitada en el proyecto de Google Cloud.

**Solución:**
1. Ir a: https://console.developers.google.com/apis/api/texttospeech.googleapis.com/overview?project=468517556859
2. Hacer clic en "ENABLE"
3. Esperar 2-3 minutos para propagación
4. Recargar la aplicación

**Estado del Código:**
✅ El código de integración está CORRECTO
✅ El mapeo de voces funciona
✅ La importación del servicio está corregida
❌ Solo falta habilitar la API

---

### 3. **Error de Acceso a Mensajes** (BAJO - No Crítico)

**Síntoma:**
```
Fetch failed loading: HEAD "https://mckfscukxcqwntpjagar.supabase.co/rest/v1/messages?
select=*&conversation_id=eq.35ce3332-ab0e-4acd-9158-8c194a383054&
is_read=eq.false&sender_id=neq.b72dabe7-9ace-4e50-aa17-f770c5c94c0e"
```

**Frecuencia:** Ocurre periódicamente (polling)

**Impacto:**
- ⚠️ Sistema de mensajes no leídos puede no funcionar correctamente
- ✅ No afecta funcionalidad core del tutor
- ⚠️ Posible problema de permisos RLS en tabla `messages`

**Causa Raíz:**
Posible problema de Row Level Security (RLS) en la tabla `messages` o la tabla no existe.

**Solución Propuesta:**
1. Verificar que la tabla `messages` existe
2. Revisar políticas RLS de la tabla
3. Verificar que el usuario tiene permisos de lectura

---

## ✅ FUNCIONALIDADES QUE SÍ FUNCIONAN

### Sistema de Agentes
- ✅ Inicialización del coordinador
- ✅ Creación de conversaciones
- ✅ Contexto pedagógico
- ✅ Envío y recepción de mensajes

### RAG (Retrieval Augmented Generation)
- ✅ Generación de respuestas con Gemini
- ✅ Búsqueda vectorial (embeddings)
- ✅ Integración de fuentes
- ✅ Tracking de tokens y costos

### Base de Datos
- ✅ Lectura de cursos
- ✅ Lectura de unidades y sesiones
- ✅ Lectura de materiales
- ✅ Actualización de conversaciones
- ✅ Tracking de interacciones

### UI/UX
- ✅ Renderizado de mensajes
- ✅ Auto-scroll
- ✅ Estados de carga
- ✅ Manejo de errores graceful

---

## 📊 MÉTRICAS DE RENDIMIENTO

### Tiempos de Respuesta (Última Consulta)
```
Inicialización del sistema: ~2-3 segundos
Búsqueda RAG (con timeouts): ~26 segundos
  - Text search: TIMEOUT (>10s)
  - Hybrid search: TIMEOUT (>10s)
  - Vector search: ~5 segundos
Generación con Gemini: ~1-2 segundos
Total tiempo de respuesta: ~27-30 segundos
```

**Objetivo:** <5 segundos
**Actual:** ~27-30 segundos
**Brecha:** 22-25 segundos (principalmente por timeouts)

### Costos por Interacción
```
Tokens de entrada: 762
Tokens de salida: 283
Costo total: $0.000142 USD
```
**Proyección mensual (1000 estudiantes, 50 interacciones/mes):**
- Total interacciones: 50,000
- Costo estimado: $7.10 USD/mes
- ✅ Muy económico

---

## 🎯 PRIORIZACIÓN DE SOLUCIONES

### PRIORIDAD 1 - CRÍTICO (Resolver YA)
**Error de Timeout en RAG**
- **Impacto:** Alto - Afecta TODAS las consultas
- **Complejidad:** Media - Requiere optimización de DB
- **Tiempo estimado:** 2-4 horas

**Acciones:**
1. Analizar queries SQL de las funciones RPC
2. Crear/optimizar índices en `course_content_chunks`
3. Aumentar timeout de Supabase si es necesario
4. Implementar caché de búsquedas

### PRIORIDAD 2 - IMPORTANTE (Resolver Pronto)
**API de Text-to-Speech**
- **Impacto:** Medio - Funcionalidad deshabilitada
- **Complejidad:** Baja - Solo habilitar API
- **Tiempo estimado:** 5 minutos + 2 min espera

**Acciones:**
1. Habilitar Cloud Text-to-Speech API en Google Cloud
2. Esperar propagación
3. Probar funcionalidad

### PRIORIDAD 3 - BAJA (Revisar Después)
**Error de Mensajes**
- **Impacto:** Bajo - No afecta core
- **Complejidad:** Baja - Verificar RLS
- **Tiempo estimado:** 30 minutos

**Acciones:**
1. Verificar existencia de tabla `messages`
2. Revisar políticas RLS
3. Ajustar permisos si es necesario

---

## 🔧 RECOMENDACIONES TÉCNICAS

### Optimización de Base de Datos

#### 1. Índices Recomendados
```sql
-- Índice para búsqueda de texto completo
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_text_search 
ON course_content_chunks USING gin(to_tsvector('spanish', content));

-- Índice para filtrado por curso
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_type 
ON course_content_chunks(course_id, content_type);
```

#### 2. Análisis de Queries
```sql
-- Analizar plan de ejecución de la función problemática
EXPLAIN ANALYZE 
SELECT * FROM search_course_content_chunks_text_clean(
  'ejemplos', -- query
  1,          -- course_id
  10          -- limit
);
```

#### 3. Configuración de Timeout
```sql
-- Aumentar timeout para funciones específicas
ALTER FUNCTION search_course_content_chunks_text_clean 
SET statement_timeout = '30s';

ALTER FUNCTION search_course_content_chunks_hybrid_clean 
SET statement_timeout = '30s';
```

### Implementación de Caché

```typescript
// services/ragCacheService.ts
const searchCache = new Map<string, {
  result: any;
  timestamp: number;
  ttl: number;
}>();

export function getCachedSearch(query: string, courseId: string) {
  const key = `${courseId}:${query}`;
  const cached = searchCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.result;
  }
  
  return null;
}

export function setCachedSearch(
  query: string, 
  courseId: string, 
  result: any, 
  ttlMs: number = 300000 // 5 minutos
) {
  const key = `${courseId}:${query}`;
  searchCache.set(key, {
    result,
    timestamp: Date.now(),
    ttl: ttlMs
  });
}
```

### Monitoreo y Logging

```typescript
// Agregar métricas de rendimiento
console.time('RAG_Search_Total');
console.time('RAG_Search_TextSearch');
// ... búsqueda de texto
console.timeEnd('RAG_Search_TextSearch');

console.time('RAG_Search_VectorSearch');
// ... búsqueda vectorial
console.timeEnd('RAG_Search_VectorSearch');
console.timeEnd('RAG_Search_Total');
```

---

## 📈 MÉTRICAS DE ÉXITO

### Objetivos Post-Optimización

| Métrica | Actual | Objetivo | Mejora |
|---------|--------|----------|--------|
| Tiempo de respuesta | 27-30s | <5s | 82-85% |
| Tasa de timeout | 100% | 0% | 100% |
| Costo por consulta | $0.000142 | $0.000142 | 0% (ya óptimo) |
| Funcionalidad de voz | 0% | 100% | 100% |

---

## 🚀 PLAN DE ACCIÓN INMEDIATO

### Día 1 (HOY)
1. ✅ Analizar y documentar errores (COMPLETADO)
2. ⏳ Revisar funciones RPC en Supabase
3. ⏳ Crear índices de base de datos
4. ⏳ Probar optimizaciones

### Día 2
1. ⏳ Habilitar Google Cloud TTS API
2. ⏳ Probar funcionalidad de voz
3. ⏳ Implementar caché de búsquedas
4. ⏳ Monitorear métricas

### Día 3
1. ⏳ Revisar tabla de mensajes
2. ⏳ Ajustar RLS si es necesario
3. ⏳ Documentar soluciones
4. ⏳ Testing completo

---

## 📝 NOTAS ADICIONALES

### Observaciones Positivas
- ✅ El sistema maneja errores gracefully (no se rompe)
- ✅ El fallback a búsqueda vectorial funciona
- ✅ Los costos son muy bajos
- ✅ La generación de respuestas con Gemini es rápida
- ✅ El tracking de tokens funciona correctamente

### Áreas de Mejora Futura
- Implementar retry logic con backoff exponencial
- Agregar circuit breaker para APIs externas
- Implementar rate limiting
- Agregar más logging estructurado
- Crear dashboard de métricas en tiempo real

---

## 🔗 Enlaces Útiles

- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing)
- [Gemini API Limits](https://ai.google.dev/gemini-api/docs/quota)

---

**Última actualización:** 2025-11-22 14:24:21
**Autor:** Análisis Automático del Sistema
**Estado:** Documento Vivo - Actualizar según progreso
