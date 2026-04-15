# Diagnóstico: Problema de Búsqueda "Estadificación del Cáncer Mamario"

**Fecha:** Enero 2025  
**Problema:** El tutor no encuentra información sobre "Estadificación del cáncer mamario" cuando el usuario busca en la página 350 (página impresa) del PDF "Williams Ginecología"

---

## 🔍 Resumen Ejecutivo

Se realizó un diagnóstico completo del problema de búsqueda y se identificaron **dos problemas principales**:

1. **Problema de numeración de páginas:** Discrepancia entre número de página impreso (349) y número de página del PDF (370)
2. **Problema de búsqueda RAG:** La función de búsqueda no encuentra frases exactas, solo palabras individuales

**Conclusión:** El contenido está correctamente indexado, pero la función de búsqueda RAG tiene limitaciones para encontrar frases exactas como "Estadificación del cáncer mamario".

---

## 📋 Problemas Identificados

### 1. Discrepancia de Numeración de Páginas

**Problema:**
- Número de página **impreso en el documento**: 349
- Número de página **del visor PDF**: 370
- **Diferencia:** ~21 páginas

**Impacto:**
- Los usuarios consultan usando el número de página impreso (349-350)
- El sistema procesó usando el número de página del PDF (370)
- Esto causa confusión pero no impide la búsqueda por contenido

**Confirmación:**
- El texto muestra: `12_Chapter_12_Hoffman_4R.indd 349` en el contenido de las páginas 371-375 del PDF
- Esto confirma que la página 349 impresa = página 370 del PDF procesado

### 2. Limitación de la Función de Búsqueda RAG

**Problema:**
- La función `search_course_content_chunks_text_clean` usa `websearch_to_tsquery('spanish')`
- Esta función busca **palabras individuales**, no **frases exactas**
- No encuentra "Estadificación del cáncer mamario" aunque el contenido existe

**Función Actual:**
```sql
to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', search_query)
```

**Limitaciones:**
- Busca palabras individuales: "estadificación", "cáncer", "mamario"
- No busca la frase completa: "Estadificación del cáncer mamario"
- Puede tener problemas con acentos o formato
- No garantiza que todas las palabras estén juntas en el orden correcto

---

## ✅ Contenido Verificado

### Archivo Procesado
- **Archivo:** `Williams Gineco.pdf`
- **Páginas procesadas:** 366-375 (PDF) = páginas 345-354 (impresas aproximadamente)
- **Material ID:** `b34ce313-ee4a-4098-80da-a3b713359db6`

### Contenido Encontrado
El contenido sobre estadificación SÍ está correctamente indexado en las páginas 371-375 del PDF:
- Información sobre TNM (T0, T1, T2, T3, T4, N0, N1, N2, N3, M0, M1)
- "Estadio N", "Estadio M"
- "Sin metástasis a los ganglios linfáticos"
- "1-3 ganglios", "4-9 ganglios", "≥10 ganglios"
- Tabla completa de estadificación TNM

### Título del Tema
El título exacto "**Estadificación del cáncer mamario**" probablemente está en las páginas 366-370, antes de la tabla TNM.

---

## 🚨 Confirmación del Problema en Producción

**Fecha:** Enero 2025  
**Búsqueda del usuario:** "estadio cancer mama"  
**Respuesta del tutor:** El tutor respondió que no encuentra el contenido sobre estadificación del cáncer de mama, aunque sabemos que **SÍ está correctamente indexado** en las páginas 371-375 de "Williams Gineco.pdf".

**Problema confirmado:**
- ✅ El contenido existe y está correctamente indexado
- ✅ La función de búsqueda RAG **SÍ funciona** y encuentra resultados
- ❌ Pero encuentra resultados de "Schwartz Principios de Cirugia" en lugar de "Williams Gineco.pdf"
- ❌ "Williams Gineco.pdf" no aparece en los primeros 15 resultados (ranking bajo)
- ❌ El tutor responde que no hay contenido disponible del archivo específico que el usuario está consultando
- ❌ Impacto directo en la experiencia del usuario

**Problema real:** **RANKING/RELEVANCIA** - "Williams Gineco.pdf" tiene menor ranking que "Schwartz" y no aparece en los primeros resultados.

