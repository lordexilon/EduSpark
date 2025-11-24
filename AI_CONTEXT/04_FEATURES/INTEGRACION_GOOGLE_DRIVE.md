# Integración de Google Drive en EduSpark

## Estado Actual

### ✅ Implementado

1. **Conexión de Google Drive** (`ProfilePage.tsx`)
   - Los usuarios pueden conectar su cuenta de Google Drive
   - Se crea automáticamente una carpeta personal: "EduSpark - [Nombre Usuario]"
   - La información de la carpeta se guarda en la tabla `users`

2. **Selección de archivos de Drive** (`ModuleEditorPage.tsx`)
   - Los profesores pueden seleccionar archivos de Drive para agregarlos como materiales del curso
   - Usa `openDrivePicker` del servicio `googleDrive.ts`

3. **Servicios disponibles**:
   - `googleDriveService.ts`: Gestión de carpeta personal del usuario
   - `googleDrive.ts`: Selector de archivos (Google Picker API)
   - `googleOAuthService.ts`: Autenticación OAuth extendida para Drive

### 📍 Lugares donde se puede usar Google Drive

#### 1. **Materiales de Curso** ✅ (Ya implementado)
- **Ubicación**: `ModuleEditorPage.tsx`
- **Funcionalidad**: Botón "Agregar desde Drive" para seleccionar archivos
- **Estado**: Funcional

#### 2. **Entregas de Tareas** ⚠️ (Parcial)
- **Ubicación**: `AssignmentsPage.tsx` (línea 338)
- **Funcionalidad actual**: Campo de texto para pegar URL de Drive
- **Mejora sugerida**: Agregar botón para seleccionar archivos directamente desde Drive

#### 3. **Creación de Tareas** ❌ (No implementado)
- **Ubicación**: `CreateEditAssignmentPage.tsx`
- **Funcionalidad sugerida**: Permitir adjuntar archivos de Drive como recursos de la tarea

#### 4. **Mensajería** ❌ (No implementado)
- **Ubicación**: `ChatWindow.tsx`
- **Funcionalidad sugerida**: Permitir compartir archivos de Drive en los mensajes

#### 5. **Sesiones** ❌ (No implementado)
- **Ubicación**: `AddEditSessionPage.tsx`
- **Funcionalidad sugerida**: Permitir adjuntar materiales de Drive a las sesiones

## Mejoras Recomendadas

### Prioridad Alta
1. **Mejorar entregas de tareas** - Agregar botón de selección de Drive
2. **Compartir archivos en mensajería** - Permitir adjuntar archivos de Drive

### Prioridad Media
3. **Adjuntar archivos en tareas** - Al crear tareas, permitir adjuntar recursos
4. **Materiales en sesiones** - Permitir adjuntar archivos a sesiones

## Estructura de Datos

### Tabla `users` (campos agregados)
- `google_drive_folder_id`: ID de la carpeta personal
- `google_drive_folder_url`: URL de la carpeta
- `google_drive_folder_name`: Nombre de la carpeta
- `google_drive_linked_at`: Fecha de vinculación

### Tabla `user_google_tokens` (actualizada)
- `service_type`: Tipo de servicio ('calendar', 'drive', 'both')

## Flujo de Uso

1. **Usuario conecta Drive** → Se crea carpeta personal automáticamente
2. **Usuario selecciona archivo** → Se abre Google Picker
3. **Archivo seleccionado** → Se obtiene URL y se guarda en la aplicación
4. **Archivo compartido** → Se puede acceder desde la aplicación

## Notas Técnicas

- Los tokens OAuth se almacenan de forma segura con RLS
- El sistema detecta automáticamente si el usuario tiene Drive conectado
- Si no está conectado, se muestra mensaje para conectar primero
- La carpeta personal se crea automáticamente al conectar Drive


