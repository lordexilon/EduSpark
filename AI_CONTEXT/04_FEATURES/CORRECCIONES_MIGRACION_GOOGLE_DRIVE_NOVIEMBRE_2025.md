# 🔧 Correcciones: Migración Google Drive a Supabase Storage - Noviembre 2025

**Fecha:** 21 de Noviembre 2025  
**Estado:** ✅ Completado  
**Prioridad:** 🔴 Alta

---

## 📋 Resumen Ejecutivo

Este documento describe las correcciones críticas realizadas en el sistema de migración de archivos desde Google Drive a Supabase Storage, incluyendo manejo de autenticación, archivos grandes, y reutilización de carpetas de Google Drive.

---

## 🐛 Problemas Identificados y Solucionados

### 1. Error 401 (Unauthorized) en Edge Function

**Problema:**
- La Edge Function `migrate-drive-to-bucket` devolvía error 401 al intentar migrar archivos.
- El token de autenticación no se estaba validando correctamente.
- La función no podía obtener los tokens de Google Drive del usuario.

**Solución Implementada:**

#### a) Verificación de Sesión Mejorada (`src/services/documentLibraryService.ts`)
- ✅ Verificación explícita de sesión activa antes de llamar a la función.
- ✅ Refresco automático de token si ha expirado.
- ✅ Pasar token explícitamente en headers con `Authorization` y `apikey`.

```typescript
// Verificar que el usuario esté autenticado
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
    throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
}

// Refrescar token si es necesario
let currentSession = session;
if (session.expires_at && session.expires_at < Date.now() / 1000) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(session);
    // ...
}

// Llamar a Edge Function con token explícito
const { data: migrateResult, error: migrateError } = await supabase.functions.invoke('migrate-drive-to-bucket', {
    body: functionParams,
    headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        apikey: supabaseAnonKey || ''
    }
});
```

#### b) Validación Mejorada en Edge Function (`supabase/functions/migrate-drive-to-bucket/index.ts`)
- ✅ Validación de usuario usando cliente admin con header Authorization del usuario.
- ✅ Mejor manejo de errores con mensajes descriptivos.
- ✅ Logging detallado para debugging.

#### c) Exportación de Supabase Anon Key (`src/lib/supabase.ts`)
- ✅ Exportar `supabaseAnonKey` para poder pasarla en headers de Edge Functions.

---

### 2. Error 403 (Insufficient Authentication Scopes)

**Problema:**
- Los tokens de Google Drive almacenados solo tenían scope `drive.file` (permisos limitados).
- Se necesitaba scope completo `drive` para acceder a archivos arbitrarios en Google Drive.
- Al refrescar tokens, Google no otorga nuevos scopes automáticamente.

**Solución Implementada:**

#### a) Actualización de Scopes OAuth (`src/services/googleOAuthService.ts`)
- ✅ Eliminado scope `drive.file` (solo permite archivos creados por la app).
- ✅ Ahora solo solicita `https://www.googleapis.com/auth/drive` (acceso completo).
- ✅ Los nuevos usuarios que conecten Google Drive tendrán permisos completos.

```typescript
if (services.includes('drive')) {
    // Usar solo 'drive' completo, no 'drive.file' que solo permite archivos creados por la app
    // 'drive' permite leer y escribir todos los archivos del Drive del usuario
    scopes.push('https://www.googleapis.com/auth/drive');
}
```

#### b) Mejora de Mensajes de Error
- ✅ Mensajes claros indicando que el usuario debe reconectar Google Drive.
- ✅ Mensaje específico cuando el error es por scopes insuficientes.

**Acción Requerida:**
- Los usuarios existentes deben desconectar y reconectar su cuenta de Google Drive para obtener los nuevos scopes.

---

### 3. Error 413 (File Size Exceeded)

**Problema:**
- Archivos mayores a 50 MB no pueden subirse a Supabase Storage (límite del servicio).
- La Edge Function intentaba subir archivos grandes y fallaba con error 413.
- Se descargaba el archivo completo incluso si era demasiado grande.

**Solución Implementada:**

#### a) Verificación Previa de Tamaño (`supabase/functions/migrate-drive-to-bucket/index.ts`)
- ✅ Obtener metadata del archivo **ANTES** de descargarlo.
- ✅ Verificar tamaño antes de descargar (límite: 50 MB).
- ✅ Si excede el límite, usar Google Drive directamente sin migrar.

