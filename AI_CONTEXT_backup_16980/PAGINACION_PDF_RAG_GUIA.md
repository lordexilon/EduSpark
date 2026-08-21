# 📄 Guía de Paginación de PDF para RAG

## 🎯 Objetivo

Esta guía documenta cómo funciona el sistema de paginación de PDFs en el RAG (Retrieval-Augmented Generation), permitiendo que los estudiantes puedan hacer preguntas específicas sobre páginas de documentos y obtener respuestas precisas con referencias a las páginas correspondientes.

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Flujo del Sistema](#flujo-del-sistema)
3. [Estructura de Datos](#estructura-de-datos)
4. [Cómo Funciona](#cómo-funciona)
5. [Scripts SQL](#scripts-sql)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Troubleshooting](#troubleshooting)

## 🎯 Descripción General

El sistema de paginación permite:

- ✅ Procesar PDFs página por página
- ✅ Guardar información de páginas en metadata de chunks
- ✅ Detectar referencias a páginas en preguntas de estudiantes
- ✅ Buscar chunks específicos por rango de páginas
- ✅ Mostrar información de páginas en las respuestas

## 🔄 Flujo del Sistema

### 1. Procesamiento de PDF

```
PDF Original
  ↓
detectPdfType() → Tipo: 'text' o 'scanned'
  ↓
countPdfPages() → Total de páginas
  ↓
Dividir en rangos de 25 páginas (CHUNK_SIZE)
  ↓
Para cada rango (ej: páginas 1-25):
  extractTextFromPages(pageStart, pageEnd)
  ↓
  processTextIntoChunks(text, {pageStart, pageEnd})
  ↓
  generateEmbeddingsBatch()
  ↓
  saveChunksBatch() → Guarda con metadata {pageStart, pageEnd}
```

### 2. Búsqueda RAG con Paginación

```
Pregunta del Estudiante
  ↓
detectPageRange() → Detecta "páginas 241-262" → {start: 241, end: 262}
  ↓
Si detecta rango de páginas:
  Búsqueda Vectorial Normal (para contexto)
  +
  searchChunksInPageRange(241, 262)
    ↓
    RPC: get_chunks_in_page_range(courseId, 241, 262)
    ↓
    Retorna chunks que se solapan con el rango
  ↓
Combinar resultados
  ↓
Respuesta con información: "📄 PÁGINAS 241-262 | Fuente: [documento]"
```

## 📊 Estructura de Datos

### Metadata de Chunks en Base de Datos

Los chunks se almacenan en `course_content_chunks` con metadata JSONB:

```json
{
  "sourceFileName": "nombre_documento.pdf",
  "pageStart": 1,
  "pageEnd": 25,
  "chunkIndex": 0,
  "pdfType": "text",
  "ocrUsed": false,
  "category": "book",
  "materialId": "uuid-del-material",
  "unitId": "uuid-de-la-unidad",
  "sessionId": "uuid-de-la-sesion"
}
```

### Campos Clave

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pageStart` | number | Página inicial del rango del chunk |
| `pageEnd` | number | Página final del rango del chunk |
| `sourceFileName` | string | Nombre del archivo PDF original |
| `materialId` | string | ID del material en tabla `materials` |
| `chunkIndex` | number | Índice del chunk dentro del rango de páginas |

## ⚙️ Cómo Funciona

### Detección de Rangos de Páginas

El sistema detecta patrones como:
- "páginas 241-262"
- "página 241"
- "págs 241-262"
- "pgs 241-262"
- "página 241 a 262"

Implementado en: `src/modules/tutor/services/ragService.ts` → `detectPageRange()`

### Búsqueda por Rango

La función SQL `get_chunks_in_page_range` busca chunks que se **solapan** con el rango buscado:

```sql
-- Un chunk se solapa con el rango si:
-- (pageStart <= page_end_buscado) AND (pageEnd >= page_start_buscado)

-- Ejemplo: Buscamos páginas 241-262
-- Chunk con páginas 230-250 → ✅ Se solapa (250 >= 241)
-- Chunk con páginas 260-280 → ✅ Se solapa (260 <= 262)
-- Chunk con páginas 200-240 → ❌ No se solapa (240 < 241)
-- Chunk con páginas 263-300 → ❌ No se solapa (263 > 262)
```

### Respuestas con Páginas

Las respuestas incluyen información de páginas:

- **Rango de páginas:** "📄 PÁGINAS 241-262 | Fuente: nombre_documento.pdf"
- **Página única:** "📄 PÁGINA 241 | Fuente: nombre_documento.pdf"
- **Múltiples rangos:** "📄 PÁGINAS 1-5, 6-10, 11-14"

## 🗄️ Scripts SQL

### Orden de Ejecución

```sql
-- 1. Hacer backup (OBLIGATORIO antes de cambios)
\i sql_scripts/3_tutor_rag/172_backup_page_range_rpc.sql

-- 2. Aplicar cambios (si es necesario)
\i sql_scripts/3_tutor_rag/172_verify_fix_page_range_rpc.sql

-- 3. Verificar que funciona
\i sql_scripts/3_tutor_rag/172_test_page_range_rpc.sql
```

### Scripts Disponibles

1. **172_backup_page_range_rpc.sql**
   - Hace backup de la función actual
   - Guarda en tabla `_function_backups`

2. **172_verify_fix_page_range_rpc.sql**
   - Crea/reemplaza la función RPC
   - Incluye embedding en RETURNS TABLE
   - Lógica de solapamiento mejorada

3. **172_test_page_range_rpc.sql**
   - Verifica que la función existe
   - Prueba con datos reales
   - Muestra ejemplos

4. **172_restore_page_range_rpc.sql**
   - Restaura desde backup
   - Útil si algo sale mal

## 💡 Ejemplos de Uso

### Ejemplo 1: Pregunta con Rango de Páginas

**Estudiante pregunta:**
> "¿Qué dice en las páginas 6-10 del documento?"

**Proceso:**
1. Sistema detecta: `{start: 6, end: 10}`
2. Busca chunks en páginas 6-10
3. Encuentra chunks del curso 9: páginas 6-10
4. Responde con contenido + "📄 PÁGINAS 6-10 | Fuente: [documento]"

### Ejemplo 2: Pregunta con Página Única

**Estudiante pregunta:**
> "Explícame la página 241"

**Proceso:**
1. Sistema detecta: `{start: 241, end: 241}`
2. Busca chunks que incluyan la página 241
3. Responde con contenido + "📄 PÁGINA 241 | Fuente: [documento]"

### Ejemplo 3: Pregunta sin Referencia de Páginas

**Estudiante pregunta:**
> "¿Qué es la justificación?"

**Proceso:**
1. Sistema NO detecta rango de páginas
2. Usa solo búsqueda vectorial normal
3. Responde normalmente (sin información de páginas en cabecera)

## 🔍 Troubleshooting

### Problema: No se encuentran chunks por páginas

**Verificar:**
```sql
-- ¿Hay chunks con paginación?
SELECT COUNT(*) 
FROM course_content_chunks
WHERE course_id = 9  -- Tu course_id
  AND metadata->>'pageStart' IS NOT NULL;
```

**Solución:**
- Asegúrate de que los PDFs se procesaron correctamente
- Verifica que `pageStart` y `pageEnd` sean números, no strings

### Problema: La función RPC no funciona

**Verificar:**
```sql
-- ¿Existe la función?
SELECT proname 
FROM pg_proc 
WHERE proname = 'get_chunks_in_page_range';

-- Probar manualmente
SELECT * FROM get_chunks_in_page_range(
  p_course_id := 9,
  p_page_start := 1,
  p_page_end := 10,
  p_limit := 5
);
```

**Solución:**
- Ejecuta `172_verify_fix_page_range_rpc.sql`
- Verifica que no haya errores de sintaxis

### Problema: Valores son strings en lugar de números

**Verificar:**
```sql
-- Ver formato de metadata
SELECT 
  metadata->>'pageStart' as page_start_raw,
  (metadata->>'pageStart')::int as page_start_int
FROM course_content_chunks
WHERE course_id = 9
LIMIT 5;
```

**Nota:** Es normal que en la salida del query aparezcan como strings. La función SQL hace el cast a INTEGER internamente.

## 📈 Resultados de Pruebas

### Datos Verificados

Se ejecutó el script de prueba y se confirmó:

**Curso ID 9:**
- Chunks con páginas 1-5
- Chunks con páginas 6-10
- Chunks con páginas 11-14

**Curso ID 12:**
- Chunks con páginas 1329-1332
- Chunks con páginas 1337-1340

### Estado del Sistema

✅ Función RPC implementada y funcionando  
✅ Chunks con información de páginas en base de datos  
✅ Sistema de detección de páginas en preguntas funcionando  
✅ Respuestas incluyen información de páginas  

## 🔗 Referencias

- **Código:**
  - `src/modules/tutor/services/ragService.ts` - Lógica RAG
  - `src/workers/file-processing-worker/worker.ts` - Procesamiento PDFs
  - `src/workers/file-processing-worker/chunkProcessor.ts` - Generación de chunks

- **SQL:**
  - `sql_scripts/3_tutor_rag/172_verify_fix_page_range_rpc.sql` - Función RPC
  - `sql_scripts/3_tutor_rag/172_test_page_range_rpc.sql` - Pruebas
  - `sql_scripts/3_tutor_rag/README_PAGE_RANGE_RPC.md` - Guía de scripts

- **Documentación:**
  - `AI_CONTEXT/ANALISIS_PAGINACION_PDF_RAG.md` - Análisis técnico detallado
  - `AI_CONTEXT/PAGINACION_PDF_RAG_GUIA.md` - Esta guía

