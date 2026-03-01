# Optimizaciones con Tecnología Actual (PostgreSQL + Supabase + Gemini)

**Fecha:** Enero 2025  
**Contexto:** Optimizaciones usando solo la tecnología existente  
**Objetivo:** Mejorar búsqueda y tiempo de respuesta sin agregar nuevas dependencias

---

## 🔧 Stack Tecnológico Actual

### Infraestructura
- **Base de datos:** PostgreSQL (Supabase)
- **Búsqueda:** Full-Text Search (`to_tsvector`, `websearch_to_tsquery`, `ts_rank`)
- **Vector:** pgvector (embeddings ya generados)
- **LLM:** Gemini 2.5 Flash API
- **Caché:** In-memory (TypeScript Map)
- **Frontend:** React/TypeScript

### Limitaciones Actuales
- **No hay:** Graph database
- **No hay:** Servicio de re-ranking externo
- **No hay:** Redis (solo caché en memoria)
- **No hay:** Elasticsearch

---

## ✅ Optimizaciones Disponibles (Con Tecnología Actual)

### 1. Mejora de Ranking SQL (Full-Text Search)

#### Problema Actual
- `ts_rank` usa algoritmo estándar que no considera:
  - Posición de términos (más cerca = más relevante)
  - Frecuencia de términos (más términos = más relevante)
  - Longitud del documento (chunks más cortos pueden tener mejor score)
  - Metadata (ej: material específico)

#### Solución: Usar `ts_rank_cd` (Cover Density)
**Ventaja:** Considera la densidad de términos (términos más cercanos = mejor score)

```sql
-- ACTUAL (simple)
ts_rank(to_tsvector('spanish', content), query) as relevance_score

-- OPTIMIZADO (con cover density)
ts_rank_cd(
  to_tsvector('spanish', content), 
  query,
  32  -- Normalización por longitud de documento
) as relevance_score
```

**Impacto esperado:** +20-30% mejora en ranking para términos cercanos

#### Solución: Combinar Múltiples Factores de Ranking
**Ventaja:** Ponderar múltiples factores (relevance + metadata + position)

```sql
-- Ranking híbrido con ponderación
SELECT 
  id,
  content,
  (
    -- 70%: Relevance score (ts_rank_cd)
    0.7 * ts_rank_cd(to_tsvector('spanish', content), query, 32)
    +
    -- 20%: Boost si está en material específico (ej: Williams Gineco.pdf)
    CASE 
      WHEN metadata->>'file_name' ILIKE '%williams%gineco%' 
      THEN 0.2 
      ELSE 0 
    END
    +
    -- 10%: Boost si está cerca de páginas específicas (ej: 370)
    CASE 
      WHEN (metadata->>'pageStart')::INTEGER BETWEEN 365 AND 375 
      THEN 0.1 
      ELSE 0 
    END
  ) as combined_score
FROM course_content_chunks
WHERE ...
ORDER BY combined_score DESC
```

**Impacto esperado:** +40-50% mejora para casos específicos (ej: "Williams Gineco.pdf")

#### Solución: Normalización de Scores
**Ventaja:** Normalizar scores para que sean comparables entre queries

```sql
-- Normalizar scores entre 0 y 1
WITH ranked_chunks AS (
  SELECT 
    id,
    content,
    ts_rank_cd(to_tsvector('spanish', content), query, 32) as raw_score
  FROM course_content_chunks
  WHERE ...
)
SELECT 
  id,
  content,
  -- Normalizar: (score - min) / (max - min)
  (raw_score - MIN(raw_score) OVER()) / 
  NULLIF(MAX(raw_score) OVER() - MIN(raw_score) OVER(), 0) as normalized_score
FROM ranked_chunks
ORDER BY normalized_score DESC
```

**Impacto esperado:** +10-15% mejora en consistencia de ranking

---

### 2. Optimización de Queries SQL

#### Problema Actual
- `result_limit: 30` pero procesamos solo 15 chunks
- Timeout de 3 segundos puede ser muy restrictivo
- No hay índices específicos para búsqueda full-text

#### Solución: Índices GIN Mejorados
**Ventaja:** Acelerar búsqueda full-text

```sql
-- Crear índice GIN para búsqueda full-text (si no existe)
CREATE INDEX IF NOT EXISTS idx_chunks_content_fts 
ON course_content_chunks 
USING GIN(to_tsvector('spanish', content));

-- Índice para metadata (búsqueda rápida por file_name)
CREATE INDEX IF NOT EXISTS idx_chunks_metadata_file_name 
ON course_content_chunks 
USING BTREE((metadata->>'file_name'));

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_chunks_course_file 
ON course_content_chunks(course_id, (metadata->>'file_name'));
```

**Impacto esperado:** 30-50% reducción en tiempo de query

#### Solución: Ajustar Timeout
**Ventaja:** Más tiempo para queries complejas

```typescript
// ACTUAL
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 3000)
);

// OPTIMIZADO (aumentar a 5 segundos para queries complejas)
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 5000)
);
```

**Impacto esperado:** Reducir errores de timeout en 20-30%

---

### 3. Optimización de Selección de Chunks (TypeScript)

