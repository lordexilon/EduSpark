# Materiales Solo para RAG - Sin Mostrar a Estudiantes

## Problema

Los libros procesados para RAG se mostraban en la lista de materiales del curso, lo cual no era deseado. El usuario quiere:
- ✅ Procesar libros para RAG (búsqueda semántica con IA)
- ❌ NO mostrar los libros en la lista de materiales del curso
- ✅ La IA puede usar el contenido para responder preguntas

## Solución Implementada

### 1. Campo `purpose` en la tabla `materials`

Ya existe un campo `purpose` con los siguientes valores:
- `'rag'` - Solo para RAG (no mostrar a estudiantes)
- `'download'` - Solo para descarga/visualización (no procesar para RAG)
- `'both'` - Ambos propósitos (procesar Y mostrar)

### 2. Filtro en `CourseViewPage.tsx`

Se agregó un filtro `material.purpose !== 'rag'` en todos los lugares donde se muestran materiales:

#### **Materiales de Unidad** (línea ~568):
```typescript
const unitMaterials = materials.filter((material) =>
  material.unit_id === unit.id && 
  !material.session_id &&
  material.purpose !== 'rag' // Excluir materiales solo para RAG
);
```

#### **Materiales Generales del Curso** (línea ~1156):
```typescript
materials.filter((material) => 
  !material.unit_id && 
  !material.session_id && 
  material.purpose !== 'rag' // Excluir materiales solo para RAG
)
```

#### **Videos del Curso** (línea ~1161):
```typescript
materials.filter((material) => 
  !material.unit_id && 
  !material.session_id && 
  material.purpose !== 'rag' && // Excluir materiales solo para RAG
  isVideoMaterial(material)
)
```

#### **Otros Materiales del Curso** (línea ~1206):
```typescript
const generalOtherMaterials = materials.filter((material) => 
  !material.unit_id && 
  !material.session_id && 
  material.purpose !== 'rag' && // Excluir materiales solo para RAG
  !isVideoMaterial(material)
);
```

### 3. Configuración en `FileProcessingPage.tsx`

Actualizado el código que determina el `purpose` al crear materiales:

```typescript
// Establecer purpose según el tipo de procesamiento
// 'rag' = Solo para RAG (procesar pero NO mostrar a estudiantes)
// 'download' = Solo para descarga/visualización (NO procesar para RAG)
// 'both' = Para RAG Y descarga/visualización
const purpose = ragProcessingType === 'readonly' ? 'download' : 
               ragProcessingType === 'full' ? 'rag' : 
               'rag'; // Por defecto, solo para RAG
```

## Tipos de Materiales Según el Propósito

### Materiales `purpose: 'rag'` (Solo RAG)
- ✅ Se procesan para RAG (embeddings, búsqueda semántica)
- ❌ NO se muestran en la lista de materiales del curso
- ✅ La IA puede usar el contenido para responder preguntas
- **Ejemplo**: Libros de referencia, bibliografía extensa

### Materiales `purpose: 'download'` (Solo Descarga)
- ❌ NO se procesan para RAG
- ✅ Se muestran en la lista de materiales del curso
- ✅ Los estudiantes pueden descargar/visualizar
- **Ejemplo**: Documentos de solo lectura, enlaces externos

### Materiales `purpose: 'both'` (RAG + Descarga)
- ✅ Se procesan para RAG
- ✅ Se muestran en la lista de materiales del curso
- ✅ Los estudiantes pueden descargar/visualizar
- ✅ La IA puede usar el contenido
- **Ejemplo**: Apuntes de clase, documentos clave

## Cómo Crear Materiales Solo para RAG

### Desde `/file-processing`:

1. **Seleccionar archivo** de Google Drive
2. **Analizar archivo**
3. **Elegir tipo de procesamiento:**
   - **"Procesamiento completo RAG"** → `purpose: 'rag'` (no se mostrará a estudiantes)
   - **"Solo visualizar"** → `purpose: 'download'` (se mostrará pero no se procesará)

### Desde SQL (actualizar materiales existentes):

```sql
-- Cambiar material a solo RAG (ocultar a estudiantes)
UPDATE materials
SET purpose = 'rag'
WHERE id = 'material-id-aqui';

-- Cambiar material a descarga (mostrar pero no procesar)
UPDATE materials
SET purpose = 'download'
WHERE id = 'material-id-aqui';

-- Cambiar material a ambos (procesar y mostrar)
UPDATE materials
SET purpose = 'both'
WHERE id = 'material-id-aqui';
```

## Verificación

### Ver materiales solo para RAG:

```sql
SELECT 
  id,
  title,
  purpose,
  rag_status,
  category
FROM materials
WHERE purpose = 'rag'
ORDER BY created_at DESC;
```

### Ver materiales visibles para estudiantes:

```sql
SELECT 
  id,
  title,
  purpose,
  category
FROM materials
WHERE purpose != 'rag' OR purpose IS NULL
ORDER BY created_at DESC;
```

## Resumen

### ✅ Materiales con `purpose: 'rag'`:
- Se procesan para RAG
- NO se muestran a estudiantes
- La IA puede usar el contenido

### ✅ Filtros aplicados:
- `CourseViewPage.tsx` filtra todos los materiales con `purpose === 'rag'`
- Los estudiantes solo ven materiales con `purpose === 'download'` o `purpose === 'both'`

### ✅ Casos de uso:
- Libros de referencia extensos
- Bibliografía completa
- Documentos de apoyo para la IA
- Materiales que no deben descargarse directamente

---

**Última actualización**: Diciembre 2025  
**Estado**: ✅ Implementado y listo para usar

