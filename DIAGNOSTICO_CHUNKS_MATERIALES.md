# Diagnóstico: Chunks en Materiales

## Estado Actual

Según los logs de la consola:

### ✅ Materiales con Chunks Correctamente Asignados

**8 materiales cargados CON chunks** - Estos deberían mostrar el número correcto:
- `82db3bb8-307c-4193-b723-cc69e337568e`: 9 chunks
- `f98a0e8c-a0a2-433d-9ef5-22776250f442`: 3 chunks
- `835086be-010b-45f0-9c66-a47d834d1f6d`: (número en logs)
- `05a1bc7e-3900-4118-a397-62042975537e`: (número en logs)
- `9f911d57-fada-4df1-87fa-36ff455fa1b5`: (número en logs)
- `467bcc8e-03b4-4040-9b9a-0dfc91ad1871`: (número en logs)
- `ff5e9bb4-e5f8-448a-8b29-83aaac41bc51`: (número en logs)
- `79882510-d16f-447b-802a-1f73cdce1c04`: (número en logs)

### ⚠️ Materiales sin Chunks

**2 materiales cargados SIN chunks** - Estos mostrarán "0" (correcto):
- `dc42ade9-4883-4028-8049-693ff86a6763` - Material nuevo (Williams Obstetricia, recién procesado)
- `14aca612-0063-4364-894a-3799171dbc15` - Otro material sin chunks

### 🔴 Materiales con Chunks pero No Cargados

**10 materiales tienen chunks pero no están en la lista cargada**:
- `5e1db902-d5a4-4b85-8faa-14e406bc5bd4`: 121 chunks
- `663db452-170f-4563-9dfe-6d9404cfcda8`: 5 chunks
- `b2385897-209a-483e-89e0-a6f8a9a1e926`: 1 chunk
- `job_temp_1764287631712`: IDs temporales (deberían limpiarse)
- `job_temp_1764334540721`: IDs temporales (deberían limpiarse)
- Y otros 5 materiales más

**Causa**: Estos materiales probablemente pertenecen a otros cursos o fueron creados con IDs temporales durante el procesamiento.

## Solución

### 1. Verificar que los 8 materiales muestren el conteo correcto

El código usa `materialChunks[material.id] || 0` para mostrar el conteo. Si ves "0" en materiales que deberían tener chunks:

1. **Verifica el tooltip**: Pasa el mouse sobre el número de chunks y verifica el Material ID
2. **Compara IDs**: Verifica que el ID del material coincida con el ID en `materialChunks`
3. **Revisa el estado**: El log muestra `Estado de materialChunks después de setMaterialChunks` - verifica que los IDs coincidan

### 2. Limpiar IDs Temporales

Los chunks con `job_temp_*` deberían eliminarse o migrarse a los materiales correctos:

```sql
-- Ver chunks con IDs temporales
SELECT 
    COUNT(*) as total_chunks,
    metadata->>'material_id' as material_id,
    metadata->>'file_name' as file_name
FROM course_content_chunks
WHERE metadata->>'material_id' LIKE 'job_temp_%'
GROUP BY metadata->>'material_id', metadata->>'file_name';

-- Opcional: Eliminar chunks con IDs temporales (CUIDADO)
-- DELETE FROM course_content_chunks WHERE metadata->>'material_id' LIKE 'job_temp_%';
```

### 3. Migrar Materiales Huérfanos

Los materiales con chunks que no están en la lista cargada pueden:
- Pertenecer a otros cursos del profesor
- Necesitar ser asignados a cursos
- Ser materiales antiguos que necesitan limpieza

## Verificación en la UI

Para verificar que los conteos se muestran correctamente:

1. **Pasa el mouse sobre el número de chunks** - El tooltip mostrará el Material ID y el valor en el estado
2. **Compara con los logs** - Los logs muestran exactamente qué materiales tienen chunks y cuántos
3. **Verifica el estado `rag_status`** - Solo los materiales con `rag_status === 'completed'` muestran el conteo

## Próximos Pasos

1. ✅ Verificar que los 8 materiales con chunks muestren el número correcto
2. ⏳ Limpiar IDs temporales (`job_temp_*`)
3. ⏳ Investigar por qué algunos materiales con chunks no se cargan (posiblemente de otros cursos)
4. ⏳ Verificar que el material nuevo (`dc42ade9-4883-4028-8049-693ff86a6763`) se procese correctamente

