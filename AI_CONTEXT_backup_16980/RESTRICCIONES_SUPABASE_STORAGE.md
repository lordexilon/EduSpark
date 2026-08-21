# Solución: Restricciones de Solo Lectura para Supabase Storage

## Problema

Los archivos en Supabase Storage son públicos y NO tienen restricciones de descarga/impresión. Los usuarios pueden:
- ✅ Ver el PDF
- ✅ Descargar el PDF (icono ↓)
- ✅ Imprimir el PDF (icono 🖨️)

## Solución Implementada

### 1. Cloud Function: `servePdfReadOnly`

Una Cloud Function que:
- ✅ **Verifica autenticación** del usuario
- ✅ **Verifica permisos** (estudiante inscrito o profesor)
- ✅ **Sirve el PDF con headers restrictivos**
- ✅ **Previene descarga** con headers HTTP

**Headers aplicados:**
```http
Content-Disposition: inline; filename="document.pdf"
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: default-src 'self'
Cache-Control: no-store, no-cache, must-revalidate, private
X-Download-Options: noopen
```

### 2. Integración en `MaterialDisplay.tsx`

- Detecta materiales con `purpose: 'download'` en Supabase Storage
- Genera URL segura usando la Cloud Function
- Pasa el token de autenticación

### 3. Flujo Completo

```
Usuario hace clic → MaterialDisplay.tsx
                 ↓
    Detecta purpose: 'download' + Supabase Storage
                 ↓
    Genera URL: https://servepdfreadonly...?materialId=xxx&token=yyy
                 ↓
    Cloud Function verifica:
      - Token válido?
      - Usuario tiene acceso al curso?
                 ↓
    Sirve PDF con headers restrictivos
                 ↓
    DocumentViewer muestra PDF
    + Restricciones del navegador (Ctrl+P, Ctrl+S, etc.)
```

## Instalación

### Paso 1: Configurar variables de entorno

```powershell
# Editar .env
VITE_SERVE_PDF_READONLY_URL=https://tu-cloud-function-url
```

### Paso 2: Desplegar Cloud Function

```powershell
cd functions/servePdfReadOnly

# Instalar dependencias
npm install

# Configurar variables
$env:SUPABASE_URL="https://mckfscukxcqwntpjagar.supabase.co"
$env:SUPABASE_SERVICE_KEY="tu_service_key_aqui"

# Desplegar
.\deploy.ps1
```

### Paso 3: Actualizar frontend

Ya está implementado en:
- ✅ `src/components/MaterialDisplay.tsx`
- ✅ Headers restrictivos en Cloud Function
- ✅ Verificación de autenticación y permisos

## Limitaciones

### ⚠️ Lo que NO se puede prevenir:

1. **Capturas de pantalla**: No hay forma técnica de prevenirlas
2. **Copiar contenido visualmente**: El usuario puede ver el contenido
3. **Usuarios técnicos avanzados**: Pueden evadir algunas restricciones

### ✅ Lo que SÍ previene:

1. **Descarga directa**: El icono ↓ no funcionará (headers restrictivos)
2. **Impresión casual**: Ctrl+P bloqueado + headers
3. **Acceso no autorizado**: Solo usuarios autenticados con permisos
4. **Compartir URL**: La URL contiene token que expira
5. **Cache**: Los archivos no se cachean en el navegador

## Comparación de Restricciones

| Método | Descarga | Impresión | Capturas | Complejidad |
|--------|----------|-----------|----------|-------------|
| **Google Drive** | 🟡 Parcial | 🟡 Parcial | ❌ No | 🟢 Baja |
| **Supabase + Cloud Function** | 🟢 Sí | 🟢 Sí | ❌ No | 🟡 Media |
| **Supabase público** | ❌ No | ❌ No | ❌ No | 🟢 Baja |

## Verificación

### 1. Crear material de solo lectura en Supabase:

```sql
-- Actualizar material existente
UPDATE materials
SET purpose = 'download'
WHERE id = 'material-id-aqui';
```

### 2. Verificar que use la Cloud Function:

Abrir consola del navegador y buscar:
```
[MaterialDisplay] URL segura generada para material: xxx
```

### 3. Intentar descargar:

- El icono ↓ del visor PDF debe estar deshabilitado
- Ctrl+S debe mostrar alerta bloqueada
- Ctrl+P debe mostrar alerta bloqueada

## Próximos Pasos (Opcional)

### 1. Watermarking

Agregar marca de agua con información del usuario:
```javascript
// En la Cloud Function
const { PDFDocument } = require('pdf-lib');
// Agregar watermark antes de enviar
```

### 2. Tracking de Visualizaciones

Registrar quién ve qué material:
```javascript
// En la Cloud Function
await supabase.from('material_views').insert({
  material_id: materialId,
  user_id: user.id,
  viewed_at: new Date()
});
```

### 3. Límite de Tiempo

URLs que expiran después de X minutos:
```javascript
// Generar token con expiración
const expiresAt = Date.now() + (15 * 60 * 1000); // 15 min
```

---

**Estado**: ✅ Implementado  
**Fecha**: Diciembre 2025  
**Requiere**: Despliegue de Cloud Function

