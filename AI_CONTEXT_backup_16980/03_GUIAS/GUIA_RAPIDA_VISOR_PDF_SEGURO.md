# Guía Rápida: Implementación del Visor Seguro de PDF

**Versión:** 1.0  
**Última actualización:** 2025-12-06  
**Tiempo estimado:** 30 minutos

---

## 🎯 Objetivo

Implementar el visor seguro de PDF en una página de curso existente para que los estudiantes puedan leer documentos pero no descargarlos ni imprimirlos.

---

## ✅ Pre-requisitos

- [ ] Proyecto EduSpark funcionando
- [ ] Acceso al panel de Supabase
- [ ] Archivos PDF subidos a Supabase Storage (o listos para subir)
- [ ] Usuario de prueba con rol `student`

---

## 📝 Pasos de Implementación

### Paso 1: Configurar Supabase Storage (5 min)

1. **Ejecutar el script SQL de configuración:**
   ```bash
   # En el SQL Editor de Supabase, ejecutar:
   sql_scripts/setup_secure_pdf_storage.sql
   ```

2. **Verificar que el bucket se creó correctamente:**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'materials';
   ```
   
   Debe mostrar:
   - `id`: `materials`
   - `public`: `false` (IMPORTANTE)
   - `file_size_limit`: `52428800` (50 MB)

3. **Verificar políticas RLS:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage'
   AND policyname LIKE '%materials%';
   ```

### Paso 2: Verificar el Componente (2 min)

El componente ya está creado en:
```
src/components/SecurePDFViewer.tsx
```

**No requiere modificaciones** para uso básico.

### Paso 3: Integrar en tu Página de Curso (10 min)

#### Opción A: Integración Simple en `SessionDetailPage.tsx`

```typescript
// 1. Importar el componente
import SecurePDFViewer from '../components/SecurePDFViewer';

// 2. Agregar estado
const [pdfViewer, setPdfViewer] = useState({
  isOpen: false,
  url: '',
  title: ''
});

// 3. Crear función para abrir PDF
const handleViewPDF = (material: Material) => {
  setPdfViewer({
    isOpen: true,
    url: material.url || '',
    title: material.title
  });
};

// 4. En el JSX, modificar el botón de visualización
{material.kind === 'pdf' && (
  <button onClick={() => handleViewPDF(material)}>
    Ver Documento Protegido
  </button>
)}

// 5. Agregar el componente al final del JSX
<SecurePDFViewer
  pdfUrl={pdfViewer.url}
  title={pdfViewer.title}
  isOpen={pdfViewer.isOpen}
  onClose={() => setPdfViewer({ isOpen: false, url: '', title: '' })}
/>
```

#### Opción B: Integración con Hook Personalizado

```typescript
// 1. Crear el hook (copiar de examples/SecurePDFViewer.examples.tsx)
import { usePDFViewer } from '../examples/SecurePDFViewer.examples';

// 2. Usar en tu componente
const { openPDF, PDFViewerComponent } = usePDFViewer();

// 3. En el JSX
<button onClick={() => openPDF(material.url, material.title)}>
  Ver PDF
</button>

<PDFViewerComponent />
```

### Paso 4: Probar la Funcionalidad (10 min)

#### Test 1: Visualización Básica
- [ ] Abrir la página del curso
- [ ] Hacer clic en un material PDF
- [ ] Verificar que se abre el visor
- [ ] Verificar que el PDF se carga correctamente

#### Test 2: Restricciones de Seguridad
- [ ] Con el visor abierto, presionar `Ctrl+P` (Windows) o `Cmd+P` (Mac)
- [ ] Debe aparecer un alert: "La impresión está deshabilitada"
- [ ] Presionar `Ctrl+S` / `Cmd+S`
- [ ] Debe aparecer un alert: "La descarga está deshabilitada"
- [ ] Clic derecho en el PDF
- [ ] El menú contextual NO debe aparecer

#### Test 3: Cierre del Visor
- [ ] Hacer clic en el botón X
- [ ] Presionar la tecla `Esc`
- [ ] Hacer clic fuera del visor (en el fondo oscuro)
- [ ] Verificar que el visor se cierra en todos los casos

#### Test 4: Responsive Design
- [ ] Abrir en Desktop (> 768px)
- [ ] Abrir en Tablet (entre 768px y 1200px)
- [ ] Abrir en Móvil (< 768px)
- [ ] Verificar que la interfaz se adapta correctamente

### Paso 5: Configuración Opcional - Audit Log (5 min)

Si deseas rastrear quién accede a qué documentos:

```typescript
// En SecurePDFViewer.tsx o en tu componente que lo usa
import { supabase } from '../lib/supabase';

const logPDFAccess = async (materialId: string, filePath: string) => {
  try {
    await supabase.rpc('log_material_access', {
      p_material_id: materialId,
      p_file_path: filePath,
      p_action: 'view',
      p_ip_address: null, // Opcional: obtener IP del usuario
      p_user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Error logging PDF access:', error);
  }
};

// Llamar esta función cada vez que se abre un PDF
const handleViewPDF = async (material: Material) => {
  await logPDFAccess(material.id, material.url || '');
  
  setPdfViewer({
    isOpen: true,
    url: material.url || '',
    title: material.title
  });
};
```

---

## 🔍 Verificación Final

### Checklist de Funcionalidad

- [ ] **Bucket configurado correctamente**
  ```sql
  SELECT * FROM storage.buckets WHERE id = 'materials';
  -- Verificar que public = false
  ```

