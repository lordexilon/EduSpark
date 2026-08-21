# 🔴 DIAGNÓSTICO: Pérdida de Restricciones de Solo Lectura

## Problema Reportado

ANTERIORMENTE pod usuario podía solo compartir la visualización sin poder descargar o imprimir, pero AHORA puede bajar e imprimir.

## Estado de la Implementación

### ✅ Lo que YA ESTÁ implementado correctamente:

1. **`shareFileReadOnly` en `googleDriveService.ts`**: ✅ Funciona correctamente
   - Aplica `copyRequiresWriterPermission: true`
   - Aplica `viewersCanCopyContent: false`
   - Comparte con rol `'reader'`

2. **`shareMaterialWithCourseStudents` en `teacherCourses.ts`**: ✅ Guarda `viewLink` en metadata

3. **`MaterialDisplay.tsx`**: ✅ Detecta y usa `viewLink` si existe

### ❌ Posibles causas del problema:

## DIAGNÓSTICO 1: Archivos Nuevos vs. Archivos Antiguos

Los materiales creados como "solo lectura" en los cambios recientes:
- ✅ Se comparten automáticamente al crearse
- ✅ Tienen `viewLink` en metadata
- ❌ **PROBLEMA**: Pueden NO tener las restricciones aplicadas si el compartir falló

## DIAGNÓSTICO 2: Compartir Automático vs. Manual

### Anterior (funcionaba):
1. Docente creaba material
2. Docente compartía MANUALMENTE desde "Gestión de Materiales"
3. Se aplicaban restricciones con `shareFileReadOnly`
4. Se guardaba `viewLink`

### Actual (puede fallar):
1. Docente crea material como "solo lectura"
2. Se intenta compartir AUTOMÁTICAMENTE en `FileProcessingPage.tsx`
3. **PROBLEMA**: Si no hay estudiantes inscritos, el compartir falla silenciosamente
4. **RESULTADO**: Material sin `viewLink` → Sin restricciones

## DIAGNÓSTICO 3: Restricciones de Google Drive No Aplicadas

Si las restricciones no se están aplicando, puede ser porque:

1. **Token de acceso expirado**: El token de Google Drive del docente no tiene permisos
2. **Error al aplicar restricciones**: La API de Google Drive rechaza las restricciones
3. **Archivo no propiedad del docente**: Solo el propietario puede aplicar restricciones

## Verificación Inmediata

### 1. Verificar si el material tiene `viewLink`:

```sql
SELECT 
  id,
  title,
  metadata->>'viewLink' as viewLink,
  metadata->>'sharedWithStudents' as shared,
  metadata->>'ragProcessingType' as ragType,
  purpose
FROM materials
WHERE metadata->>'ragProcessingType' = 'readonly'
OR purpose = 'download'
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Verificar restricciones en Google Drive:

- Abrir el archivo en Google Drive como propietario
- Ir a "Configuración" → "Opciones de descarga e impresión"
- ¿Está marcada "Los lectores pueden descargar, imprimir y copiar"?
  - ❌ SI está marcada → Las restricciones NO se aplicaron
  - ✅ NO está marcada → Las restricciones SÍ se aplicaron

## Posible Solución

### Opción 1: NO compartir automáticamente al crear

Revertir el compartido automático y dejar que el docente comparta manualmente:
- Ventaja: Control total sobre cuándo se comparte
- Desventaja: Requiere un paso adicional

### Opción 2: Mejorar el compartido automático

Asegurar que el compartido automático funcione correctamente:
- Verificar que hay estudiantes inscritos
- Verificar que el token de Google Drive es válido
- Aplicar restricciones ANTES de compartir
- Mostrar errores claros si algo falla

### Opción 3: Aplicar restricciones al crear el archivo

Aplicar restricciones inmediatamente al crear el material, no al compartir:
- Ventaja: Las restricciones están siempre aplicadas
- Desventaja: Requiere acceso al archivo en Google Drive al crearlo

## Próximos Pasos

1. **Verificar metadata de materiales**: ¿Tienen `viewLink`?
2. **Verificar restricciones en Google Drive**: ¿Están aplicadas?
3. **Revisar logs de compartir**: ¿El compartir automático funcionó?
4. **Probar manualmente**: Compartir un material desde "Gestión de Materiales" y verificar

## Comandos de Verificación

```bash
# Ver materiales de solo lectura
psql -h mckfscukxcqwntpjagar.supabase.co -U postgres -d postgres -c "
SELECT 
  id,
  title,
  metadata->>'viewLink' as viewLink,
  metadata->>'sharedWithStudents' as shared
FROM materials
WHERE metadata->>'ragProcessingType' = 'readonly'
ORDER BY created_at DESC
LIMIT 5;
"
```

