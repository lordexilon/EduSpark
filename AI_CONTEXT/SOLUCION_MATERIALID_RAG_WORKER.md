# Solución: Error "No se proporcionó materialId" en RAG Worker

## Problema Identificado

El rag-worker estaba fallando con el error:
```
Error procesando archivo: No se proporcionó materialId en los metadatos del job. 
El job debe tener un materialId para procesar chunks.
```

Aunque los jobs SÍ tienen `materialId` en los metadatos y también en el campo `material_id` de nivel superior.

## Causa Raíz

El rag-worker solo buscaba `job.metadata.materialId`, pero:
1. El campo `material_id` está en el nivel superior del job (no solo en metadata)
2. Supabase puede devolver `metadata` como string JSON que necesita parsearse
3. No había fallback para usar `job.material_id` si `job.metadata.materialId` no existía

## Solución Implementada

### Cambios en `functions/rag-worker/index.js`

1. **Logging mejorado** para diagnosticar el problema:
   ```javascript
   console.log(`[RAG Worker] Material ID (campo superior): ${job.material_id}`);
   console.log(`[RAG Worker] Metadata completo:`, JSON.stringify(job.metadata, null, 2));
   console.log(`[RAG Worker] Material ID (en metadata): ${job.metadata?.materialId}`);
   ```

2. **Parseo de metadata si viene como string**:
   ```javascript
   if (typeof job.metadata === 'string') {
       try {
           job.metadata = JSON.parse(job.metadata);
           console.log(`[RAG Worker] ✅ Metadata parseado desde string`);
       } catch (e) {
           console.error(`[RAG Worker] ❌ Error parseando metadata:`, e);
       }
   }
   ```

3. **Fallback para obtener materialId**:
   ```javascript
   // Obtener materialId: primero de metadata.materialId, luego de material_id (campo superior)
   const materialId = job.metadata?.materialId || job.material_id;
   ```

4. **Validación mejorada con logging detallado**:
   ```javascript
   if (!materialId) {
       const errorMessage = 'No se proporcionó materialId en los metadatos del job ni en el campo material_id. El job debe tener un materialId para procesar chunks.';
       console.error(`[RAG Worker] ❌ ${errorMessage}`);
       console.error(`[RAG Worker] ❌ Job completo recibido:`, JSON.stringify(job, null, 2));
       throw new Error(errorMessage);
   }
   ```

5. **Asegurar que materialId esté en metadata** para el resto del código:
   ```javascript
   // Asegurar que materialId esté en metadata para el resto del código
   if (!job.metadata) {
       job.metadata = {};
   }
   if (!job.metadata.materialId) {
       job.metadata.materialId = materialId;
       console.log(`[RAG Worker] ✅ MaterialId agregado a metadata desde campo superior: ${materialId}`);
   }
   ```

6. **Actualización de referencias** para usar la variable `materialId` en lugar de `job.metadata.materialId` directamente.

## Próximos Pasos

1. **Desplegar el rag-worker actualizado**:
   ```bash
   cd functions/rag-worker
   firebase deploy --only functions:rag-worker
   ```

2. **Probar con un job pendiente**:
   - Los jobs que estaban fallando ahora deberían procesarse correctamente
   - El Cloud Scheduler procesará jobs pendientes cada 2 minutos

3. **Verificar logs**:
   ```bash
   gcloud functions logs read rag-worker --limit=50
   ```

## Verificación

Después del despliegue, verifica que:
- ✅ Los logs muestren el materialId correctamente
- ✅ Los jobs cambien de `pending` a `processing`
- ✅ El procesamiento continúe normalmente

## Notas

- El código ahora es más robusto y maneja diferentes formatos de datos de Supabase
- Los logs mejorados ayudarán a diagnosticar problemas futuros
- El fallback asegura compatibilidad con jobs antiguos y nuevos

