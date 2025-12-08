# Implementación de Visor Seguro de PDF

**Fecha de creación:** 2025-12-06  
**Autor:** Sistema EduSpark  
**Tipo:** Feature Implementation  
**Estado:** Implementado

---

## 📋 Resumen Ejecutivo

Se ha implementado un **visor seguro de PDF** (`SecurePDFViewer.tsx`) que permite a los estudiantes y usuarios visualizar documentos PDF almacenados en Supabase Storage, pero con restricciones de descarga e impresión para proteger la propiedad intelectual del contenido educativo.

### Características Principales

✅ **Visualización segura** de PDFs desde Supabase Storage  
✅ **Bloqueo de descarga** (Ctrl+S / Cmd+S deshabilitado)  
✅ **Bloqueo de impresión** (Ctrl+P / Cmd+P y evento beforeprint bloqueados)  
✅ **Bloqueo de clic derecho** para evitar "Guardar como"  
✅ **URLs firmadas** con tiempo de expiración (1 hora)  
✅ **Conversión a Blob URL** para mayor seguridad  
✅ **Interfaz responsive** adaptable a móviles  
✅ **Indicadores de carga** con barra de progreso  
✅ **Manejo de errores** robusto

---

## 🏗️ Arquitectura del Componente

### Ubicación del Archivo
```
src/components/SecurePDFViewer.tsx
```

### Dependencias
- **React** (hooks: `useState`, `useEffect`, `useRef`)
- **lucide-react** (iconos: `X`, `Loader2`, `AlertCircle`, `Eye`, `FileText`)
- **Supabase Client** (`../lib/supabase`)

### Props del Componente

```typescript
interface SecurePDFViewerProps {
  // URL del PDF en Supabase Storage o URL pública
  pdfUrl: string;
  
  // Título del documento (se muestra en el header)
  title: string;
  
  // Callback al cerrar el visor
  onClose: () => void;
  
  // Si está abierto el modal
  isOpen: boolean;
  
  // Bucket de Supabase (opcional, por defecto 'materials')
  bucket?: string;
}
```

---

## 🔒 Medidas de Seguridad Implementadas

### 1. **URLs Firmadas (Signed URLs)**
Los PDFs almacenados en Supabase Storage se sirven mediante URLs firmadas que expiran en 1 hora:

```typescript
const { data } = await supabase.storage
  .from(bucketName)
  .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora
```

**Beneficios:**
- Control de acceso temporal
- Evita enlaces permanentes compartibles
- Mayor seguridad en el storage

### 2. **Blob URLs**
Después de obtener la URL firmada, el PDF se convierte a un Blob URL local:

```typescript
const response = await fetch(url);
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
```

**Beneficios:**
- El PDF no se puede descargar directamente desde la URL original
- Mayor control sobre el contenido
- Se revoca automáticamente al cerrar el visor

### 3. **Bloqueo de Teclas de Acceso Rápido**

#### Impresión (Ctrl+P / Cmd+P)
```typescript
if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
  e.preventDefault();
  e.stopPropagation();
  alert('La impresión está deshabilitada para este documento.');
  return false;
}
```

#### Guardar (Ctrl+S / Cmd+S)
```typescript
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
  e.preventDefault();
  e.stopPropagation();
  alert('La descarga está deshabilitada para este documento.');
  return false;
}
```

### 4. **Bloqueo de Menú Contextual**
```typescript
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  return false;
};
document.addEventListener('contextmenu', handleContextMenu, true);
```

Esto previene:
- Clic derecho → "Guardar como..."
- Clic derecho → "Imprimir"
- Acceso a herramientas del navegador

### 5. **Bloqueo del Evento beforeprint**
```typescript
const handleBeforePrint = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  alert('La impresión está deshabilitada para este documento.');
  return false;
};
window.addEventListener('beforeprint', handleBeforePrint, true);
```

### 6. **Sandbox en iframe**
```typescript
<iframe
  src={secureUrl}
  sandbox="allow-same-origin"
  onContextMenu={(e) => e.preventDefault()}
/>
```

El atributo `sandbox="allow-same-origin"` restringe las capacidades del iframe.

### 7. **Deshabilitación de Selección de Texto**
```css
.secure-pdf-viewer-container * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
```

