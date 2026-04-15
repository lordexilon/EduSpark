# Corrección: Errores de Embeddings en RAG Worker

**Fecha:** Enero 2025  
**Estado:** ✅ Completado  
**Prioridad:** Alta

## Resumen Ejecutivo

Se implementó retry logic con exponential backoff para manejar errores de red y API al generar embeddings con Google Generative AI. Esto resuelve el problema de chunks que fallan debido a errores temporales de conectividad (`fetch failed`).

## Problema Identificado

### Error Reportado

```
[RAG Worker] ⚠️ Chunk 7020 falló: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent: fetch failed
```

### Causas Posibles

1. **Errores de red temporales:**
   - Timeouts de conexión
   - Pérdida de conectividad momentánea
   - Problemas de latencia

2. **Rate limiting de la API:**
   - Google Generative AI puede limitar requests por minuto
   - Procesamiento de muchos chunks en paralelo puede exceder límites

3. **Problemas de infraestructura:**
   - Cloud Run puede tener problemas de red intermitentes
   - Timeouts en funciones de larga duración

### Impacto

- Chunks individuales fallan sin reintento
- El procesamiento continúa pero con chunks faltantes
- Reduce la calidad de las búsquedas RAG
- Requiere reprocesamiento manual de archivos completos

---

## Solución Implementada

### Retry Logic con Exponential Backoff

**Archivo:** `functions/rag-worker/index.js`

**Cambios:**

1. **Función helper `generateEmbeddingWithRetry`:**
   - Intenta generar el embedding hasta 3 veces
   - Detecta errores de red (`fetch failed`, `ECONNRESET`, `ETIMEDOUT`, `timeout`, `network`)
   - Aplica exponential backoff: 2s, 4s, 8s entre intentos
   - Solo reintenta errores de red, no errores de API (rate limit, auth, etc.)

2. **Mejoras en logging:**
   - Logs informativos cuando un chunk se recupera después de un reintento
   - Logs de error más detallados con número de intento

**Código Implementado:**