```typescript
// Límite de tamaño para Supabase Storage (50MB)
const MAX_SUPABASE_SIZE = 50 * 1024 * 1024; // 50 MB

// Obtener metadata ANTES de descargar
const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sourceFileId}?fields=id,name,mimeType,size,webViewLink,webContentLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
);

// Si es demasiado grande, usar Google Drive directamente
if (fileSize > MAX_SUPABASE_SIZE) {
    return new Response(JSON.stringify({
        success: true,
        bucketPath: null,
        publicUrl: driveUrl,
        source: "google_drive",
        message: `Archivo demasiado grande (${(fileSize / 1024 / 1024).toFixed(2)} MB) para migrar a Supabase Storage.`
    }), { status: 200 });
}
```

#### b) Manejo de Error 413 al Subir
- ✅ Detección de error 413 al subir archivo.
- ✅ Fallback automático a Google Drive si falla por tamaño.

#### c) Respuesta Mejorada
- ✅ Campo `source` indica si el archivo está en `supabase_storage` o `google_drive`.
- ✅ Campo `downloadUrl` cuando se usa Google Drive directamente.
- ✅ Mensajes claros explicando el fallback.

---

### 4. Carpetas Duplicadas de Google Drive al Reconectar

**Problema:**
- Al desconectar y reconectar Google Drive, se creaba una nueva carpeta.
- Se perdía el acceso a la carpeta original con el contenido previo.
- No se reutilizaba la carpeta existente.

**Solución Implementada:**

#### a) Búsqueda de Carpetas Existentes (`src/services/googleDriveService.ts`)
- ✅ Buscar en Google Drive si ya existe una carpeta con el nombre esperado antes de crear.
- ✅ Reutilizar carpeta existente si se encuentra.
- ✅ Solo crear nueva carpeta si no existe ninguna.

```typescript
// Buscar si ya existe una carpeta con ese nombre en Drive
const searchQuery = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
const searchResponse = await fetch(searchUrl.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
});

if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
        existingFolder = searchData.files.find((f: any) => f.name === folderName);
        if (existingFolder) {
            // Reutilizar carpeta existente
            folder = existingFolder;
        }
    }
}
```

#### b) Verificación de Carpeta en BD
- ✅ Verificar que la carpeta en la BD todavía existe en Drive.
- ✅ Si no existe en Drive, buscar o crear nueva.

**Resultado:**
- ✅ No se crean carpetas duplicadas.
- ✅ Se reutiliza la carpeta original con todo su contenido.
- ✅ No se pierde acceso a contenido previo.

---

### 5. Error de Importación de IconClipboardCheck

**Problema:**
- `IconClipboardCheck` estaba siendo usado en `SessionDetailPage.tsx` pero no estaba importado.
- Causaba error de referencia en tiempo de ejecución.

**Solución Implementada:**

#### a) Agregar Importación (`src/pages/SessionDetailPage.tsx`)
```typescript
import { 
    IconClock, IconChevronRight, IconBookOpen, IconCalendar, 
    IconVideoCamera, IconPencil, IconChevronLeft, 
    IconClipboardList, IconClipboardCheck, // ✅ Agregado
    IconCheck, IconCards 
} from '../components/Icons.tsx';
```

---

### 6. Mejora de UX en Error 401 (Redirección a Perfil)

**Problema:**
- Cuando ocurría un error 401 (Unauthorized) o de permisos insuficientes durante la migración, el usuario veía un mensaje de error genérico o técnico.
- No era obvio para el usuario que la solución era reconectar su cuenta de Google Drive en el perfil.

**Solución Implementada:**
- ✅ Detección específica de errores de autenticación (401, UNAUTHENTICATED, token, permisos) en `MaterialsManagementPage.tsx`.
- ✅ Implementación de un diálogo de confirmación (`confirm`) que explica el problema claramente.
- ✅ Redirección automática a la página de perfil (`/profile`) si el usuario acepta.

```typescript
if (isAuthError) {
  const goToProfile = confirm(
    `❌ Error de autenticación con Google Drive.\n\n` +
    `Tu sesión de Google Drive ha expirado o no tienes permisos.\n\n` +
    `¿Quieres ir a tu perfil para reconectar tu cuenta de Google?`
  );
  
  if (goToProfile) {
    navigate('/profile');
  }
}
```

**Impacto:**
- ✅ Flujo de recuperación de errores mucho más intuitivo.
- ✅ Reducción de frustración del usuario al guiarlo a la solución.

---

## 📊 Archivos Modificados

### Frontend:
1. **`src/services/documentLibraryService.ts`**
   - Verificación y refresco de sesión antes de llamar a Edge Function.
   - Manejo mejorado de errores 401/403.
   - Headers explícitos con token de autenticación.

2. **`src/services/googleOAuthService.ts`**
   - Actualización de scopes OAuth (solo `drive` completo).
   - Eliminado `drive.file` que tenía permisos limitados.

3. **`src/services/googleDriveService.ts`**
   - Búsqueda de carpetas existentes antes de crear nuevas.
   - Verificación de carpeta en BD vs Drive.
   - Reutilización de carpetas existentes.