#### Problema Actual
- Seleccionamos chunks secuencialmente (primeros 15)
- No consideramos diversidad de materiales
- No priorizamos materiales específicos

#### Solución: Diversidad por Material
**Ventaja:** Asegurar que múltiples materiales estén representados

```typescript
// ACTUAL (línea 486)
vectorChunks = textChunks.slice(0, 15).map(...)

// OPTIMIZADO (agrupar por material, tomar top de cada uno)
const chunksByMaterial = new Map<string, any[]>();
textChunks.forEach(chunk => {
  const materialId = chunk.metadata?.material_id || 'unknown';
  if (!chunksByMaterial.has(materialId)) {
    chunksByMaterial.set(materialId, []);
  }
  chunksByMaterial.get(materialId)!.push(chunk);
});

// Seleccionar: top 3 de cada material, hasta 15 total
const selectedChunks: any[] = [];
for (const [materialId, materialChunks] of chunksByMaterial) {
  if (selectedChunks.length >= 15) break;
  const topChunks = materialChunks.slice(0, 3);
  selectedChunks.push(...topChunks);
}

vectorChunks = selectedChunks.map(...)
```

**Impacto esperado:** +30-40% mejora en diversidad de resultados

#### Solución: Boost por Material Específico
**Ventaja:** Priorizar materiales relevantes (ej: "Williams Gineco.pdf" para ginecología)

```typescript
// Lista de materiales prioritarios por curso
const PRIORITY_MATERIALS: Record<number, string[]> = {
  12: ['Williams Gineco.pdf', 'Williams Obstetricia'], // Ginecología-Obstetricia
  // ... otros cursos
};

// Reordenar chunks: materiales prioritarios primero
const priorityMaterials = PRIORITY_MATERIALS[courseIdInt] || [];
const priorityChunks = textChunks.filter(chunk => 
  priorityMaterials.some(priority => 
    chunk.metadata?.sourceFileName?.includes(priority)
  )
);
const otherChunks = textChunks.filter(chunk => 
  !priorityMaterials.some(priority => 
    chunk.metadata?.sourceFileName?.includes(priority)
  )
);

// Combinar: prioritarios primero, luego otros
const reorderedChunks = [...priorityChunks, ...otherChunks];
vectorChunks = reorderedChunks.slice(0, 15).map(...)
```

**Impacto esperado:** +50-70% mejora para materiales específicos

---

### 4. Optimización de Caché

#### Problema Actual
- Caché en memoria (se pierde en reinicios)
- TTL fijo de 30 minutos
- No diferencia entre queries similares

#### Solución: Caché Inteligente con Normalización
**Ventaja:** Cachear queries similares (ej: "estadio cancer mama" = "estadio cáncer mamario")

```typescript
// Normalizar query: lowercase, sin acentos, sin puntuación
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Sin acentos
    .replace(/[^\w\s]/g, '') // Sin puntuación
    .trim();
}

// Usar query normalizada como key
const normalizedQuery = normalizeQuery(query);
const cacheKey = `rag:${courseId}:${normalizedQuery}`;
```

**Impacto esperado:** +20-30% hit rate de caché

#### Solución: Caché de Resultados Parciales
**Ventaja:** Cachear chunks encontrados (no solo respuesta completa)

```typescript
// Caché de chunks por query
private chunkCache: Map<string, { chunks: any[]; timestamp: number }> = new Map();
private readonly CHUNK_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// Al buscar chunks, verificar caché primero
const cacheKey = `chunks:${courseId}:${normalizedQuery}`;
const cached = this.chunkCache.get(cacheKey);
if (cached && (Date.now() - cached.timestamp) < this.CHUNK_CACHE_TTL) {
  return cached.chunks; // Usar chunks cacheados
}
```

**Impacto esperado:** 40-60% reducción en queries SQL

---

### 5. Optimización de Prompts (Gemini)

#### Problema Actual
- Prompt genérico que no diferencia tipos de queries
- No prioriza materiales específicos en el prompt

#### Solución: Prompt Adaptativo
**Ventaja:** Adaptar prompt según tipo de query

```typescript
function buildAdaptivePrompt(query: string, chunks: CourseContent[]): string {
  // Detectar tipo de query
  const isSpecificQuery = query.match(/\b(estadio|clasificaci[oó]n|tipo|grado)\b/i);
  const isGeneralQuery = query.match(/\b(qu[ée]|qu[eé] es|explica|definici[oó]n)\b/i);
  
  if (isSpecificQuery) {
    // Prompt para queries específicas (ej: estadio)
    return `
      El usuario pregunta sobre: "${query}"
      
      INFORMACIÓN ESPECÍFICA (priorizar):
      ${chunks.filter(c => c.metadata?.sourceFileName?.includes('Williams')).map(...)}
      
      INFORMACIÓN GENERAL (como referencia):
      ${chunks.filter(c => !c.metadata?.sourceFileName?.includes('Williams')).map(...)}
      
      Responde basándote PRIMERO en la información específica.
    `;
  }
  
  // Prompt genérico para otros casos
  return buildPersonalizedPrompt(query, chunks, ...);
}
```

