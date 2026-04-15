# Resumen: Corrección de Chunks sin material_id

## ✅ Problema Resuelto

Los libros procesados mostraban "0" chunks aunque el procesamiento se completó exitosamente.

## 🔧 Corrección Aplicada

### Archivo: `functions/rag-worker/index.js`

**Línea 541**: Cambiado de:
```javascript
material_id: job.metadata?.materialId,  // ❌ Podía ser undefined
```

A:
```javascript
material_id: materialId,  // ✅ Usa la variable normalizada
```

**Beneficio**: Ahora todos los chunks nuevos se guardarán con `material_id` correctamente, ya que `materialId` se normaliza al inicio del procesamiento (línea 67).

## 📋 Próximos Pasos

### 1. Desplegar el rag-worker corregido

```powershell
cd functions/rag-worker
gcloud functions deploy rag-worker --gen2 --runtime=nodejs20 --region=us-central1 --source=. --entry-point=processRagJobs --trigger-http --allow-unauthenticated --timeout=3600s --memory=4GB --max-instances=10 --project=eduspark-py
```

### 2. Migrar chunks antiguos (Opcional pero Recomendado)

Ejecuta el script SQL en Supabase para asociar chunks antiguos con sus materiales:

**Archivo**: `sql_scripts/migrar_chunks_sin_material_id.sql`

Este script:
- Identifica chunks sin `material_id`
- Los asocia con materiales usando `file_name` y `course_id`
- Actualiza el metadata automáticamente

### 3. Verificar Resultados

Después de la migración, verifica en Supabase:

```sql
-- Ver chunks por material
SELECT 
    m.id,
    m.title,
    COUNT(ccc.id) as chunks_count
FROM materials m
LEFT JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.title LIKE '%Williams Obstetricia%'
GROUP BY m.id, m.title;
```

### 4. Refrescar la Página

- Ve a `/materiales` en el frontend
- Los contadores deberían actualizarse automáticamente
- Si no, recarga la página (F5)

## 🔍 Diagnóstico

Si después de la migración aún ves "0" chunks:

1. **Verificar que los chunks existan**:
   ```sql
   SELECT COUNT(*) 
   FROM course_content_chunks 
   WHERE metadata->>'file_name' LIKE '%Williams Obstetricia%';
   ```

2. **Verificar que tengan material_id**:
   ```sql
   SELECT 
       metadata->>'material_id' as material_id,
       metadata->>'file_name' as file_name,
       COUNT(*) as count
   FROM course_content_chunks
   WHERE metadata->>'file_name' LIKE '%Williams Obstetricia%'
   GROUP BY metadata->>'material_id', metadata->>'file_name';
   ```

3. **Verificar el material_id del material**:
   ```sql
   SELECT id, title, metadata->>'file_name' as file_name
   FROM materials
   WHERE title LIKE '%Williams Obstetricia%';
   ```

4. **Comparar IDs**: El `material_id` en los chunks debe coincidir con el `id` del material.

## 📚 Archivos Creados

- ✅ `sql_scripts/migrar_chunks_sin_material_id.sql` - Script de migración
- ✅ `AI_CONTEXT/SOLUCION_CHUNKS_SIN_MATERIAL_ID.md` - Documentación técnica completa

## ✨ Resultado Esperado

Después de aplicar estas correcciones:

1. ✅ Nuevos chunks siempre tendrán `material_id` correcto
2. ✅ Chunks antiguos migrados tendrán `material_id` asociado
3. ✅ La página de materiales mostrará el conteo correcto
4. ✅ Los materiales estarán disponibles para búsqueda RAG