**Causa raíz identificada:**
- ✅ La función RPC SÍ funciona correctamente
- ✅ Williams Gineco.pdf SÍ existe en la tabla `materials` (id: `b34ce313-ee4a-4098-80da-a3b713359db6`)
- ✅ Los chunks SÍ cumplen la búsqueda (`cumple_tsquery: true`)
- ❌ **Williams Gineco.pdf tiene `relevance_score: 0.417`**
- ❌ **Schwartz tiene `relevance_score: 1.0` (más del doble)**
- ❌ Por eso Schwartz aparece primero y Williams Gineco.pdf no aparece en los primeros 15 resultados

**Urgencia:** **ALTA** - Los usuarios no pueden acceder a información que existe en el sistema porque aparece en posiciones bajas del ranking debido a un score de relevancia bajo.

---

## 🎯 Recomendaciones para Usuarios

### Búsquedas que Funcionan Mejor

Dado que la función de búsqueda busca palabras individuales, las siguientes búsquedas tienen mayor probabilidad de éxito:

✅ **Búsquedas recomendadas:**
- "TNM mamario"
- "ganglio linfático mama"
- "estadio mama"
- "cancer mama TNM"

❌ **Búsquedas que NO funcionan actualmente:**
- "estadio cancer mama" (confirmado que no funciona)
- "Estadificación del cáncer mamario" (frase exacta)
- Frases muy específicas con palabras comunes

### Estrategia de Búsqueda

1. **Usar palabras clave:** En lugar de frases completas, usar palabras clave importantes
2. **Simplificar términos:** Evitar acentos o caracteres especiales si es posible
3. **Usar sinónimos:** Probar diferentes términos relacionados (ej: "mama" vs "mamario")
4. **Buscar conceptos relacionados:** Si no encuentra el término exacto, buscar conceptos relacionados (ej: "TNM", "estadio", "ganglio")

---

## 🔧 Soluciones Técnicas Propuestas

### Solución a Corto Plazo

**Mejorar la función de búsqueda para manejar frases exactas:**

```sql
-- Agregar búsqueda de frase exacta como fallback
WHERE (
  -- Búsqueda actual (palabras individuales)
  to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', search_query)
  OR
  -- Búsqueda de frase exacta (con acentos)
  ccc.content ILIKE '%' || search_query || '%'
  OR
  -- Búsqueda de frase exacta (sin acentos - normalizado)
  unaccent(ccc.content) ILIKE '%' || unaccent(search_query) || '%'
)
```

**Ventajas:**
- Mantiene la búsqueda actual (palabras individuales)
- Agrega búsqueda de frase exacta como fallback
- Maneja problemas de acentos

**Desventajas:**
- Puede ser más lento en tablas grandes
- Requiere índice adicional para mejorar rendimiento

### Solución a Mediano Plazo

**Implementar búsqueda híbrida mejorada:**

1. **Búsqueda de texto completo mejorada:**
   - Usar `phraseto_tsquery` para frases exactas
   - Combinar con `websearch_to_tsquery` para palabras individuales
   - Mejorar el ranking de resultados

2. **Normalización de texto:**
   - Normalizar acentos y caracteres especiales
   - Crear índices de texto completo normalizados
   - Mejorar la búsqueda de sinónimos

3. **Búsqueda semántica:**
   - Usar embeddings para búsqueda semántica
   - Combinar con búsqueda de texto completo
   - Mejorar la relevancia de resultados

### Solución a Largo Plazo

**Revisar estrategia de búsqueda RAG:**

1. **Evaluar alternativas:**
   - Elasticsearch para búsqueda de texto completo avanzada
   - Mejoras en PostgreSQL full-text search
   - Búsqueda vectorial mejorada

2. **Optimización de índices:**
   - Crear índices GIN para búsqueda de texto completo
   - Índices para campos normalizados
   - Índices compuestos para búsquedas comunes

---

## 📊 Resultados de Diagnóstico

### Consultas SQL Ejecutadas

1. **Verificación de archivos procesados:**
   - ✅ "Williams Gineco.pdf" está procesado (727 chunks, páginas 1-995)
   - ✅ Otros archivos procesados correctamente

2. **Verificación de contenido:**
   - ✅ Chunks de Williams Gineco.pdf están en páginas 366-370, 371-375
   - ✅ Contenido sobre estadificación existe en páginas 371-375
   - ✅ Información sobre TNM, estadios, ganglios linfáticos está presente

3. **Verificación de búsqueda:**
   - ❌ La función RPC `search_course_content_chunks_text_clean` no encuentra "Estadificación del cáncer mamario"
   - ✅ El contenido existe y está correctamente indexado
   - ❌ Problema identificado: búsqueda de palabras individuales vs frases exactas

### Scripts de Diagnóstico Creados

