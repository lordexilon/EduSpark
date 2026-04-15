# Script de Corrección: Aplicar Restricciones a Materiales Existentes

## Problema

Los materiales de solo lectura creados ANTES de la corrección NO tienen restricciones aplicadas.

## Solución

Este script aplica restricciones de solo lectura a todos los materiales existentes que tienen `ragProcessingType: 'readonly'` pero NO tienen `viewLink`.

## Pasos

### 1. Identificar Materiales sin Restricciones

```sql
-- Ver materiales de solo lectura sin viewLink
SELECT 
  id,
  title,
  metadata->>'sourceFileId' as sourceFileId,
  metadata->>'viewLink' as viewLink,
  metadata->>'sharedWithStudents' as shared,
  metadata->>'ragProcessingType' as ragType
FROM materials
WHERE metadata->>'ragProcessingType' = 'readonly'
  AND (metadata->>'viewLink' IS NULL OR metadata->>'viewLink' = '')
ORDER BY created_at DESC;
```

### 2. Aplicar Restricciones (Opción Automática)

Crear un endpoint temporal o ejecutar un script que:

```typescript
// scripts/applyRestrictionsToExistingMaterials.ts

import { supabase } from '../src/lib/supabase';
import { googleDriveService } from '../src/services/googleDriveService';

async function applyRestrictionsToExistingMaterials() {
  console.log('🔄 Iniciando corrección de materiales de solo lectura...');

  // 1. Obtener materiales de solo lectura sin viewLink
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .eq('metadata->>ragProcessingType', 'readonly')
    .is('metadata->>viewLink', null);

  if (error) {
    console.error('❌ Error obteniendo materiales:', error);
    return;
  }

  console.log(`📋 Encontrados ${materials?.length || 0} materiales sin restricciones`);

  let success = 0;
  let failed = 0;

  // 2. Aplicar restricciones a cada material
  for (const material of materials || []) {
    const sourceFileId = material.metadata?.sourceFileId;
    const teacherId = material.course_id; // Necesitas obtener el teacher_id del curso

    if (!sourceFileId) {
      console.warn(`⚠️ Material ${material.id} no tiene sourceFileId, saltando...`);
      failed++;
      continue;
    }

    try {
      // Obtener el teacher_id del curso
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', material.course_id)
        .single();

      if (!course?.teacher_id) {
        console.warn(`⚠️ No se pudo obtener teacher_id para material ${material.id}`);
        failed++;
        continue;
      }

      console.log(`🔄 Aplicando restricciones a: ${material.title} (${sourceFileId})`);

      // Aplicar restricciones
      const result = await googleDriveService.applyReadOnlyRestrictions(
        course.teacher_id,
        sourceFileId
      );

      if (result.success) {
        console.log(`✅ Restricciones aplicadas a: ${material.title}`);
        success++;
      } else {
        console.error(`❌ Error aplicando restricciones a ${material.title}:`, result.error);
        failed++;
      }
    } catch (error) {
      console.error(`❌ Error procesando material ${material.id}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`✅ Exitosos: ${success}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log(`📝 Total: ${(materials?.length || 0)}`);
}

// Ejecutar
applyRestrictionsToExistingMaterials()
  .then(() => console.log('✅ Script completado'))
  .catch((error) => console.error('❌ Error ejecutando script:', error));
```

### 3. Aplicar Restricciones (Opción Manual)

Para cada material sin restricciones:

1. **Ir a "Gestión de Materiales"** (`/teacher/materials`)
2. **Buscar el material** por nombre
3. **Hacer clic en "Compartir con estudiantes"**
4. **Confirmar el compartir**
5. **Las restricciones se aplicarán automáticamente**

## Verificación

Después de ejecutar el script, verificar que los materiales ahora tienen restricciones:

```sql
-- Verificar que las restricciones se aplicaron
SELECT 
  id,
  title,
  metadata->>'sourceFileId' as sourceFileId,
  metadata->>'ragProcessingType' as ragType
FROM materials
WHERE metadata->>'ragProcessingType' = 'readonly'
ORDER BY created_at DESC;
```

Luego, abrir uno de los archivos en Google Drive y verificar:
- "Los lectores pueden descargar, imprimir y copiar" debe estar **DESMARCADO** ❌

## Notas

- El script requiere que el token de Google Drive del docente sea válido
- Si el token expiró, el docente deberá volver a autenticarse
- Los materiales sin `sourceFileId` no pueden ser corregidos automáticamente

