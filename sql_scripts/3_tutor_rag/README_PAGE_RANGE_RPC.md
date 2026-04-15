# 📄 Scripts para Función RPC de Búsqueda por Rango de Páginas

## 📋 Archivos

1. **172_backup_page_range_rpc.sql** - Hace backup de la función actual
2. **172_verify_fix_page_range_rpc.sql** - Aplica los cambios/mejoras
3. **172_restore_page_range_rpc.sql** - Restaura la función desde backup
4. **172_test_page_range_rpc.sql** - Verifica que la función funciona correctamente (NUEVO)

## 🚀 Orden de Ejecución

### Para aplicar cambios:

```sql
-- Paso 1: Hacer backup (OBLIGATORIO)
\i sql_scripts/3_tutor_rag/172_backup_page_range_rpc.sql

-- Paso 2: Aplicar cambios
\i sql_scripts/3_tutor_rag/172_verify_fix_page_range_rpc.sql

-- Paso 3: Verificar que todo funciona (RECOMENDADO)
\i sql_scripts/3_tutor_rag/172_test_page_range_rpc.sql
```

### Para revertir cambios:

```sql
-- Si algo sale mal, restaurar desde backup
\i sql_scripts/3_tutor_rag/172_restore_page_range_rpc.sql
```

## 📝 Descripción

### 172_backup_page_range_rpc.sql
- Guarda la definición actual de `get_chunks_in_page_range` en la tabla `_function_backups`
- Seguro ejecutar múltiples veces (sobrescribe backup anterior)
- No modifica la función actual

### 172_verify_fix_page_range_rpc.sql
- Verifica si existe la función
- Verifica si hay backup disponible (recomendación)
- Crea/reemplaza la función con:
  - Campo `embedding` incluido en RETURNS TABLE
  - Lógica de solapamiento mejorada para rangos de páginas
  - Soporte para `pageStart/pageEnd` y `page_start/page_end`
  - Ordenamiento que prioriza chunks dentro del rango

### 172_restore_page_range_rpc.sql
- Restaura la función desde el backup más reciente
- Verifica que la restauración fue exitosa
- Solo funciona si existe un backup

### 172_test_page_range_rpc.sql
- Verifica que la función existe y tiene la firma correcta
- Cuenta chunks con información de páginas
- Prueba la función con datos reales (si existen)
- Muestra ejemplos de resultados
- Útil para diagnosticar problemas

## ⚠️ Advertencias

- **Siempre ejecuta el backup primero** antes de aplicar cambios
- La tabla `_function_backups` se crea automáticamente si no existe
- Los backups se guardan permanentemente hasta que los elimines manualmente
- Si ejecutas el backup múltiples veces, solo se guarda el más reciente

## 🔍 Verificar Backups

```sql
-- Ver backups disponibles
SELECT 
  function_name,
  backed_up_at,
  notes,
  LEFT(definition, 200) || '...' as definition_preview
FROM _function_backups
WHERE function_name = 'get_chunks_in_page_range';
```

## 🗑️ Limpiar Backups (Opcional)

```sql
-- Eliminar backup específico
DELETE FROM _function_backups 
WHERE function_name = 'get_chunks_in_page_range';

-- Eliminar tabla de backups completa (solo si estás seguro)
DROP TABLE IF EXISTS _function_backups;
```