- [ ] **Políticas RLS activas**
  ```sql
  SELECT COUNT(*) FROM pg_policies 
  WHERE tablename = 'objects' 
  AND schemaname = 'storage';
  -- Debe mostrar al menos 4 políticas
  ```

- [ ] **Componente integrado**
  - Importación correcta
  - Estado manejado correctamente
  - Props pasados correctamente

- [ ] **Seguridad funcionando**
  - Ctrl+P bloqueado
  - Ctrl+S bloqueado
  - Clic derecho bloqueado
  - Alert mostrados

- [ ] **UX correcta**
  - Indicador de carga visible
  - Manejo de errores funcional
  - Cierre con Esc funcional
  - Responsive en móviles

---

## 🐛 Troubleshooting

### Error: "No se pudo acceder al documento"

**Causa:** El bucket es público o las políticas RLS están mal configuradas.

**Solución:**
```sql
-- Verificar que el bucket es privado
UPDATE storage.buckets 
SET public = false 
WHERE id = 'materials';

-- Re-ejecutar las políticas RLS
-- (copiar de setup_secure_pdf_storage.sql)
```

### Error: "Invalid API key" o 401

**Causa:** El usuario no está autenticado o el token expiró.

**Solución:**
```typescript
// Verificar autenticación
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Si no hay sesión, redirigir al login
if (!session) {
  navigate('/login');
}
```

### El PDF no se carga / pantalla en blanco

**Causa 1:** URL del PDF incorrecta

```typescript
// En la consola del navegador
console.log('PDF URL:', pdfUrl);

// Verificar que la URL es válida
// Debe ser algo como:
// https://xxx.supabase.co/storage/v1/object/public/materials/file.pdf
```

**Causa 2:** Archivo no existe en Supabase

```sql
-- Verificar que el archivo existe
SELECT name, bucket_id 
FROM storage.objects 
WHERE name LIKE '%nombre-del-archivo%';
```

**Causa 3:** CORS bloqueado

```typescript
// En panel de Supabase → Storage → Configuration
// Agregar tu dominio a allowedOrigins:
{
  "allowedOrigins": ["http://localhost:5173", "https://tu-dominio.com"]
}
```

### El visor se abre pero no bloquea Ctrl+P

**Causa:** Los event listeners no se están agregando correctamente

**Solución:**
1. Verificar que el componente está montado
2. Abrir DevTools → Console
3. Verificar que no hay errores de JavaScript
4. Asegurarse de que `isOpen = true` cuando el visor está abierto

### El archivo se descarga al abrir el visor

**Causa:** El navegador está configurado para descargar automáticamente PDFs

**Solución:**
1. En Chrome: Settings → Privacy and security → Site settings → PDF documents → "Open PDFs in Chrome" (activar)
2. En Firefox: Settings → Applications → PDF Document → "Preview in Firefox" (seleccionar)

---

## 📊 Monitoreo y Analytics

### Ver logs de acceso (si implementaste audit log)

```sql
-- Últimos 100 accesos
SELECT * FROM material_access_report 
ORDER BY accessed_at DESC 
LIMIT 100;

-- Documentos más vistos
SELECT 
  material_title,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_id) as unique_users
FROM material_access_report
WHERE action = 'view'
GROUP BY material_title
ORDER BY total_views DESC;

-- Usuarios más activos
SELECT 
  user_name,
  user_email,
  COUNT(*) as total_accesses
FROM material_access_report
GROUP BY user_name, user_email
ORDER BY total_accesses DESC
LIMIT 20;
```

---

## 🚀 Mejoras Futuras

Una vez que el visor básico esté funcionando, considera estas mejoras:

### Mejora 1: Marca de Agua Dinámica
Agregar el nombre del usuario como marca de agua en el PDF para disuadir capturas de pantalla.

### Mejora 2: Límite de Tiempo
Cerrar automáticamente el visor después de un tiempo determinado.

```typescript
// En SecurePDFViewer.tsx
useEffect(() => {
  if (!isOpen) return;
  
  const timeLimit = 30 * 60 * 1000; // 30 minutos
  const timer = setTimeout(() => {
    alert('El tiempo de visualización ha expirado');
    onClose();
  }, timeLimit);
  
  return () => clearTimeout(timer);
}, [isOpen, onClose]);
```

### Mejora 3: Restricción por Rol
Solo estudiantes ven el visor seguro; profesores pueden descargar.

```typescript
const { user } = useAuth();
const useSecureViewer = user?.role === 'student';

{useSecureViewer ? (
  <SecurePDFViewer ... />
) : (
  <a href={material.url} download>Descargar</a>
)}
```

---

## ✅ Checklist Final

- [ ] Bucket configurado y privado
- [ ] Políticas RLS ejecutadas
- [ ] Componente integrado en página de curso
- [ ] Probado con usuario estudiante
- [ ] Restricciones de seguridad verificadas
- [ ] Responsive design verificado
- [ ] Documentación leída
- [ ] (Opcional) Audit log configurado

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar la documentación completa: `AI_CONTEXT/04_FEATURES/IMPLEMENTACION_VISOR_PDF_SEGURO.md`
2. Revisar los ejemplos: `src/examples/SecurePDFViewer.examples.tsx`
3. Verificar la configuración de Supabase
4. Revisar la consola del navegador para errores

---

**¡Listo!** Tu visor seguro de PDF está implementado y funcionando. 🎉
