# 📊 Flujo de Recuperación de Datos para RAG

**Fecha:** Enero 2025  
**Archivo:** `src/modules/tutor/services/ragService.ts`  
**Función:** `getRelevantContent()`

---

## 🎯 Resumen Ejecutivo

El sistema RAG recupera datos de múltiples fuentes para responder las consultas de los estudiantes. Utiliza una estrategia de **búsqueda híbrida** que combina:

1. **Búsqueda vectorial** en chunks procesados (PDFs, documentos)
2. **Contenido estructurado** del curso (unidades, sesiones)
3. **Materiales adjuntos** (tablas `materials` y `course_materials`)

---

## 📋 Flujo Completo de Recuperación

### Fase 1: Búsqueda en Chunks Procesados (Materiales Indexados)

#### 1.1 Búsqueda de Texto Completo (Primera Prioridad - SIN COSTO)

**Función RPC:** `search_course_content_chunks_text_clean`

```typescript
// Línea 372-380
const textSearchPromise = supabase.rpc(
  'search_course_content_chunks_text_clean',
  {
    search_query: query,
    course_id_param: courseIdInt,
    result_limit: 15,
    min_relevance: 0.001
  }
);
```

**¿Qué busca?**
- Tabla: `course_content_chunks`
- Contenido: Texto extraído de PDFs procesados
- Metadatos: `pageStart`, `pageEnd`, `material_id`, `sourceFileName`
- **Costo:** GRATIS (búsqueda de texto completo en PostgreSQL)

**Resultado:**
- Chunks de documentos procesados con metadata de páginas
- Títulos de materiales obtenidos de la tabla `materials`

#### 1.2 Fallback: Búsqueda Híbrida

Si la función anterior no existe o falla:
- **Función RPC:** `search_course_content_chunks_hybrid_clean`
- Mismo propósito pero con método alternativo

#### 1.3 Búsqueda Expandida por Rangos de Páginas

Si la consulta menciona rangos específicos (ej: "página 241 a 262"):

```typescript
// Línea 508-533
if (pageRange && vectorChunks.length > 0) {
  const expandedChunks = await this.searchChunksInPageRange(
    query,
    courseIdInt,
    pageRange.start,
    pageRange.end,
    10
  );
}
```

**Función:** `searchChunksInPageRange()`
- Usa RPC: `get_chunks_in_page_range`
- Busca chunks que se solapan con el rango de páginas especificado

#### 1.4 Búsqueda Directa por SessionId

Si el estudiante está en una sesión específica:

```typescript
// Línea 542-585
if (vectorChunks.length < 2 && moduleId) {
  const { data: sessionChunks } = await supabase
    .from('course_content_chunks')
    .select('*')
    .eq('course_id', courseIdInt)
    .or(`metadata->>sessionId.eq.${moduleId},metadata->>'sessionId'.eq.${moduleId}`)
    .limit(10);
}
```

**¿Qué busca?**
- Chunks indexados específicamente para una sesión
- Metadata contiene `sessionId`

#### 1.5 Búsqueda Vectorial con Embeddings (ÚLTIMO RECURSO - CON COSTO)

Solo si las búsquedas anteriores no dieron suficientes resultados:

```typescript
// Línea 587-727
if (vectorChunks.length < 2) {
  // Generar embedding de la consulta
  const queryEmbedding = await generateEmbedding(query);
  
  // Buscar con similitud vectorial
  const result = await supabase.rpc('search_course_content_chunks', {
    query_embedding: embeddingString,
    course_id_param: courseIdStr,
    match_threshold: 0.1,
    match_count: 10
  });
}
```

**Costo:** ~$0.00001 por consulta (API de Gemini)

---

### Fase 2: Carga de Contenido Estructurado del Curso

#### 2.1 Información del Curso

```typescript
// Línea 730-741
const { data: courseData } = await supabase
  .from('courses')
  .select('id, title, description, code')
  .eq('id', courseIdInt)
  .single();
```

**Campos recuperados:**
- `id`: ID del curso
- `title`: Título del curso
- `description`: Descripción del curso
- `code`: Código del curso

#### 2.2 Unidades del Curso

```typescript
// Línea 743-762
const { data: units } = await supabase
  .from('course_units')
  .select('id, number, title, description, content_html')
  .eq('course_id', courseIdInt)
  .order('number', { ascending: true });
```

**Campos recuperados:**
- `id`: ID de la unidad
- `number`: Número de la unidad
- `title`: Título de la unidad
- `description`: Descripción de la unidad
- `content_html`: Contenido HTML completo de la unidad

**Procesamiento:**
- El HTML se convierte a texto plano para búsqueda
- Se eliminan tags HTML, scripts, estilos
- Se preserva el contenido textual

