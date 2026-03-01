# Instrucciones: Fix de Función RPC

**Problema:** La función `search_course_content_chunks_text_clean` está devolviendo error 500  
**Causa:** Hay funciones duplicadas y una hace JOIN con tabla `materials` que puede no existir  
**Solución:** Recrear función simplificada sin JOINs

---

## 🔧 Pasos para Aplicar el Fix

### 1. Ejecutar el Script SQL

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Copia y pega el contenido de: `sql_scripts/5_fixes/fix_search_function_signature.sql`
4. Ejecuta el script

### 2. Verificar que la Función Existe

```sql
-- Verificar que solo existe una versión
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'search_course_content_chunks_text_clean';
```

**Resultado esperado:** Solo 1 función con firma: `(text, integer, integer, double precision)`

### 3. Probar la Función

```sql
-- Probar con una query simple
SELECT 
  id,
  metadata->>'file_name' as archivo,
  LEFT(content, 100) as preview
FROM search_course_content_chunks_text_clean(
  'estadio cancer mama',
  12,
  10,
  0.001
)
LIMIT 5;
```

**Resultado esperado:** Debería devolver chunks sin error

---

## ✅ Qué Hace el Fix

1. **Elimina funciones duplicadas:** DROP FUNCTION para todas las versiones
2. **Crea función única simplificada:**
   - Sin JOIN a `materials` (evita errores si la tabla no existe)
   - Usa `websearch_to_tsquery` para mejor búsqueda
   - Filtra por `min_relevance`
   - Marca como `STABLE` para optimización

3. **Firma correcta:** Coincide con lo que espera el código TypeScript:
   ```typescript
   search_course_content_chunks_text_clean(
     search_query: string,
     course_id_param: number,
     result_limit: number,
     min_relevance: number
   )
   ```

---

## ⚠️ Notas

- **STABLE:** Marca la función como estable (no modifica datos, mismo resultado con mismos inputs)
- **Sin JOIN:** Eliminamos el JOIN a `materials` para evitar errores
- **min_relevance:** Se aplica correctamente en el WHERE

---

## 🔍 Si Sigue Fallando

1. **Verificar permisos:**
   ```sql
   -- Verificar que la función tiene permisos
   SELECT 
     proname,
     prosecdef,
     proacl
   FROM pg_proc
   WHERE proname = 'search_course_content_chunks_text_clean';
   ```

2. **Verificar índices:**
   ```sql
   -- Verificar que existe el índice GIN
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'course_content_chunks'
   AND indexdef LIKE '%gin%';
   ```

3. **Verificar tabla:**
   ```sql
   -- Verificar estructura de la tabla
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'course_content_chunks'
   ORDER BY ordinal_position;
   ```

---

**Última actualización:** Enero 2025
