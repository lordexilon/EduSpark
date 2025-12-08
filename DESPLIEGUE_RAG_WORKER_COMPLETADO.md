# ✅ Despliegue del RAG Worker Completado

## Estado del Despliegue

**Fecha**: 2025-12-05  
**Revisión**: `rag-worker-00018-pih`  
**Estado**: ✅ ACTIVE  
**URL**: `https://us-central1-eduspark-py.cloudfunctions.net/rag-worker`

## Cambios Desplegados

### Corrección Principal: material_id en Chunks

**Archivo**: `functions/rag-worker/index.js` (línea 541)

**Antes**:
```javascript
material_id: job.metadata?.materialId,  // ❌ Podía ser undefined
```

**Ahora**:
```javascript
material_id: materialId,  // ✅ Variable normalizada garantizada
```

### Mejoras Incluidas

1. ✅ **Normalización de materialId**: El código ahora busca `materialId` en múltiples ubicaciones y lo normaliza al inicio
2. ✅ **Parseo de metadata**: Si metadata viene como string, se parsea automáticamente
3. ✅ **Logging mejorado**: Logs detallados para diagnóstico
4. ✅ **Fallback robusto**: Usa `job.material_id` si no está en metadata

## Configuración Desplegada

- **Runtime**: nodejs20
- **Región**: us-central1
- **Memoria**: 4GB
- **Timeout**: 3600s (1 hora)
- **Máx. Instancias**: 10
- **Trigger**: HTTP (sin autenticación)

### Variables de Entorno

- ✅ `SUPABASE_URL`: https://mckfscukxcqwntpjagar.supabase.co
- ✅ `SUPABASE_SERVICE_KEY`: Configurada
- ✅ `LOG_EXECUTION_ID`: true

## Próximos Pasos

### 1. Verificar Funcionamiento

Espera 2-3 minutos y verifica que los jobs pendientes se procesen:

```powershell
# Ver logs recientes
gcloud functions logs read rag-worker --region=us-central1 --limit=20

# Buscar logs relacionados con materialId
gcloud functions logs read rag-worker --region=us-central1 --limit=50 | Select-String -Pattern "materialId|Material|✅|❌"
```

### 2. Probar con un Job Nuevo

1. Ve a `/file-processing` en el frontend
2. Crea un nuevo job de procesamiento
3. Verifica que:
   - El job cambie de `pending` a `processing` rápidamente
   - Los chunks se guarden con `material_id` correcto
   - El contador en `/materiales` muestre el número correcto

### 3. Migrar Chunks Antiguos (Opcional)

Si tienes chunks antiguos sin `material_id`, ejecuta el script de migración:

**Archivo**: `sql_scripts/migrar_chunks_sin_material_id.sql`

Esto asociará chunks antiguos con sus materiales usando `file_name` y `course_id`.

## Resultado Esperado

Después de este despliegue:

1. ✅ **Nuevos chunks** siempre tendrán `material_id` correcto
2. ✅ **Jobs pendientes** se procesarán automáticamente cada 2 minutos (Cloud Scheduler)
3. ✅ **Contadores en `/materiales`** mostrarán el número correcto de chunks
4. ✅ **Búsquedas RAG** podrán filtrar por material específico

## Verificación de Éxito

Para verificar que todo funciona:

```sql
-- En Supabase SQL Editor
-- Verificar que nuevos chunks tengan material_id
SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN metadata->>'material_id' IS NOT NULL THEN 1 END) as chunks_con_material_id
FROM course_content_chunks
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Notas

- El Cloud Scheduler (`rag-worker-scheduler`) está configurado y activo
- Los jobs se procesarán automáticamente cada 2 minutos
- Los logs mejorados ayudarán a diagnosticar cualquier problema futuro

---

**Despliegue completado exitosamente** ✅