#### 2.3 Sesiones del Curso

```typescript
// Línea 764-801
let sessionsQuery = supabase
  .from('sessions')
  .select('id, title, description, content_html, starts_at, ends_at, unit_id')
  .eq('course_id', courseIdInt);

// Si moduleId es UUID (sessionId), buscar sesión específica
if (moduleId) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
  if (isUUID) {
    sessionsQuery = sessionsQuery.eq('id', moduleId);
  } else {
    sessionsQuery = sessionsQuery.eq('unit_id', moduleId);
  }
}
```

**Campos recuperados:**
- `id`: ID de la sesión (UUID)
- `title`: Título de la sesión
- `description`: Descripción de la sesión
- `content_html`: Contenido HTML completo de la sesión
- `starts_at`: Fecha de inicio
- `ends_at`: Fecha de fin
- `unit_id`: ID de la unidad a la que pertenece

**Lógica especial:**
- Si `moduleId` es un UUID → Busca la sesión específica
- Si `moduleId` es un número → Filtra sesiones por `unit_id`
- El HTML se convierte a texto plano para búsqueda

---

### Fase 3: Materiales Adicionales

#### 3.1 Materiales de la Tabla `materials`

```typescript
// Línea 803-828
let materialsQuery = supabase
  .from('materials')
  .select('id, title, kind, url, metadata, unit_id, session_id')
  .eq('course_id', courseIdInt);

if (moduleId) {
  materialsQuery = materialsQuery.eq('unit_id', moduleId);
}
```

**Campos recuperados:**
- `id`: ID del material
- `title`: Título del material
- `kind`: Tipo de material
- `url`: URL del material
- `metadata`: Metadatos adicionales (JSONB)
- `unit_id`: ID de la unidad relacionada
- `session_id`: ID de la sesión relacionada

**Límite:** 50 materiales por consulta

#### 3.2 Materiales de la Tabla `course_materials`

```typescript
// Línea 830-859
let query = supabase
  .from('course_materials')
  .select('*')
  .eq('course_id', courseIdInt);

if (moduleId) {
  const moduleIdInt = parseInt(String(moduleId), 10);
  if (!isNaN(moduleIdInt)) {
    query = query.eq('module_id', moduleIdInt);
  }
}
```

**Nota:** Esta tabla parece ser legacy (usa `module_id` en lugar de `unit_id`)

**Límite:** 50 materiales por consulta

---

### Fase 4: Obtención de Títulos de Materiales

Para los chunks procesados, se obtienen los títulos reales desde la tabla `materials`:

```typescript
// Línea 462-479 y 673-691
const materialIds = [...new Set(textChunks
  .map((chunk: any) => chunk.metadata?.material_id)
  .filter(Boolean))];

if (materialIds.length > 0) {
  const { data: materials } = await supabase
    .from('materials')
    .select('id, title')
    .in('id', materialIds);
  
  materialTitles = materials.reduce((acc, mat) => {
    acc[mat.id] = mat.title;
    return acc;
  }, {});
}
```

**Propósito:** Reemplazar nombres genéricos como "Documento procesado" con el título real del material.

---

### Fase 5: Construcción del Contenido Combinado

Todos los datos se combinan en un array `CourseContent[]`:

```typescript
// Línea 865-1012
const allContent: CourseContent[] = [
  // 1. Información del curso
  {
    id: courseData.id.toString(),
    title: courseData.title,
    content: courseData.description || '',
    type: 'chapter',
    ...
  },
  
  // 2. Unidades (convertidas de HTML a texto)
  ...unitsData.map((unit) => ({
    id: `unit-${unit.id}`,
    title: `Unidad ${unit.number}: ${unit.title}`,
    content: unitTextContent, // HTML convertido a texto
    type: 'unit',
    hasRichContent: !!unit.content_html
  })),
  
  // 3. Sesiones (convertidas de HTML a texto)
  ...sessionsData.map((session) => ({
    id: `session-${session.id}`,
    title: session.title,
    content: sessionTextContent, // HTML convertido a texto
    type: 'session',
    hasRichContent: !!session.content_html
  })),
  
  // 4. Materiales de tabla materials
  ...materialsFromTable.map((material) => ({
    id: `material-${material.id}`,
    title: material.title,
    content: contentText,
    type: 'material',
    url: material.url,
    ...
  })),
  
  // 5. Materiales de course_materials
  ...materials.map((material) => ({
    id: material.id,
    title: material.title,
    content: contentText,
    type: material.type || 'material',
    ...
  }))
];
```