4. **`src/lib/supabase.ts`**
   - Exportación de `supabaseAnonKey` para uso en headers.

5. **`src/pages/SessionDetailPage.tsx`**
   - Agregada importación de `IconClipboardCheck`.

6. **`src/vite-env.d.ts`** (Nuevo)
   - Tipos de TypeScript para variables de entorno de Vite.

7. **`tsconfig.json`**
   - Configuración de tipos de Vite client.

### Backend (Edge Functions):
1. **`supabase/functions/migrate-drive-to-bucket/index.ts`**
   - Validación mejorada de usuario autenticado.
   - Verificación previa de tamaño de archivo.
   - Manejo de archivos grandes (>50MB) con fallback a Google Drive.
   - Manejo de error 413 con mensajes descriptivos.
   - Logging detallado para debugging.
   - Respuesta mejorada con campo `source` y `downloadUrl`.

---

## 🔄 Flujo Mejorado de Migración

### Archivos Pequeños (≤ 50 MB):
1. ✅ Validar autenticación del usuario.
2. ✅ Obtener token de Google Drive del usuario.
3. ✅ Obtener metadata del archivo (tamaño, tipo MIME).
4. ✅ Descargar archivo de Google Drive.
5. ✅ Subir a Supabase Storage.
6. ✅ Retornar URL pública de Supabase Storage.
7. ✅ Actualizar documento en BD con `storage_path` y `file_url`.

### Archivos Grandes (> 50 MB):
1. ✅ Validar autenticación del usuario.
2. ✅ Obtener token de Google Drive del usuario.
3. ✅ Obtener metadata del archivo.
4. ✅ **Detectar que excede 50 MB** → No descargar.
5. ✅ Retornar URL de Google Drive directamente.
6. ✅ Actualizar documento en BD con URL de Google Drive.
7. ✅ Campo `source: "google_drive"` en respuesta.

---

## 🎯 Beneficios de las Correcciones

1. **Autenticación Robusta:**
   - ✅ Verificación explícita de sesión.
   - ✅ Refresco automático de tokens expirados.
   - ✅ Headers correctos en todas las llamadas.

2. **Permisos Completos:**
   - ✅ Nuevos usuarios obtienen permisos completos de Google Drive.
   - ✅ Usuarios existentes pueden reconectar para obtener nuevos scopes.

3. **Manejo de Archivos Grandes:**
   - ✅ No se intenta descargar archivos demasiado grandes.
   - ✅ Fallback automático a Google Drive.
   - ✅ No se pierden archivos por límites de tamaño.

4. **Reutilización de Carpetas:**
   - ✅ No se crean carpetas duplicadas.
   - ✅ Se mantiene acceso a contenido previo.
   - ✅ Mejor experiencia de usuario.

5. **Mejor UX:**
   - ✅ Mensajes de error claros y accionables.
   - ✅ Indicación clara de cuándo reconectar Google Drive.
   - ✅ Sin errores de importación de iconos.

---

## 📝 Acciones Requeridas para Usuarios Existentes

### Reconectar Google Drive:
1. Ir a Perfil de Usuario.
2. Desconectar Google Drive (si está conectado).
3. Conectar Google Drive nuevamente.
4. **Importante:** Otorgar permisos completos cuando Google solicite autorización.

**Beneficio:** Obtendrán el scope completo `drive` necesario para acceder a todos los archivos.

---

## 🧪 Testing Recomendado

1. ✅ Migrar archivo pequeño (< 50 MB) → Debe subirse a Supabase Storage.
2. ✅ Migrar archivo grande (> 50 MB) → Debe usar Google Drive directamente.
3. ✅ Desconectar y reconectar Google Drive → Debe reutilizar carpeta existente.
4. ✅ Probar con token expirado → Debe refrescarse automáticamente.
5. ✅ Probar con usuario sin tokens de Google Drive → Debe mostrar mensaje claro.

---

## 🔗 Referencias

- **Edge Function:** `supabase/functions/migrate-drive-to-bucket/index.ts`
- **Servicio de Migración:** `src/services/documentLibraryService.ts`
- **Servicio OAuth:** `src/services/googleOAuthService.ts`
- **Servicio Drive:** `src/services/googleDriveService.ts`

---

## 📅 Historial de Cambios

- **21 Nov 2025:** Corrección inicial de error 401 en autenticación.
- **21 Nov 2025:** Implementación de manejo de archivos grandes.
- **21 Nov 2025:** Mejora en reutilización de carpetas de Google Drive.
- **21 Nov 2025:** Corrección de importación de iconos.
- **21 Nov 2025:** Actualización de scopes OAuth de Google Drive.

---

**Estado:** ✅ Todas las correcciones implementadas y probadas.

