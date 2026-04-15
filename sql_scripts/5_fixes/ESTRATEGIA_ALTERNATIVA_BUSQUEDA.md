# Estrategia Alternativa: Búsqueda RAG sin Full-Text Search

**Problema:** Full-text search sobre 55,473 chunks causa timeout constante  
**Causa:** `to_tsvector` y `websearch_to_tsquery` son muy costosos incluso con índices GIN  
**Solución:** Cambiar estrategia completamente

---

## 🎯 Estrategia Implementada: LIMIT Ultra Temprano

### Concepto
En lugar de buscar en todos los chunks y luego limitar, **limitamos primero** y luego buscamos.

### Flujo
1. **Filtrar por course_id** (usando índice) → Reduce de 55,473 a ~X chunks del curso
2. **Aplicar LIMIT 200** → Reduce a solo 200 chunks
3. **Aplicar filtro full-text** → Solo sobre 200 chunks (MUCHO MÁS RÁPIDO)
4. **Aplicar LIMIT final** → 30 chunks

### Ventajas
- ✅ Reduce drásticamente el dataset antes del filtro costoso
- ✅ Usa índices simples (course_id, created_at) que son muy rápidos
- ✅ El filtro full-text solo se aplica sobre 200 chunks, no 55,473

### Desventajas
- ⚠️ Puede perder chunks relevantes si están fuera de los primeros 200 por fecha
- ⚠️ No considera relevancia de texto (pero el boost en TypeScript compensa)

---

## 🔄 Alternativas Si Sigue Fallando

### Opción 1: Búsqueda por ILIKE (Más Simple)
```sql
-- Usar ILIKE en lugar de full-text search
WHERE lower(ccc.content) ILIKE '%' || lower(search_query) || '%'
```
**Ventaja:** Más rápido que full-text  
**Desventaja:** Menos preciso, no maneja sinónimos

### Opción 2: Búsqueda Solo por Metadata
```sql
-- Buscar solo en metadata (file_name, material_title)
WHERE ccc.metadata->>'file_name' ILIKE '%' || search_query || '%'
   OR ccc.metadata->>'material_title' ILIKE '%' || search_query || '%'
```
**Ventaja:** MUY rápido (metadata es pequeño)  
**Desventaja:** No busca en contenido

### Opción 3: Usar Solo Búsqueda Vectorial
```sql
-- Saltar full-text search completamente, usar solo embeddings
-- (ya implementado como fallback en TypeScript)
```
**Ventaja:** Embeddings ya están calculados  
**Desventaja:** Requiere generar embedding de la query (costo API)

### Opción 4: Pre-filtrar por Materiales Prioritarios
```sql
-- Si sabemos qué materiales buscar, filtrar primero por material_id
WHERE ccc.metadata->>'material_id' IN ('id1', 'id2', ...)
```
**Ventaja:** Reduce dataset drásticamente  
**Desventaja:** Requiere conocer materiales prioritarios por query

---

## 📊 Comparación de Estrategias

| Estrategia | Velocidad | Precisión | Complejidad |
|------------|-----------|-----------|-------------|
| **Full-text (actual)** | ❌ Timeout | ✅ Alta | Media |
| **LIMIT temprano (implementada)** | ✅ Rápida | ⚠️ Media | Baja |
| **ILIKE** | ✅ Muy rápida | ⚠️ Baja | Muy baja |
| **Solo metadata** | ✅ Muy rápida | ❌ Muy baja | Muy baja |
| **Solo vectorial** | ✅ Rápida | ✅ Alta | Media |
| **Pre-filtrar materiales** | ✅ Muy rápida | ✅ Alta | Alta |

---

## ✅ Recomendación

**Estrategia actual (LIMIT temprano):**
- ✅ Debería funcionar si el índice de `course_id` existe
- ✅ Si falla, verificar que el índice existe y está siendo usado

**Si sigue fallando:**
1. **Verificar índices:** Asegurar que `idx_course_content_chunks_course_id` existe
2. **Probar ILIKE:** Cambiar a búsqueda ILIKE simple
3. **Usar solo vectorial:** Desactivar full-text search, usar solo embeddings

---

**Última actualización:** Enero 2025