```javascript
// Función helper para generar embedding con retry
const generateEmbeddingWithRetry = async (chunk, chunkIndex, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.embedContent(chunk);
            if (attempt > 1) {
                console.log(`[RAG Worker] ✅ Chunk ${chunkIndex + 1} exitoso en intento ${attempt}`);
            }
            return {
                chunkIndex,
                chunk,
                embedding: result.embedding.values,
                success: true
            };
        } catch (embeddingError) {
            lastError = embeddingError;
            const errorMsg = embeddingError.message || embeddingError.toString();
            const isNetworkError = errorMsg.includes('fetch failed') || 
                                 errorMsg.includes('ECONNRESET') ||
                                 errorMsg.includes('ETIMEDOUT') ||
                                 errorMsg.includes('timeout') ||
                                 errorMsg.includes('network');
            
            if (attempt < maxRetries && isNetworkError) {
                // Exponential backoff: 2^attempt segundos (2s, 4s, 8s)
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`[RAG Worker] ⚠️ Chunk ${chunkIndex + 1} falló (intento ${attempt}/${maxRetries}): ${errorMsg}. Reintentando en ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                // Último intento falló o no es error de red
                console.error(`[RAG Worker] ❌ Chunk ${chunkIndex + 1} falló después de ${attempt} intentos: ${errorMsg}`);
                return {
                    chunkIndex,
                    chunk,
                    embedding: null,
                    success: false,
                    error: errorMsg
                };
            }
        }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    return {
        chunkIndex,
        chunk,
        embedding: null,
        success: false,
        error: lastError?.message || 'Error desconocido después de múltiples intentos'
    };
};
```

---

## Características de la Solución

### 1. Detección Inteligente de Errores

La función detecta automáticamente si un error es de red o de API:

**Errores de red (se reintentan):**
- `fetch failed`
- `ECONNRESET`
- `ETIMEDOUT`
- `timeout`
- `network`

**Errores de API (no se reintentan):**
- Rate limiting (429)
- Autenticación (401, 403)
- Bad request (400)
- Otros errores de API

### 2. Exponential Backoff

- **Intento 1:** Inmediato
- **Intento 2:** Espera 2 segundos
- **Intento 3:** Espera 4 segundos
- **Intento 4:** Espera 8 segundos (si se aumenta maxRetries)

Esto evita saturar la API y da tiempo para que se resuelvan problemas temporales de red.

### 3. Logging Mejorado

- **Advertencia:** Cuando un chunk falla pero se reintentará
- **Éxito:** Cuando un chunk se recupera después de un reintento
- **Error:** Cuando un chunk falla definitivamente después de todos los intentos

---

## Beneficios

1. **Mayor tasa de éxito:**
   - Los errores temporales de red se resuelven automáticamente
   - Reduce la necesidad de reprocesamiento manual

2. **Mejor experiencia:**
   - Los usuarios no necesitan preocuparse por errores temporales
   - El sistema se recupera automáticamente

3. **Mejor logging:**
   - Logs más informativos para debugging
   - Fácil identificar qué chunks se recuperaron vs. los que fallaron definitivamente

4. **Respeto a rate limits:**
   - El exponential backoff ayuda a no saturar la API
   - Reduce la probabilidad de rate limiting

---

## Configuración

### Parámetros Ajustables

- **`maxRetries`:** Número máximo de intentos (default: 3)
- **`EMBEDDING_BATCH_SIZE`:** Tamaño del batch de embeddings (default: 20)

### Ajustar Retries

Si se necesitan más reintentos para archivos muy grandes:

```javascript
return await generateEmbeddingWithRetry(chunk, chunkIndex, 5); // 5 intentos
```

### Ajustar Batch Size

Si hay muchos errores de rate limiting:

```javascript
const EMBEDDING_BATCH_SIZE = 10; // Reducir batch size
```

---

## Verificación

### Logs Esperados

**Caso 1: Éxito en primer intento (sin cambios en logs):**
```
[RAG Worker] Procesando batch de embeddings...
```

**Caso 2: Éxito después de reintento:**
```
[RAG Worker] ⚠️ Chunk 7020 falló (intento 1/3): fetch failed. Reintentando en 2s...
[RAG Worker] ✅ Chunk 7020 exitoso en intento 2
```

**Caso 3: Falla definitiva:**
```
[RAG Worker] ⚠️ Chunk 7020 falló (intento 1/3): fetch failed. Reintentando en 2s...
[RAG Worker] ⚠️ Chunk 7020 falló (intento 2/3): fetch failed. Reintentando en 4s...
[RAG Worker] ❌ Chunk 7020 falló después de 3 intentos: fetch failed
```

### Monitoreo

1. **Verificar tasa de éxito:**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE embedding IS NOT NULL) as exitosos,
     COUNT(*) FILTER (WHERE embedding IS NULL) as fallidos,
     COUNT(*) as total
   FROM chunks
   WHERE metadata->>'file_name' = 'nombre-archivo.pdf';
   ```

2. **Verificar logs de Cloud Run:**
   - Buscar mensajes de reintento
   - Verificar que los chunks se recuperan después de reintentos

---

## Próximos Pasos Recomendados

1. **Monitoreo de tasa de éxito:**
   - Agregar métricas para tracking de éxito/fallo de embeddings
   - Alertas si la tasa de fallo es > 5%

2. **Rate limiting inteligente:**
   - Detectar rate limiting (429) y ajustar batch size automáticamente
   - Implementar circuit breaker si hay muchos errores consecutivos

3. **Queue para chunks fallidos:**
   - Crear una cola para reprocesar chunks que fallaron definitivamente
   - Procesar en background con menor prioridad

4. **Mejoras adicionales:**
   - Implementar health check de la API antes de procesar
   - Agregar timeout configurable para requests de embeddings
   - Implementar fallback a otro modelo si el principal falla

---

## Referencias

- **Archivo modificado:** `functions/rag-worker/index.js`
- **Documentación relacionada:** `AI_CONTEXT/FLUJO_COMPLETO_PROCESAMIENTO_ARCHIVOS.md`
- **API de Google Generative AI:** https://ai.google.dev/api/rest

---

**Última actualización:** Enero 2025  
**Autor:** Sistema de Asistencia AI  
**Revisado por:** Pendiente

