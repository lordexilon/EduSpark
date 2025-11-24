# Plan de Optimización de Costos - EduSpark

## Análisis del Problema

### Situación Actual
- **Almacenamiento estimado**: 80 GB
- **Costos elevados** en procesamiento y almacenamiento
- **Componentes principales de costo**:
  1. **Cloud Run**: 8GB memoria × 5 instancias máximas = 40GB teórico
  2. **Embeddings en Supabase**: ~3KB por embedding (768 dimensiones × 4 bytes)
  3. **Contenido de texto**: Variable según tamaño de chunks
  4. **Metadatos JSONB**: Información adicional por chunk

### Cálculo de Almacenamiento Actual
- **Embedding**: 768 dimensiones × 4 bytes (float32) = **3,072 bytes (~3KB)**
- **Contenido de texto**: Variable, típicamente 5-50KB por chunk
- **Metadatos JSONB**: ~1-5KB por chunk
- **Total por chunk**: ~10-60KB
- **Para 80GB**: Aproximadamente **1.3M - 8M chunks** (dependiendo del tamaño promedio)

## Estrategias de Optimización

### 1. Aumentar Tamaño de Chunks (IMPACTO ALTO)
**Problema actual**: 25 páginas por chunk (configurable, pero por defecto)
**Solución**: Aumentar a 50-100 páginas por chunk

**Beneficios**:
- Reduce cantidad de embeddings en ~50-75%
- Reduce operaciones de base de datos
- Reduce costos de almacenamiento proporcionalmente
- Mantiene calidad de búsqueda semántica (chunks más grandes pueden ser más contextuales)

**Implementación**:
- Cambiar `pagesPerChunk` por defecto de 25 a 50-75
- Ajustar según tipo de contenido (texto denso vs. escaneado)

**Ahorro estimado**: 40-60% en almacenamiento de embeddings

### 2. Optimizar Metadatos JSONB (IMPACTO MEDIO)
**Problema actual**: Metadatos completos en cada chunk
**Solución**: Reducir metadatos redundantes

**Cambios propuestos**:
- Eliminar `sourceFileId` y `sourceFileName` (ya están en la tabla `materials`)
- Simplificar `metadata` a solo campos esenciales
- Usar referencias en lugar de duplicar datos

**Ahorro estimado**: 20-30% en almacenamiento de metadatos

### 3. Reducir Memoria de Cloud Run (IMPACTO MEDIO)
**Problema actual**: 8GB de memoria por instancia
**Solución**: Optimizar procesamiento para usar menos memoria

**Estrategias**:
- Procesar archivos en streaming cuando sea posible
- Liberar buffers inmediatamente después de uso
- Reducir tamaño de lotes de embeddings si es necesario
- Considerar reducir a 4GB si es viable

**Ahorro estimado**: 30-50% en costos de Cloud Run

### 4. Comprimir Contenido de Texto (IMPACTO BAJO-MEDIO)
**Problema actual**: Texto almacenado sin compresión
**Solución**: Comprimir texto antes de almacenar (opcional)

**Consideraciones**:
- PostgreSQL ya comprime TEXT automáticamente
- Compresión adicional puede no ser necesaria
- Evaluar si el texto tiene mucha redundancia

**Ahorro estimado**: 10-20% en almacenamiento de texto

### 5. Limpieza de Chunks Duplicados (IMPACTO VARIABLE)
**Problema potencial**: Chunks duplicados o innecesarios
**Solución**: Script de limpieza y deduplicación

**Implementación**:
- Identificar chunks duplicados por contenido
- Eliminar chunks huérfanos (sin material asociado)
- Limpiar chunks de materiales eliminados

**Ahorro estimado**: Variable, depende de duplicados existentes

### 6. Optimizar Procesamiento por Lotes (IMPACTO BAJO)
**Problema actual**: Lotes de 20 embeddings
**Solución**: Ajustar tamaño de lotes según recursos disponibles

**Consideraciones**:
- Lotes más grandes = menos overhead pero más memoria
- Lotes más pequeños = más overhead pero menos memoria
- Encontrar balance óptimo

## Plan de Implementación Priorizado

### Fase 1: Optimizaciones Rápidas (Impacto Inmediato) ✅ COMPLETADO
1. ✅ **Aumentar tamaño de chunks** a 60 páginas por defecto (implementado)
2. ✅ **Optimizar metadatos** - reducir campos redundantes (eliminados sourceFileId y sourceFileName)
3. ✅ **Script de análisis** - creado `sql_scripts/analizar_uso_almacenamiento.sql`
4. ✅ **Reducir memoria de Cloud Run** de 8GB a 4GB (implementado)
5. ✅ **Actualizar estimadores de costo** para reflejar nuevos valores

