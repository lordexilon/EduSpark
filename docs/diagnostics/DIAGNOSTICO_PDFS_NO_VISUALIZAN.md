# 🔍 DIAGNÓSTICO: PDFs No Se Visualizan

**Fecha:** 6 de Diciembre 2025, 03:20 UTC  
**Usuario:** miguec@gmail.com (estudiante)  
**Curso:** ID 12

---

## 📋 Problema Reportado

Los PDFs **NO se visualizan** cuando el estudiante hace clic en ellos desde `/courses/12`.

## 🔍 Análisis de Logs

### ✅ Lo que SÍ está funcionando:

1. **Descarga del PDF:** 
```
✅ DocumentViewer - Archivo descargado exitosamente, tamaño: 1.22 MB tipo: application/pdf
✅ DocumentViewer - Descarga completada, blob URL creada
```

2. **Autenticación:**
```
🔐 Usuario autenticado - auth.uid(): 228e43a9-d78d-4117-ab00-a01a39df51d3
```

3. **Acceso a Supabase Storage:**
```
✅ URL de Supabase Storage pública: https://mckfscukxcqwntpjagar.supabase.co/storage/v1/object/public/course-documents/...
```

### ❌ Lo que NO está funcionando:

1. **NO se está usando la Cloud Function `servePdfReadOnly`**
   - Los logs NO muestran ninguna llamada a la Cloud Function
   - Los PDFs se descargan directamente desde el bucket público

2. **NO se detectan como materiales de solo lectura**
   - NO aparece el log: `[MaterialDisplay] Material de solo lectura detectado`
   - NO aparece el log: `[MaterialDisplay] URL segura generada`

## 🎯 Causa Raíz Identificada

Los materiales **NO tienen `purpose: 'download'`** configurado en la base de datos.

El código en `MaterialDisplay.tsx` tiene esta lógica:

```typescript
// Línea 175-177
const isSupabaseStorage = originalUrl?.includes('supabase.co/storage');
const isReadOnlyDownload = material.purpose === 'download' && isSupabaseStorage;
```

**Si `material.purpose !== 'download'`**, entonces `isReadOnlyDownload = false` y NO usa la Cloud Function.

## 🔧 Solución

Hay **2 opciones**:

### Opción 1: Actualizar los Materiales Existentes (Recomendado)

Ejecutar un script SQL para actualizar los materiales del curso 12:

```sql
-- Actualizar materiales de Supabase Storage para usar la Cloud Function
UPDATE materials 
SET purpose = 'download'
WHERE course_id = 12 
  AND url LIKE '%supabase.co/storage%'
  AND (purpose IS NULL OR purpose != 'download');
```

### Opción 2: Cambiar la Lógica de Detección (Alternativa)

Modificar `MaterialDisplay.tsx` para que TODOS los materiales de Supabase Storage usen la Cloud Function por defecto:

```typescript
// OPCIÓN 2: Usar Cloud Function para TODOS los materiales de Supabase Storage
const isSupabaseStorage = originalUrl?.includes('supabase.co/storage');
const isReadOnlyDownload = isSupabaseStorage; // Simplificado - todos los de Supabase usan Cloud Function
```

## 📊 Verificación en Base de Datos

Para verificar el estado actual de los materiales, ejecutar:

```sql
-- Ver materiales del curso 12 y su campo 'purpose'
SELECT 
  id,
  title,
  purpose,
  CASE 
    WHEN url LIKE '%supabase.co/storage%' THEN 'Supabase Storage'
    WHEN url LIKE '%drive.google.com%' THEN 'Google Drive'
    ELSE 'Otro'
  END as storage_type,
  LEFT(url, 80) as url_preview
FROM materials
WHERE course_id = 12
ORDER BY created_at DESC;
```

**Resultado esperado:**
- Los materiales probablemente tienen `purpose = NULL` o `purpose = 'rag'`
- Necesitan ser actualizados a `purpose = 'download'`

## 🚀 Pasos para Resolver

### 1. Verificar Estado Actual

```sql
SELECT 
  COUNT(*) as total_materiales,
  COUNT(CASE WHEN purpose = 'download' THEN 1 END) as con_purpose_download,
  COUNT(CASE WHEN purpose IS NULL THEN 1 END) as sin_purpose
FROM materials
WHERE course_id = 12
  AND url LIKE '%supabase.co/storage%';
```

### 2. Actualizar Materiales

```sql
-- Actualizar SOLO materiales de Supabase Storage
UPDATE materials 
SET 
  purpose = 'download',
  updated_at = NOW()
WHERE course_id = 12 
  AND url LIKE '%supabase.co/storage%'
  AND (purpose IS NULL OR purpose != 'download');

-- Verificar cambios
SELECT id, title, purpose, rag_status
FROM materials
WHERE course_id = 12
  AND url LIKE '%supabase.co/storage%';
```

### 3. Verificar en Frontend

Después de actualizar la base de datos:

1. **Hard Refresh:** Ctrl + Shift + R
2. Ir a `/courses/12`
3. Hacer clic en un material
4. **Verificar en console** que ahora aparezcan los logs:
   ```
   [MaterialDisplay] Material de solo lectura detectado
   [MaterialDisplay] URL segura generada: https://servepdfreadonly...
   ```

## 🎯 Por Qué No Se Visualiza

El problema NO es que Brave bloquee el contenido. El problema es que:

1. El PDF se descarga directamente desde Supabase Storage público
2. Se crea un blob URL
3. Pero el `DocumentViewer` no puede cargar ese blob URL correctamente por alguna razón

**La solución es usar la Cloud Function**, que:
- Sirve el PDF con headers optimizados
- Evita problemas de cross-origin
- Aplica las restricciones de forma correcta

## 📝 Resumen

| Aspecto | Estado Actual | Estado Deseado |
|---------|--------------|----------------|
| **Descarga** | ✅ Funciona | ✅ Funciona |
| **Cloud Function** | ❌ NO se usa | ✅ Debe usarse |
| **`purpose` en BD** | ❌ NULL o 'rag' | ✅ 'download' |
| **Visualización** | ❌ No funciona | ✅ Debe funcionar |

---

**Próximo paso:** Actualizar el campo `purpose` de los materiales en la base de datos para que usen la Cloud Function.

**Comandos SQL listos para ejecutar** ↑