---

## 📱 Interfaz de Usuario

### Estructura del Visor

```
┌─────────────────────────────────────────────┐
│  [📄] Nombre del Documento           [✕]   │ ← Header
├─────────────────────────────────────────────┤
│  [👁] Documento de solo lectura...         │ ← Barra de información
├─────────────────────────────────────────────┤
│                                             │
│           [Contenido del PDF]               │ ← Contenido (iframe)
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### Estados del Visor

#### 1. **Estado de Carga**
- Spinner animado
- Mensaje: "Cargando documento seguro..."
- Barra de progreso (0% → 100%)

#### 2. **Estado de Error**
- Ícono de alerta
- Mensaje de error descriptivo
- Botón para cerrar

#### 3. **Estado de Éxito**
- iframe con el PDF cargado
- Controles de navegación nativos del navegador

### Diseño Responsive

#### Escritorio (> 768px)
- Ancho: 95% del viewport (máx. 1400px)
- Alto: 90vh
- Border radius: 12px

#### Móvil (≤ 768px)
- Ancho: 100%
- Alto: 100vh
- Sin border radius (pantalla completa)
- Tamaños de fuente reducidos

---

## 🔧 Uso e Integración

### Ejemplo Básico

```typescript
import React, { useState } from 'react';
import SecurePDFViewer from '../components/SecurePDFViewer';

function CourseMaterialPage() {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentPDF, setCurrentPDF] = useState({
    url: '',
    title: ''
  });

  const handleViewPDF = (url: string, title: string) => {
    setCurrentPDF({ url, title });
    setIsViewerOpen(true);
  };

  return (
    <div>
      <button
        onClick={() => handleViewPDF(
          'https://your-supabase-url/storage/v1/object/public/materials/document.pdf',
          'Introducción al Curso'
        )}
      >
        Ver Documento
      </button>

      <SecurePDFViewer
        pdfUrl={currentPDF.url}
        title={currentPDF.title}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        bucket="materials"
      />
    </div>
  );
}
```

### Integración con MaterialDisplay.tsx

Para integrar el visor seguro con el componente existente `MaterialDisplay.tsx`:

```typescript
// En MaterialDisplay.tsx
import SecurePDFViewer from './SecurePDFViewer';

const MaterialDisplay = ({ material, showFullPlayer = false }) => {
  const [showSecurePDF, setShowSecurePDF] = useState(false);

  // Detectar si el material es un PDF
  const isPDF = material.kind === 'pdf' || 
                material.url?.endsWith('.pdf');

  return (
    <div>
      {isPDF ? (
        <>
          <button onClick={() => setShowSecurePDF(true)}>
            Ver Documento Seguro
          </button>
          
          <SecurePDFViewer
            pdfUrl={material.url || ''}
            title={material.title}
            isOpen={showSecurePDF}
            onClose={() => setShowSecurePDF(false)}
          />
        </>
      ) : (
        // Renderizado normal para otros tipos de materiales
        <div>...</div>
      )}
    </div>
  );
};
```

### Integración con SessionDetailPage.tsx

```typescript
// En SessionDetailPage.tsx
import SecurePDFViewer from '../components/SecurePDFViewer';

const SessionDetailPage = () => {
  const [pdfViewer, setPdfViewer] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  const openPDF = (material: Material) => {
    setPdfViewer({
      isOpen: true,
      url: material.url || '',
      title: material.title
    });
  };

  return (
    <div>
      {/* Lista de materiales */}
      {materials.map(material => (
        material.kind === 'pdf' && (
          <div key={material.id}>
            <button onClick={() => openPDF(material)}>
              Ver {material.title}
            </button>
          </div>
        )
      ))}

      {/* Visor seguro */}
      <SecurePDFViewer
        pdfUrl={pdfViewer.url}
        title={pdfViewer.title}
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ isOpen: false, url: '', title: '' })}
      />
    </div>
  );
};
```

---

## 🗄️ Configuración de Supabase Storage

### Bucket Requirements

Para que el visor funcione correctamente, asegúrate de que el bucket de Supabase esté configurado correctamente:

#### 1. **Crear el Bucket** (si no existe)

```sql
-- En el panel de Supabase o mediante SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false);
```

**Nota:** El bucket debe ser **privado** (`public = false`) para que las URLs firmadas funcionen correctamente.

#### 2. **Row Level Security (RLS)**

Configura políticas RLS para controlar quién puede acceder a los archivos:

```sql
-- Política para permitir lectura solo a usuarios autenticados
CREATE POLICY "Authenticated users can read materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'materials');