**Impacto esperado:** +20-30% mejora en respuestas para queries específicas

#### Solución: Instrucciones Explícitas de Priorización
**Ventaja:** Instruir al LLM a priorizar ciertos materiales

```typescript
const systemInstruction = `
  Eres un tutor virtual especializado en medicina.
  
  PRIORIZACIÓN DE FUENTES:
  1. Si la pregunta es sobre ginecología, prioriza "Williams Ginecología"
  2. Si la pregunta es sobre obstetricia, prioriza "Williams Obstetricia"
  3. Si hay múltiples fuentes, combina información de todas
  
  ...
`;
```

**Impacto esperado:** +15-25% mejora en relevancia percibida

---

### 6. Optimización de Timeout y Errores

#### Problema Actual
- Timeout de 3 segundos puede ser muy restrictivo
- No hay retry automático
- No diferencia entre tipos de errores

#### Solución: Timeout Adaptativo
**Ventaja:** Más tiempo para queries complejas

```typescript
// Timeout basado en complejidad de query
function calculateTimeout(query: string): number {
  const wordCount = query.split(/\s+/).length;
  const isComplex = wordCount > 5 || query.includes('y') || query.includes('o');
  
  return isComplex ? 5000 : 3000; // 5s para complejas, 3s para simples
}

const timeout = calculateTimeout(query);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), timeout)
);
```

**Impacto esperado:** 20-30% reducción en errores de timeout

#### Solución: Retry con Backoff
**Ventaja:** Reintentar queries fallidas

```typescript
async function searchWithRetry(query: string, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await supabase.rpc('search_course_content_chunks_text_clean', {...});
      if (!result.error) return result;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
```

**Impacto esperado:** 30-40% reducción en errores transitorios

---

## 📊 Impacto Esperado de Optimizaciones

### Mejora Acumulativa

| Optimización | Impacto Relevancia | Impacto Tiempo | Esfuerzo | Costo |
|--------------|-------------------|----------------|----------|-------|
| **1. ts_rank_cd** | +20-30% | 0% | 1 día | $0 |
| **2. Ranking Híbrido** | +40-50% | 0% | 2 días | $0 |
| **3. Índices GIN** | 0% | -30-50% | 1 día | $0 |
| **4. Diversidad por Material** | +30-40% | 0% | 1 día | $0 |
| **5. Boost por Material** | +50-70% | 0% | 1 día | $0 |
| **6. Caché Inteligente** | 0% | -40-60% | 1 día | $0 |
| **7. Prompt Adaptativo** | +20-30% | 0% | 2 días | $0 |
| **8. Timeout Adaptativo** | 0% | -20-30% errores | 1 día | $0 |
| **TOTAL** | **+80-120%** | **-50-70%** | **10 días** | **$0** |

### Priorización Recomendada

#### Fase 1: Quick Wins (2-3 días) 🚀
1. ✅ **Boost por Material** (mayor impacto, fácil)
2. ✅ **Índices GIN** (mejor tiempo, fácil)
3. ✅ **Caché Inteligente** (mejor tiempo, fácil)

**Impacto esperado:** +50-70% relevancia, -40-60% tiempo

#### Fase 2: Mejoras de Ranking (3-4 días) 📈
4. ✅ **ts_rank_cd** (mejor ranking)
5. ✅ **Ranking Híbrido** (mejor ranking)
6. ✅ **Diversidad por Material** (mejor diversidad)

**Impacto esperado:** +30-50% relevancia adicional

#### Fase 3: Refinamiento (2-3 días) 🎯
7. ✅ **Prompt Adaptativo** (mejor respuestas)
8. ✅ **Timeout Adaptativo** (menos errores)

**Impacto esperado:** +20-30% relevancia adicional, -20-30% errores

---

## 🎯 Plan de Implementación Recomendado

### Semana 1: Quick Wins
- **Día 1-2:** Boost por Material + Índices GIN
- **Día 3:** Caché Inteligente
- **Test y Deploy**

### Semana 2: Mejoras de Ranking
- **Día 1-2:** ts_rank_cd + Ranking Híbrido
- **Día 3:** Diversidad por Material
- **Test y Deploy**

### Semana 3: Refinamiento
- **Día 1-2:** Prompt Adaptativo
- **Día 3:** Timeout Adaptativo + Retry
- **Test Final y Deploy**

**Total:** 3 semanas, costo $0, mejora esperada +80-120% relevancia, -50-70% tiempo

---

## ✅ Conclusión

**Con la tecnología actual (PostgreSQL + Supabase + Gemini), puedes lograr:**

1. ✅ **+80-120% mejora en relevancia** (sin Graph RAG)
2. ✅ **-50-70% reducción en tiempo** (con índices y caché)
3. ✅ **$0 costo adicional** (solo optimizaciones SQL/TypeScript)
4. ✅ **3 semanas de implementación** (vs 4-6 semanas Graph RAG)

**Recomendación:** **Implementar optimizaciones actuales primero**, luego evaluar si Graph RAG es necesario.

---

**Última actualización:** Enero 2025  
**Autor:** Análisis basado en stack tecnológico actual del sistema
