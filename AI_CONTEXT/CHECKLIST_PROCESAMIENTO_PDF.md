# ✅ CHECKLIST: Procesamiento Correcto de PDFs

**Fecha**: 2026-01-12  
**Objetivo**: Asegurar que los PDFs se procesen completamente y correctamente

## 🔧 **MEJORAS APLICADAS AL CÓDIGO**

### **1. Validaciones en `processSplitJob`:**
- ✅ Verifica que `sourceFileName` existe antes de procesar
- ✅ Valida que el archivo descargado no esté vacío
- ✅ Valida que el PDF tenga páginas (no esté corrupto)
- ✅ Advertencia si el PDF tiene muy pocas páginas (ej: Williams con <50 páginas)
- ✅ Asegura que `sourceFileName` se pasa a todos los child jobs
- ✅ Valida que se crearon child jobs antes de marcar como completado

### **2. Validaciones en `processChunkJob`:**
- ✅ Verifica que `sourceFileName` existe antes de procesar
- ✅ Valida que el archivo descargado no esté vacío
- ✅ Verifica que los chunks generados tienen `sourceFileName` en metadata
- ✅ Valida que `sourceFileName` está en los records antes de guardar
- ✅ Logs detallados para debugging

## 📋 **CHECKLIST PARA REPROCESAR**

### **ANTES DE REPROCESAR:**

1. ✅ **Verificar que el archivo en Google Drive está completo**
   - Williams Ginecología debe tener ~995 páginas
   - Verificar tamaño del archivo (debe ser grande, no pequeño)

2. ✅ **Verificar que el worker tiene las mejoras aplicadas**
   - El código debe tener las validaciones añadidas
   - Los logs deben mostrar `sourceFileName` en cada paso

### **DURANTE EL PROCESAMIENTO:**

1. ✅ **Verificar en los logs del worker:**
   ```
   [Split] Archivo: Williams Gineco.pdf, Tipo: text, Páginas: 995
   ```
   - Debe mostrar ~995 páginas (NO 287)
   - Si muestra menos, el archivo está incompleto

2. ✅ **Verificar que se crean todos los child jobs:**
   ```
   [Split] Creando 40 trabajos hijos para procesar 995 páginas
   ```
   - Con CHUNK_SIZE=25, debería crear ~40 jobs (995/25 = 39.8)

3. ✅ **Verificar que cada child job procesa correctamente:**
   ```
   [Chunk] ✅ sourceFileName confirmado en records: "Williams Gineco.pdf"
   ```
   - Cada job debe mostrar este mensaje

### **DESPUÉS DEL PROCESAMIENTO:**

1. ✅ **Verificar en la base de datos:**
   ```sql
   -- Debe mostrar ~995 páginas procesadas
   SELECT 
       MIN(CAST(metadata->>'pageStart' AS INTEGER)) as pagina_min,
       MAX(CAST(metadata->>'pageStart' AS INTEGER)) as pagina_max,
       COUNT(*) as total_chunks
   FROM course_content_chunks
   WHERE metadata->>'sourceFileName' = 'Williams Gineco.pdf'
     AND course_id = 12;
   ```

2. ✅ **Verificar que sourceFileName está en todos los chunks:**
   ```sql
   SELECT 
       COUNT(*) as total_chunks,
       COUNT(CASE WHEN metadata->>'sourceFileName' = 'Williams Gineco.pdf' THEN 1 END) as con_sourceFileName,
       COUNT(CASE WHEN metadata->>'sourceFileName' IS NULL THEN 1 END) as sin_sourceFileName
   FROM course_content_chunks
   WHERE course_id = 12
     AND metadata->>'material_id' = '[ID_DEL_MATERIAL]';
   ```
   - `sin_sourceFileName` debe ser 0

3. ✅ **Verificar que hay chunks en el rango 340-380:**
   ```sql
   SELECT COUNT(*) as chunks_en_rango_340_380
   FROM course_content_chunks
   WHERE course_id = 12
     AND metadata->>'sourceFileName' = 'Williams Gineco.pdf'
     AND CAST(metadata->>'pageStart' AS INTEGER) BETWEEN 340 AND 380;
   ```
   - Debe haber chunks en este rango

4. ✅ **Probar búsqueda en el tutor:**
   - Preguntar: "estadio cancer mama"
   - Debe encontrar información de Williams Gineco.pdf
   - Debe mencionar páginas alrededor de 349-370

## 🚨 **SEÑALES DE PROBLEMA**

### **Si el PDF tiene pocas páginas:**
- ⚠️ Si muestra <50 páginas para Williams → El archivo está incompleto
- ✅ Solución: Verificar que el archivo en Google Drive está completo

### **Si sourceFileName es NULL:**
- ⚠️ Si los chunks no tienen `sourceFileName` → Bug en el worker
- ✅ Solución: Verificar logs del worker, debe mostrar el error

### **Si faltan páginas:**
- ⚠️ Si no hay chunks en rango 340-380 → No se procesaron todas las páginas
- ✅ Solución: Verificar que todos los child jobs se completaron

## 📝 **NOTAS IMPORTANTES**

1. **El worker ahora valida todo**: Si algo falla, lanzará un error claro
2. **Los logs son detallados**: Revisa los logs del worker para ver qué está pasando
3. **El código previene problemas**: Las validaciones aseguran que todo esté correcto antes de guardar

## ✅ **RESULTADO ESPERADO**

Después de reprocesar correctamente:
- ✅ ~995 páginas detectadas
- ✅ ~40 child jobs creados
- ✅ ~1000+ chunks guardados (dependiendo del contenido)
- ✅ Todos los chunks tienen `sourceFileName`
- ✅ Chunks en rango 340-380 disponibles
- ✅ Búsqueda en tutor funciona correctamente