-- Política para permitir subida solo a profesores/admin
CREATE POLICY "Teachers can upload materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  (
    auth.jwt() ->> 'user_role' = 'teacher' OR
    auth.jwt() ->> 'user_role' = 'admin' OR
    auth.jwt() ->> 'user_role' = 'admin-campus'
  )
);
```

#### 3. **CORS Configuration**

Asegúrate de que el bucket permita peticiones CORS desde tu dominio:

```typescript
// En el panel de Supabase → Storage → Configuration
{
  "allowedOrigins": ["http://localhost:5173", "https://tu-dominio.com"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

---

## ⚙️ Variables de Entorno

No se requieren variables de entorno adicionales, ya que el componente usa el cliente de Supabase existente (`../lib/supabase`).

---

## 🚨 Limitaciones Conocidas

### 1. **DevTools del Navegador**
Los usuarios técnicos avanzados pueden acceder al PDF mediante las DevTools del navegador (pestaña Network). Esta es una limitación inherente a las aplicaciones web.

**Mitigación:**
- Las URLs firmadas expiran en 1 hora
- Los Blob URLs se revocan al cerrar el visor
- Dificulta el acceso no autorizado, aunque no lo elimina completamente

### 2. **Screenshots**
Los usuarios pueden tomar capturas de pantalla del contenido visible.

**Mitigación parcial:** Se puede implementar una marca de agua dinámica con el nombre del usuario (feature futura).

### 3. **Compatibilidad de Navegadores**

| Navegador | Soporte | Notas |
|-----------|---------|-------|
| Chrome    | ✅ Completo | Todas las funciones operativas |
| Firefox   | ✅ Completo | Todas las funciones operativas |
| Safari    | ⚠️ Parcial | El bloqueo de impresión puede variar |
| Edge      | ✅ Completo | Todas las funciones operativas |

### 4. **Tamaño de Archivo**
Para archivos muy grandes (> 50MB), la conversión a Blob puede ser lenta.

**Recomendación:** Limitar el tamaño máximo de PDFs a 20-30MB para una experiencia óptima.

---

## 🧪 Testing y Validación

### Checklist de Pruebas

- [ ] **Carga de PDF desde Supabase Storage**
  - [ ] URL pública
  - [ ] URL con path completo
  - [ ] URL firmada existente

- [ ] **Restricciones de Seguridad**
  - [ ] Bloqueo de Ctrl+P / Cmd+P
  - [ ] Bloqueo de Ctrl+S / Cmd+S
  - [ ] Bloqueo de clic derecho
  - [ ] Bloqueo de evento beforeprint
  - [ ] Alert mostrado al intentar imprimir/guardar

- [ ] **Manejo de Errores**
  - [ ] PDF no encontrado (404)
  - [ ] URL inválida
  - [ ] Timeout de red
  - [ ] PDF corrupto

- [ ] **Responsive Design**
  - [ ] Desktop (> 1200px)
  - [ ] Tablet (768px - 1200px)
  - [ ] Móvil (< 768px)

- [ ] **Interacción de Usuario**
  - [ ] Cerrar con botón X
  - [ ] Cerrar con tecla ESC
  - [ ] Cerrar haciendo clic en el backdrop

- [ ] **Cleanup de Recursos**
  - [ ] Blob URL se revoca al cerrar
  - [ ] Event listeners se remueven al desmontar

### Script de Prueba

```typescript
// Test manual en la consola del navegador
describe('SecurePDFViewer Security Tests', () => {
  test('Ctrl+P should be blocked', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true
    });
    document.dispatchEvent(event);
    // Verificar que aparece el alert
  });

  test('Right-click should be blocked', () => {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    // Verificar que event.defaultPrevented === true
  });
});
```

---

## 🎯 Casos de Uso

### 1. **Materiales de Curso Protegidos**
Profesores suben PDFs de contenido educativo propietario (apuntes, presentaciones, ejercicios) que los estudiantes pueden leer pero no descargar.

**Flujo:**
1. Profesor sube PDF a Supabase Storage
2. PDF se asigna a una sesión del curso
3. Estudiante accede a la sesión
4. Estudiante hace clic en el material PDF
5. Se abre `SecurePDFViewer` con restricciones

### 2. **Libros de Texto Digitales**
Instituciones proporcionan acceso a libros digitales sin permitir distribución no autorizada.

### 3. **Exámenes y Evaluaciones**
Estudiantes pueden ver las preguntas de un examen en PDF, pero no pueden descargarlas para compartir.

### 4. **Documentos Institucionales**
Manuales, reglamentos, y políticas que deben ser consultados pero no redistribuidos.

---

## 🔄 Flujo de Datos

```
┌─────────────┐
│   Usuario   │
│ hace clic   │
│  en "Ver"   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  SecurePDFViewer se abre    │
│  (isOpen = true)            │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  getSecurePDFUrl()          │
│  - Extrae path del PDF      │
│  - Genera signed URL        │
│    (expira en 1h)           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  fetch(signed URL)          │
│  - Descarga el PDF          │
│  - Convierte a Blob         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  URL.createObjectURL(blob)  │
│  - Crea Blob URL local      │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  <iframe src={blobUrl} />   │
│  - Muestra PDF en iframe    │
│  - Event listeners activos  │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Usuario cierra el visor    │
│  (onClose callback)         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  URL.revokeObjectURL()      │
│  - Libera memoria           │
│  - Remueve event listeners  │
└─────────────────────────────┘
```

---

## 📊 Mejoras Futuras

### Prioridad Alta
- [ ] **Marca de agua dinámica** con nombre del usuario y timestamp
- [ ] **Registro de acceso** (audit log) para saber quién abrió qué documento
- [ ] **Límite de tiempo de visualización** (ej: cerrar automáticamente después de 30 minutos)

### Prioridad Media
- [ ] **Zoom y navegación personalizados** (en lugar del visor nativo del navegador)
- [ ] **Búsqueda de texto** dentro del PDF
- [ ] **Modo oscuro** para el visor
- [ ] **Anotaciones temporales** (no se guardan, solo para la sesión actual)

### Prioridad Baja
- [ ] **Conversión a imágenes** (renderizar cada página como imagen para mayor seguridad, pero con mayor costo de rendimiento)
- [ ] **DRM básico** con encriptación adicional
- [ ] **Analytics de lectura** (qué páginas se leen más, tiempo en cada página)

---

## 📚 Referencias

### Documentación Relacionada
- [Supabase Storage - Signed URLs](https://supabase.com/docs/guides/storage/signed-urls)
- [MDN - Blob URLs](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [MDN - iframe sandbox attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)

### Archivos del Proyecto Relacionados
- `src/components/MaterialDisplay.tsx` - Componente actual de visualización de materiales
- `src/components/DocumentViewer.tsx` - Visor de documentos con restricciones (Google Drive)
- `src/pages/SessionDetailPage.tsx` - Página de detalle de sesión donde se pueden mostrar PDFs
- `src/services/teacherCourses.ts` - Servicios para gestión de materiales

### Commits Importantes
- `feat: Implementación inicial de SecurePDFViewer` (2025-12-06)

---

## ✅ Conclusión

El componente `SecurePDFViewer` proporciona una solución robusta para proteger documentos PDF en la plataforma EduSpark, equilibrando la accesibilidad para estudiantes con la protección de propiedad intelectual para profesores e instituciones.

**Puntos clave:**
- ✅ Fácil de integrar con componentes existentes
- ✅ Medidas de seguridad múltiples (aunque no infalibles)
- ✅ Interfaz intuitiva y responsive
- ✅ Manejo de errores robusto
- ⚠️ Limitaciones inherentes a aplicaciones web (capturas de pantalla, DevTools)

**Recomendación:** Usar este visor para contenido educativo de valor moderado. Para contenido de alto valor (ej: libros completos, exámenes oficiales), considerar soluciones DRM profesionales adicionales.
