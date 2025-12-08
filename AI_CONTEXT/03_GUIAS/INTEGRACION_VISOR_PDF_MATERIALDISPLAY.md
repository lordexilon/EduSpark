# 🔗 Guía de Integración del Visor PDF Seguro

**Fecha:** 2025-12-06  
**Estado:**  Integración completa del visor seguro en MaterialDisplay.tsx

---

## ✅ **Paso 1: Límite del Bucket (EJECUTAR PRIMERO)**

Ejecuta este script SQL en Supabase para aumentar el límite a 900 MB:

```sql
-- sql_scripts/increase_materials_bucket_to_900mb.sql
UPDATE storage.buckets 
SET file_size_limit = 943718400  -- 900 MB
WHERE id = 'materials';
```

**Verificar:**
```sql
SELECT 
    id, 
    ROUND(file_size_limit / 1024.0 / 1024.0, 2) as limit_mb
FROM storage.buckets 
WHERE id = 'materials';
-- Debe mostrar: 900.00
```

---

## 🎨 **Paso 2: MaterialDisplay.tsx - Integración Completa**

El import de `SecurePDFViewer` ya está agregado. Ahora necesitas modificar la lógica para usar el visor seguro para PDFs específicos.

### **Dónde Modificar:**

Busca esta sección en `MaterialDisplay.tsx` (alrededor de línea 212):

```typescript
// Si tiene URL y es PDF o link, abrir en visor de documentos
const shouldOpenInViewer = hasUrl && (isReadOnly || (!isDriveFallback && (material.kind === 'pdf' || material.kind === 'link')));
```

### **Agregar esta lógica ANTES:**

```typescript
// Detectar si es un PDF de Supabase Storage que debe usar visor seguro
const isPDF = material.kind === 'pdf' || material.url?.endsWith('.pdf');
const isFromSupabaseStorage = material.url?.includes('supabase.co/storage/v1/object/public/materials');
const shouldUseSecurePDFViewer = isPDF && isFromSupabaseStorage;
```

### **Modificar la función onClick (línea 224 aprox):**

**ANTES:**
```typescript
onClick={useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
  if (hasUrl && shouldOpenInViewer) {
    // código existente...
    setShowDocumentViewer(true);
  }
}, [hasUrl, shouldOpenInViewer])}
```

**DESPUÉS:**
```typescript
onClick={useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
  
  if (hasUrl && shouldOpenInViewer) {
    // Si es PDF de Supabase, usar visor seguro
    if (shouldUseSecurePDFViewer) {
      setShowSecurePDFViewer(true); // Nuevo visor
    } else {
      // Para otros documentos, usar DocumentViewer existente
      if (shouldUseSecureUrl) {
        const generatedSecureUrl = await getSecureUrl();
        if (generatedSecureUrl && generatedSecureUrl !== originalUrl) {
          setSecureUrl(generatedSecureUrl);
        }
      }
      setShowDocumentViewer(true);
    }
  } else {
    console.warn('Material sin URL válida:', material);
    alert('Este material no tiene una URL disponible para visualizar.');
  }
  return false;
}, [hasUrl, shouldOpenInViewer, shouldUseSecurePDFViewer, shouldUseSecureUrl, originalUrl])}
```

### **Al final del componente (después del DocumentViewer, línea 311 aprox):**

Agrega el SecurePDFViewer:

```typescript
{/* Visor de documentos */}
{showDocumentViewer && hasUrl && (
  <DocumentViewer
    material={{
      ...material,
      url: secureUrl || viewLink || material.url,
      allow_download: false,
      allow_print: false,
      allow_view: true,
      metadata: {
        ...material.metadata,
        isReadOnly: isReadOnly || !!secureUrl
      }
    }}
    isOpen={showDocumentViewer}
    onClose={() => {
      setShowDocumentViewer(false);
      setSecureUrl(null);
    }}
  />
)}

{/* NUEVO: Visor seguro de PDF para archivos de Supabase Storage */}
{show SecurePDFViewer && material.url && (
  <SecurePDFViewer
    pdfUrl={material.url}
    title={material.title}
    isOpen={showSecurePDFViewer}
    onClose={() => setShowSecurePDFViewer(false)}
    bucket="materials"
  />
)}
```