**Estructura `CourseContent`:**
```typescript
{
  id: string;
  title: string;
  content: string;
  type: 'chapter' | 'unit' | 'session' | 'material';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  originalId?: string;
  courseId?: string;
  unitId?: string;
  sessionId?: string;
  url?: string;
  metadata?: {
    sourceFileName?: string;
    material_id?: string;
    material_title?: string;
    pageStart?: number;
    pageEnd?: number;
    pdfType?: string;
    category?: string;
    ocrUsed?: boolean;
  };
  hasRichContent?: boolean; // Indica si tiene content_html
}
```

---

### Fase 6: Filtrado y Ordenamiento

#### 6.1 Combinación con Chunks Vectoriales

```typescript
// Línea 1014-1025
const combinedContent = [...vectorChunks, ...allContent];
const filteredContent = this.filterRelevantContent(query, combinedContent);
```

#### 6.2 Priorización

Los chunks vectoriales (materiales procesados) tienen prioridad sobre el contenido estructurado:

```typescript
const vectorChunkIds = new Set(vectorChunks.map(c => c.id));
const sortedContent = [
  ...filteredContent.filter(c => vectorChunkIds.has(c.id)), // Chunks primero
  ...filteredContent.filter(c => !vectorChunkIds.has(c.id)) // Contenido estructurado después
].slice(0, this.maxSources);
```

**Límite:** `maxSources` (típicamente 5-10 elementos)

---

## 🔍 Orden de Prioridad de Búsqueda

1. **Búsqueda de texto completo** (GRATIS) en `course_content_chunks`
2. **Búsqueda expandida** por rangos de páginas si aplica
3. **Búsqueda directa** por `sessionId` en chunks si está en una sesión
4. **Búsqueda vectorial** con embeddings (COSTO) solo si es necesario
5. **Contenido estructurado** (unidades, sesiones, materiales) como complemento

---

## 📊 Tablas de Base de Datos Utilizadas

| Tabla | Propósito | Campos Principales |
|-------|-----------|-------------------|
| `courses` | Información del curso | `id`, `title`, `description`, `code` |
| `course_units` | Unidades del curso | `id`, `number`, `title`, `description`, `content_html` |
| `sessions` | Sesiones del curso | `id`, `title`, `description`, `content_html`, `unit_id` |
| `materials` | Materiales adjuntos | `id`, `title`, `kind`, `url`, `metadata`, `unit_id`, `session_id` |
| `course_materials` | Materiales adicionales (legacy?) | Todos los campos |
| `course_content_chunks` | Chunks procesados de PDFs | `id`, `content`, `embedding`, `metadata` |

---

## ⚠️ Consideraciones Importantes

1. **Costo:** La búsqueda vectorial tiene costo, por eso se intenta primero con búsqueda de texto completo.

2. **HTML a Texto:** El contenido HTML de unidades y sesiones se convierte a texto plano, perdiendo formato pero preservando el contenido.

3. **Títulos de Materiales:** Los chunks procesados no tienen el título real del material, se obtiene mediante una consulta adicional a la tabla `materials`.

4. **SessionId vs UnitId:** El sistema detecta automáticamente si `moduleId` es un UUID (sessionId) o un número (unitId).

5. **Límites:** 
   - Materiales: 50 por tabla
   - Chunks vectoriales: 15 en búsqueda de texto, 10 en búsqueda expandida
   - Resultados finales: `maxSources` (típicamente 5-10)

6. **Fallback:** Si una búsqueda falla, el sistema continúa con las siguientes opciones en lugar de fallar completamente.

---

## 🔄 Flujo Visual Simplificado

```
Consulta del Estudiante
         ↓
¿Menciona rangos de páginas? → Búsqueda expandida por rango
         ↓
Búsqueda de texto completo en chunks (GRATIS)
         ↓ (si < 2 resultados)
¿Está en una sesión? → Búsqueda directa por sessionId
         ↓ (si < 2 resultados)
Búsqueda vectorial con embeddings (COSTO)
         ↓
Carga de contenido estructurado:
  - Curso
  - Unidades (HTML → Texto)
  - Sesiones (HTML → Texto)
  - Materiales (tabla materials)
  - Materiales (tabla course_materials)
         ↓
Obtención de títulos reales de materiales
         ↓
Combinación y filtrado por relevancia
         ↓
Ordenamiento: Chunks vectoriales primero, luego contenido estructurado
         ↓
Resultado final (máximo maxSources elementos)
```

---

## 📝 Notas para Desarrollo Futuro

1. **Optimización:** Considerar caché de resultados frecuentes
2. **Índices:** Asegurar índices en `course_id`, `unit_id`, `session_id` en todas las tablas
3. **Legacy:** Evaluar si `course_materials` sigue siendo necesario o se puede deprecar
4. **Performance:** El proceso de conversión HTML → texto podría optimizarse
5. **Metadata:** Considerar indexar títulos de materiales directamente en chunks para evitar consultas adicionales