Todos los scripts están en `sql_scripts/4_diagnostics/`:

- `verificar_archivos_procesados_curso_12.sql` - Lista todos los archivos procesados
- `buscar_williams_gineco_pagina_366_370.sql` - Busca chunks de Williams Gineco.pdf
- `buscar_pagina_370_williams_gineco.sql` - Busca contenido en página 370
- `buscar_texto_exacto_pagina_371_375.sql` - Muestra contenido completo de páginas 371-375
- `verificar_material_id_pagina_370.sql` - Verifica material_id de chunks

---

## 🚨 Problemas Adicionales Detectados

### Chunks con Números de Página Incorrectos

Se encontraron chunks con números de página claramente incorrectos:
- Páginas: `3650`, `3651`, `3652`, etc. (deberían ser `365`, `366`, `367`)
- Esto indica un problema en el procesamiento de algunos PDFs

**Recomendación:** Revisar el proceso de extracción de números de página durante el procesamiento.

### Posible Mezcla de Contenidos

Inicialmente se sospechó que había chunks mezclados entre diferentes materiales, pero después se confirmó que:
- ✅ Los chunks de "Williams Gineco.pdf" están correctamente indexados
- ✅ No hay mezcla de contenidos en este caso específico
- ⚠️ Sin embargo, se encontraron chunks de "Harrison" en páginas donde deberían estar chunks de "Williams Gineco"

**Recomendación:** Revisar si hay casos donde múltiples archivos están procesados para el mismo curso y pueden causar confusión.

---

## 📝 Conclusión

El problema principal es que **"Williams Gineco.pdf" tiene un score de relevancia más bajo (0.417) que "Schwartz" (1.0)**, lo que hace que no aparezca en los primeros 15 resultados de la búsqueda.

**El contenido está correctamente indexado:**
- ✅ Los chunks están en las páginas correctas (371-375)
- ✅ Las palabras "estadio", "cancer", "mama" están presentes
- ✅ Los chunks cumplen la búsqueda de texto completo (`cumple_tsquery: true`)
- ✅ El material existe en la tabla `materials` (id: `b34ce313-ee4a-4098-80da-a3b713359db6`)

**El problema es de ranking:**
- ❌ "Williams Gineco.pdf" tiene `relevance_score: 0.417`
- ❌ "Schwartz" tiene `relevance_score: 1.0` (más del doble)
- ❌ La función RPC devuelve solo los primeros 15 resultados (`result_limit: 15`)
- ❌ Por eso "Schwartz" aparece primero y "Williams Gineco.pdf" no aparece en los primeros 15 resultados

**Solución implementada (Inmediata):**
1. ✅ **Aumentado el límite de resultados** de la función RPC de 15 a 30 para incluir más resultados
   - Cambio realizado en `src/modules/tutor/services/ragService.ts` (líneas 378 y 436)
   - **Impacto:** Puede aumentar el tiempo de respuesta, pero mejora la cobertura de resultados

2. ✅ **Aumentado el número de chunks procesados** de 5 a 15 en el código
   - Cambio realizado en `src/modules/tutor/services/ragService.ts` (línea 484)
   - **Impacto:** Incluye más chunks en el procesamiento inicial

3. ✅ **Aumentado el número de chunks incluidos en el prompt** de 5 a 10
   - Cambio realizado en `src/modules/tutor/services/ragService.ts` (líneas 1354-1355)
   - **Impacto:** Incluye más chunks en el prompt enviado al tutor, mejorando la cobertura

**Nota:** Si el tiempo de respuesta es demasiado alto, considerar reducir los límites o implementar paginación

**Soluciones adicionales recomendadas (Futuro):**
2. **Mejorar el algoritmo de ranking** para considerar la relevancia del contexto y no solo el score de texto completo
3. **Agregar filtros por archivo** si el usuario está buscando en un archivo específico
4. **Mejorar la búsqueda de texto completo** para que el score de relevancia sea más preciso y no favorezca tanto a ciertos archivos

---

## 🔗 Referencias

- Función RPC: `search_course_content_chunks_text_clean` en `sql_scripts/5_fixes/fix_sql_type_error.sql`
- Servicio RAG: `src/modules/tutor/services/ragService.ts`
- Scripts de diagnóstico: `sql_scripts/4_diagnostics/`
- Archivo procesado: `Williams Gineco.pdf` (Material ID: `b34ce313-ee4a-4098-80da-a3b713359db6`)

---

**Última actualización:** Enero 2025