---

## 🎯 **Paso 3: OPCIÓN ALTERNATIVA (Más Simple)**

Si quieres probar el visor sin modificar MaterialDisplay.tsx, puedes crear un botón temporal:

### **En SessionDetailPage.tsx o CourseViewPage.tsx:**

```typescript
import SecurePDFViewer from '../components/SecurePDFViewer';
import { useState } from 'react';

// Dentro del componente:
const [pdfViewer, setPdfViewer] = useState({
  isOpen: false,
  url: '',
  title: ''
});

// Donde muestras los materiales, agregar este botón:
{material.kind === 'pdf' && material.url?.includes('supabase') && (
  <button
    onClick={() => setPdfViewer({
      isOpen: true,
      url: material.url,
      title: material.title
    })}
    className="ml-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
  >
    🔒 Vista Segura
  </button>
)}

// Al final del componente:
<SecurePDFViewer
  pdfUrl={pdfViewer.url}
  title={pdfViewer.title}
  isOpen={pdfViewer.isOpen}
  onClose={() => setPdfViewer({ isOpen: false, url: '', title: '' })}
/>
```

---

## 📊 **Paso 4: Verificar la Integración**

### **Checklist:**

1. **Sube un PDF al bucket materials:**
   - Panel de Supabase → Storage → materials → Upload

2. **Asigna el PDF a un curso/sesión:**
   - Ve a la página de edición de curso
   - Agrega el material PDF

3. **Abre el curso como estudiante:**
   - Verifica que el botón "🔒 Vista Segura" aparece
   - Haz clic y confirma que el visor seguro se abre

4. **Prueba las restricciones:**
   - Ctrl+P → Alert de "impresión deshabilitada"
   - Ctrl+S → Alert de "descarga deshabilitada"
   - Clic derecho → Bloqueado

---

## 🔍 **Diagnóstico de Problemas**

### **Error: PDF no se carga**

```typescript
// En la consola del navegador, verificar:
console.log('PDF URL:', material.url);
console.log('Is Supabase:', material.url?.includes('supabase'));
console.log('Is PDF:', material.kind === 'pdf');
```

### **Error: "Access Denied" o 401**

```sql
-- Verificar políticas RLS:
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%PDF Secure%';
-- Debe retornar 4 políticas
```

### **Error: Límite de tamaño**

```sql
-- Verificar límite del bucket:
SELECT 
    id, 
    ROUND(file_size_limit / 1024.0 / 1024.0, 2) as limit_mb
FROM storage.buckets 
WHERE id = 'materials';
-- Debe mostrar: 900.00
```

---

## 📚 **Documentación de Referencia**

- **Componente:** `src/components/SecurePDFViewer.tsx`
- **Ejemplos:** `src/examples/SecurePDFViewer.examples.tsx`
- **Test Page:** `src/pages/TestPDFViewer.tsx`
- **Guía completa:** `AI_CONTEXT/04_FEATURES/IMPLEMENTACION_VISOR_PDF_SEGURO.md`
- **Guía rápida:** `AI_CONTEXT/03_GUIAS/GUIA_RAPIDA_VISOR_PDF_SEGURO.md`

---

## 🎉 **Resumen**

1. ✅ Ejecuta `increase_materials_bucket_to_900mb.sql`
2. ✅ Modifica `MaterialDisplay.tsx` O usa la opción alternativa
3. ✅ Sube un PDF de prueba
4. ✅ Verifica que funciona
5. ✅ Disfruta del visor seguro 🔒

---

**¿Necesitas ayuda con algún paso?** Consulta la documentación completa o la página de prueba que creamos.
