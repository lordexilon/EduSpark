# 📚 Visualización de Materiales en Páginas de Cursos

**Fecha:** Enero 2025  
**Estado:** ✅ **IMPLEMENTADO**  
**Script:** `sql_scripts/153_get_course_materials_including_units.sql` (Actualiza `sql_scripts/148_get_course_materials_including_assigned.sql`)

---

## 📋 Resumen

Solución integral para la visualización de materiales en cursos, asegurando que:
1.  Los materiales asignados a unidades se muestren **solo** dentro de esas unidades (sin duplicados).
2.  Los materiales generales se etiqueten correctamente.
3.  Los archivos de Google Drive sin URL pública sean accesibles mediante un enlace generado dinámicamente.

---

## 🐛 Problemas Identificados y Solucionados

### 1. Duplicidad de Materiales
**Problema:** Los materiales asignados a unidades aparecían dos veces: dentro de la unidad y en la sección general "Otros Materiales".
**Solución:** Se actualizó la función SQL `get_course_materials_including_assigned` para excluir de la lista general cualquier material que ya esté asignado a una unidad del curso.
**Implementación:** Uso de cláusulas `NOT EXISTS` en las consultas de materiales generales.

### 2. Etiquetas Genéricas
**Problema:** La sección general se llamaba "Otros Materiales", lo cual era confuso.
**Solución:** Se renombraron las secciones en `CourseViewPage.tsx`:
- Dentro de unidades: **"Material de la unidad"**
- Sección general: **"Material del curso"**

### 3. Enlaces Rotos de Google Drive
**Problema:** Algunos materiales migrados desde Google Drive no tenían una URL pública (`webViewLink`), por lo que el sistema mostraba "⚠️ Sin URL disponible" y deshabilitaba el acceso.
**Solución:** Se actualizó el componente `MaterialDisplay.tsx` para detectar estos casos.
**Implementación:**
- Si no hay `url` pero existe `metadata.sourceFileId`:
    - Se muestra un botón activo con la etiqueta **"Google Drive"**.
    - Se genera dinámicamente el enlace: `https://drive.google.com/file/d/[ID]/view`.
    - Al hacer clic, se abre el archivo en una nueva pestaña.

---

## ✅ Solución Técnica

### Función SQL Actualizada (`get_course_materials_including_assigned`)

```sql
CREATE OR REPLACE FUNCTION public.get_course_materials_including_assigned(
    p_course_id INTEGER
)
...
AS $$
BEGIN
    RETURN QUERY
    WITH all_materials AS (
        -- 1. Materiales directos: EXCLUIR si ya están asignados a una unidad
        SELECT ...
        FROM public.materials m
        WHERE m.course_id = p_course_id
        AND (
            m.unit_id IS NOT NULL 
            OR NOT EXISTS ( -- Evitar duplicados
                SELECT 1 FROM public.material_unit_assignments mua
                INNER JOIN public.course_units cu ON cu.id = mua.unit_id
                WHERE mua.material_id = m.id AND cu.course_id = p_course_id
            )
        )
        
        UNION
        
        -- 2. Materiales asignados al curso: EXCLUIR si ya están asignados a una unidad
        SELECT ...
        WHERE ...
        AND NOT EXISTS ( -- Evitar duplicados
            SELECT 1 FROM public.material_unit_assignments mua
            INNER JOIN public.course_units cu ON cu.id = mua.unit_id
            WHERE mua.material_id = m.id AND cu.course_id = p_course_id
        )
        
        UNION
        
        -- 3. Materiales asignados a UNIDADES (Se muestran en unidades)
        SELECT ...
        FROM public.material_unit_assignments mua
        ...
    )
    SELECT * FROM all_materials ORDER BY created_at DESC;
END;
$$;
```

### Lógica de Fallback para Google Drive (`MaterialDisplay.tsx`)

```typescript
// Detección de fallback
const sourceFileId = material.metadata?.sourceFileId;
const driveUrl = sourceFileId ? `https://drive.google.com/file/d/${sourceFileId}/view` : null;
const hasUrl = !!material.url || !!driveUrl;

// Renderizado condicional
if (isDriveFallback && driveUrl) {
  return (
    <button onClick={() => window.open(driveUrl, '_blank')}>
      {/* Diseño visual de Google Drive */}
      Compartido en Google Drive ↗
    </button>
  );
}
```

---

## 📊 Páginas Afectadas

### 1. Vista de Curso (`CourseViewPage.tsx`)
- Visualización jerárquica correcta sin duplicados.
- Etiquetas claras de sección.

### 2. Componente de Material (`MaterialDisplay.tsx`)
- Soporte robusto para archivos de Google Drive sin URL pública.
- Mejora visual para indicar la fuente del archivo.

---

## 🚀 Estado Final
- [x] Script SQL optimizado para evitar duplicados ✅
- [x] UI actualizada con etiquetas claras ✅
- [x] Integración de fallback para Google Drive ✅