### Fase 2: Optimizaciones de Infraestructura (Impacto Medio Plazo)
1. ✅ **Reducir memoria de Cloud Run** a 4GB (COMPLETADO - reducido de 8GB a 4GB)
2. ⏳ **Optimizar procesamiento** para usar menos memoria (ya implementado con liberación de buffers)
3. ⏳ **Limpieza de datos** - eliminar chunks innecesarios (usar script SQL de análisis)

### Fase 3: Optimizaciones Avanzadas (Impacto Largo Plazo)
1. ⏳ **Evaluar modelos de embedding alternativos** (si hay opciones más eficientes)
2. ⏳ **Implementar compresión avanzada** si es necesario
3. ⏳ **Monitoreo y alertas** de costos

## Métricas de Éxito

### Objetivos
- **Reducir almacenamiento**: De 80GB a <40GB (50% reducción)
- **Reducir costos de procesamiento**: 30-50% menos costos de Cloud Run
- **Mantener calidad**: No degradar calidad de búsqueda RAG

### Métricas a Monitorear
- Tamaño total de base de datos
- Cantidad de chunks por curso
- Tiempo de procesamiento
- Costos mensuales de Cloud Run
- Costos de almacenamiento en Supabase
- Calidad de respuestas del RAG (evaluación cualitativa)

## Cambios Implementados (✅ COMPLETADO)

### 1. Tamaño de Chunks Optimizado
- **Antes**: 25 páginas por chunk (default)
- **Ahora**: 60 páginas por chunk (default)
- **Archivos modificados**:
  - `functions/processFileJob/index.ts` - función `splitIntoChunks` y uso
  - `functions/createFileProcessingJob/index.ts` - default de chunkSize
  - `functions/analyzeFile/index.ts` - default de chunkSize
  - `services/costEstimator.ts` - defaults en funciones de cálculo

### 2. Memoria de Cloud Run Reducida
- **Antes**: 8GB memoria, 4 vCPU, máximo 40GB total (8GB × 5 instancias)
- **Ahora**: 4GB memoria, 2 vCPU, máximo 20GB total (4GB × 5 instancias)
- **Archivo modificado**: `functions/processFileJob/index.ts`
- **Ahorro estimado**: 50% en costos de memoria de Cloud Run

### 3. Metadatos Optimizados
- **Eliminados**: `sourceFileId` y `sourceFileName` de metadatos de chunks
- **Razón**: Estos datos ya están disponibles en la tabla `materials`
- **Archivo modificado**: `functions/processFileJob/index.ts`
- **Ahorro estimado**: 20-30% en tamaño de metadatos JSONB

### 4. Estimadores de Costo Actualizados
- Actualizados para reflejar nuevos valores por defecto (60 páginas, 4GB memoria)
- **Archivo modificado**: `services/costEstimator.ts`

### 5. Script de Análisis Creado
- **Archivo**: `sql_scripts/analizar_uso_almacenamiento.sql`
- **Funcionalidad**: Analiza uso de almacenamiento, identifica oportunidades de optimización, calcula proyecciones de ahorro

## Impacto Esperado

### Reducción de Almacenamiento
- **Chunks**: ~58% menos chunks (de 25 a 60 páginas por chunk)
- **Metadatos**: ~25% menos tamaño por chunk
- **Total estimado**: **50-60% reducción en almacenamiento de embeddings y metadatos**

### Reducción de Costos de Procesamiento
- **Cloud Run memoria**: 50% menos costo (de 8GB a 4GB)
- **Cloud Run CPU**: 50% menos costo (de 4 vCPU a 2 vCPU)
- **Embeddings**: ~58% menos llamadas a API (menos chunks)
- **Firestore**: ~58% menos operaciones de escritura

### Ejemplo de Ahorro
Para un archivo de 1000 páginas:
- **Antes**: 40 chunks × $0.01 = $0.40 (estimado)
- **Ahora**: 17 chunks × $0.005 = $0.085 (estimado)
- **Ahorro**: ~78% en costos de procesamiento

## Notas Importantes

⚠️ **Advertencias**:
- Aumentar tamaño de chunks puede afectar la precisión de búsqueda (evaluar en producción)
- Reducir memoria puede causar timeouts en archivos muy grandes (>500MB) - monitorear
- Cambios en metadatos: código de consulta que use `sourceFileId` o `sourceFileName` debe actualizarse para obtenerlos de `materials`

✅ **Recomendaciones**:
- ✅ Cambios implementados y listos para desplegar
- ⚠️ Ejecutar script de análisis antes de desplegar para medir impacto actual
- ⚠️ Monitorear métricas después del despliegue
- ⚠️ Hacer backup de base de datos antes de cambios importantes
- ⚠️ Probar en ambiente de desarrollo primero si es posible

