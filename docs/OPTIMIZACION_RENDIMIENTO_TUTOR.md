# Optimización de Rendimiento del Tutor AI

## Problema Identificado

El tutor AI tenía dos problemas principales de rendimiento:

1. **Delay entre respuesta y visualización**: La respuesta se generaba en ~24 segundos pero tardaba ~2 minutos en aparecer en el chat
2. **Búsqueda RAG lenta**: Las consultas a Supabase tomaban demasiado tiempo

## Optimizaciones Implementadas

### 1. Procesos No Bloqueantes ✅

**Problema**: `updateStudentProgress()` y `addMessage()` estaban bloqueando la respuesta al usuario.

**Solución**: 
- Convertidos a ejecución asíncrona en background
- La respuesta se muestra inmediatamente sin esperar estos procesos

**Código modificado**: `audio-tutor/agents/AgentCoordinator.ts`
```typescript
// Antes (bloqueante):
await this.updateStudentProgress(userMessage, personalizedResponse);

// Después (no bloqueante):
this.updateStudentProgress(userMessage, personalizedResponse).catch(err => {
  console.warn('Error actualizando progreso del estudiante:', err);
});
```

### 2. Búsqueda RAG Optimizada ✅

**Problema**: Múltiples consultas secuenciales a Supabase y filtrado en JavaScript.

**Soluciones implementadas**:

#### a) Búsqueda de texto completo en PostgreSQL
- Usa `ILIKE` para filtrar directamente en la base de datos (más rápido)
- Reduce la cantidad de datos transferidos desde Supabase
- Filtra por palabras clave relevantes antes de procesar en JavaScript

#### b) Consultas paralelas
- La búsqueda de títulos de materiales se ejecuta en paralelo
- No bloquea el procesamiento de chunks

#### c) Optimización de palabras clave
- Extrae solo las 5 palabras más relevantes
- Reduce umbral de longitud mínima de 3 a 2 caracteres para capturar más términos

**Código modificado**: `audio-tutor/services/ragService.ts`

## Mejoras Adicionales Recomendadas

### 1. Índice de Texto Completo en Supabase (Recomendado)

Para búsquedas aún más rápidas, crear un índice GIN en PostgreSQL:

```sql
-- Crear índice de texto completo para búsquedas rápidas
CREATE INDEX idx_course_content_chunks_content_gin 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- Función de búsqueda optimizada
CREATE OR REPLACE FUNCTION search_course_content_chunks_text(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    ts_rank(to_tsvector('spanish', ccc.content), plainto_tsquery('spanish', search_query)) as rank
  FROM course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
    AND to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
```

**Uso en el código**:
```typescript
const { data: chunks, error } = await supabase.rpc(
  'search_course_content_chunks_text',
  {
    search_query: query,
    course_id_param: courseIdInt,
    result_limit: 10
  }
);
```

### 2. Base de Datos Documental (Futuro)

Para consultas de texto completo muy rápidas, considerar:

#### Opción A: Elasticsearch
- **Ventajas**: Búsqueda de texto completo extremadamente rápida, escalable
- **Desventajas**: Requiere infraestructura adicional, sincronización con Supabase
- **Uso**: Para búsquedas complejas, autocompletado, sugerencias

#### Opción B: Algolia
- **Ventajas**: Muy rápido, fácil de integrar, buena para búsquedas en tiempo real
- **Desventajas**: Costo adicional, requiere sincronización
- **Uso**: Búsquedas instantáneas, autocompletado

#### Opción C: PostgreSQL Full-Text Search (Recomendado primero)
- **Ventajas**: Ya está disponible en Supabase, sin infraestructura adicional
- **Desventajas**: Puede ser más lento que Elasticsearch para grandes volúmenes
- **Uso**: Mejora inmediata sin cambios arquitectónicos

### 3. Caché de Respuestas (Futuro)

Implementar caché para consultas frecuentes:

```typescript
// Ejemplo de caché simple
const queryCache = new Map<string, { response: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getCachedOrFetch(query: string, fetchFn: () => Promise<any>) {
  const cacheKey = query.toLowerCase().trim();
  const cached = queryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  
  const response = await fetchFn();
  queryCache.set(cacheKey, { response, timestamp: Date.now() });
  return response;
}
```

### 4. Streaming de Respuestas (Futuro)

Para mostrar la respuesta mientras se genera:

```typescript
// Usar Gemini streaming API
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const result = await model.generateContentStream({ contents: [{ parts: [{ text: prompt }] }] });

for await (const chunk of result.stream) {
  const text = chunk.text();
  // Enviar chunk al frontend inmediatamente
  onChunk(text);
}
```

## Resultados Esperados

Con las optimizaciones implementadas:

- **Tiempo de respuesta visible**: Reducción de ~2 minutos a ~24-30 segundos
- **Búsqueda RAG**: Reducción de ~20-24 segundos a ~10-15 segundos
- **Experiencia de usuario**: Respuesta inmediata sin esperar procesos de background

## Próximos Pasos

1. ✅ **Completado**: Procesos no bloqueantes
2. ✅ **Completado**: Optimización de búsqueda RAG
3. ⏳ **Pendiente**: Implementar índice de texto completo en Supabase
4. ⏳ **Pendiente**: Monitorear tiempos de respuesta en producción
5. ⏳ **Futuro**: Evaluar base de datos documental si es necesario

## Monitoreo

Para verificar las mejoras, revisar en la consola del navegador:

```
RAGService - Chunks encontrados directamente: X
RAGService - Títulos de materiales obtenidos: X
AgentCoordinator - Respuesta del RAG recibida: { answerLength, confidence, sourcesCount }
```

El tiempo total debería reducirse significativamente.

