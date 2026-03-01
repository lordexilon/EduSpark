# Sistema de Importación Masiva de Usuarios

## 📋 Resumen

Sistema completo para crear usuarios masivamente sin confirmación de email, asignándolos automáticamente a instituciones, carreras, materias y cursos. **Actualizado en Enero 2025** con soporte Excel y uso de nombres en lugar de IDs.

## 🎯 Características

- ✅ Creación masiva de usuarios sin confirmación de email
- ✅ Asignación automática a instituciones
- ✅ Asignación a carreras, materias y cursos
- ✅ Soporte para roles: `student`, `teacher`, `admin`, `admin-campus`, `coordinator`
- ✅ **Importación desde Excel (.xlsx, .xls)** ⭐ NUEVO
- ✅ Importación desde CSV o ingreso manual
- ✅ **Uso de nombres en lugar de IDs** (más fácil de usar) ⭐ NUEVO
- ✅ **Campo de documento de identidad** (único e irrepetible) ⭐ NUEVO
- ✅ **Tipo de documento de identidad** (DNI, CEDULA, PASAPORTE, etc.) ⭐ NUEVO
- ✅ Validación de datos antes de importar
- ✅ Generación automática de contraseñas seguras
- ✅ Resolución automática de nombres a IDs
- ✅ Reporte detallado de resultados

## 📁 Archivos Creados/Modificados

### 1. SQL Scripts

#### `sql_scripts/create_bulk_users_function.sql`
- **Función RPC:** `create_user_with_assignments` - Crea un usuario individual con asignaciones
- **Función RPC:** `create_bulk_users` - Crea múltiples usuarios desde un array JSON
- **Características:**
  - Valida datos requeridos
  - Obtiene role_id automáticamente
  - Maneja usuarios existentes (actualiza y asigna)
  - Asigna a institución, carrera y curso
  - Retorna resultados detallados

#### `sql_scripts/151_add_identity_document_verified.sql` ⭐ NUEVO
- Agrega campo `identity_document` a tabla `users`
- Constraint UNIQUE para garantizar unicidad
- Índice parcial para búsquedas rápidas

#### `sql_scripts/153_add_identity_document_type.sql` ⭐ NUEVO
- Agrega campo `identity_document_type` a tabla `users`
- Constraint CHECK para valores válidos: DNI, CEDULA, PASAPORTE, LICENCIA, OTRO

### 2. Edge Function

#### `functions/createBulkUsers/index.ts`
- **Función Edge:** Crea usuarios en `auth.users` sin confirmación de email
- **Características:**
  - Requiere autenticación de admin
  - Usa Supabase Admin API (`service_role_key`)
  - Crea usuarios en `auth.users` con `email_confirm: true`
  - Crea/actualiza en `public.users`
  - Asigna a instituciones, carreras y cursos
  - Genera contraseñas automáticamente si no se proporcionan
  - Retorna contraseñas generadas
  - **Soporta `identity_document` y `identity_document_type`** ⭐ NUEVO

### 3. Servicios

#### `services/bulkUserImportService.ts` ⭐ ACTUALIZADO
- **Servicio TypeScript** para importación masiva
- **Funciones:**
  - `createUserWithAssignments` - Crear usuario individual
  - `createBulkUsers` - Crear múltiples usuarios (usa Edge Function con fallback a RPC)
  - `generateRandomPassword` - Generar contraseña segura
  - `parseCSV` - Parsear CSV a array de usuarios
  - **`parseExcelFile` - Parsear archivo Excel a array de usuarios** ⭐ NUEVO
  - **`resolveIdsFromNames` - Resolver nombres a IDs automáticamente** ⭐ NUEVO
  - `validateUserData` - Validar datos antes de importar (actualizado con validación de documento)

### 4. Página de Administración

#### `pages/BulkUserImportPage.tsx` ⭐ ACTUALIZADO
- **Interfaz completa** para importación masiva
- **Características:**
  - Modo manual: Formulario para agregar usuarios uno por uno
  - **Modo Excel: Importar desde archivo Excel (.xlsx, .xls)** ⭐ NUEVO
  - Modo CSV: Importar desde archivo CSV
  - **Plantilla Excel descargable con 2 hojas (datos e instrucciones)** ⭐ NUEVO
  - **Uso de nombres en lugar de IDs** (institution_name, career_name, subject_name, course_name) ⭐ NUEVO
  - **Campo de tipo de documento de identidad** ⭐ NUEVO
  - Validación en tiempo real
  - Vista previa de usuarios a importar
  - Resolución automática de nombres a IDs
  - Reporte de resultados detallado
  - Manejo de errores mejorado

## 🚀 Uso

### 1. Ejecutar Scripts SQL

```sql
-- Ejecutar en Supabase SQL Editor
-- sql_scripts/create_bulk_users_function.sql
-- sql_scripts/151_add_identity_document_verified.sql
-- sql_scripts/153_add_identity_document_type.sql
```

### 2. Desplegar Edge Function

```bash
# Desde el directorio del proyecto
supabase functions deploy createBulkUsers
```

**Variables de entorno requeridas:**
- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key (solo para Edge Function)

### 3. Acceder a la Página

1. Iniciar sesión como administrador
2. Ir a **Administración > Importación Masiva**
3. Seleccionar modo: **Manual**, **Excel** o **CSV**

### 4. Formato Excel (Recomendado) ⭐ NUEVO

La plantilla Excel incluye:
- **Hoja "Datos":** Ejemplos listos para usar
- **Hoja "Instrucciones":** Guía completa de uso

**Columnas principales:**
- `email` (requerido) - Email del usuario
- `first_name` (requerido) - Nombre
- `last_name` (requerido) - Apellido
- `institution_name` (requerido) - **Nombre de la institución** (no ID)
- `identity_document` (opcional) - Número de documento
- `identity_document_type` (opcional) - Tipo: DNI, CEDULA, PASAPORTE, LICENCIA, OTRO
- `career_name` (opcional) - **Nombre de la carrera** (no ID)
- `subject_name` (opcional) - **Nombre de la materia** (no ID)
- `course_name` (opcional) - **Nombre del curso** (no ID)
- `role` (opcional, default: `student`) - Rol: `student`, `teacher`, `admin`, `admin-campus`, `coordinator`
  - **Nota:** El sistema normaliza automáticamente nombres comunes:
    - `administrador` → `admin`
    - `admin-campos` → `admin-campus`
    - `coordinador` → `coordinator`
    - `docente`, `profesor` → `teacher`
    - `estudiante`, `alumno` → `student`
- `password` (opcional) - Contraseña (se genera automáticamente si está vacía)
- `position` (opcional) - Cargo/posición en la institución

**Ejemplo:**
```
email                          | first_name | last_name  | institution_name      | identity_document | identity_document_type | career_name              | course_name
usuario1@ejemplo.com           | Juan      | Pérez      | Universidad Ejemplo   | 12345678          | DNI                    | Ingeniería en Sistemas  |
usuario2@ejemplo.com           | María     | González   | Universidad Ejemplo   | 87654321          | CEDULA                 | Ingeniería en Sistemas  | Álgebra Lineal
```

### 5. Formato CSV (Alternativa)

```csv
email,password,first_name,last_name,role,institution_name,identity_document,identity_document_type,career_name,subject_name,course_name,position
usuario1@ejemplo.com,Password123!,Juan,Pérez,student,Universidad Ejemplo,12345678,DNI,Ingeniería en Sistemas,,,
usuario2@ejemplo.com,Password123!,María,González,teacher,Universidad Ejemplo,87654321,CEDULA,Ingeniería en Sistemas,Matemáticas,Álgebra Lineal,Profesor de Matemáticas
```

**Nota:** El sistema resuelve automáticamente los nombres a IDs antes de importar.

## 🔄 Resolución de Nombres a IDs

El sistema incluye una función `resolveIdsFromNames` que:

1. **Busca institución por nombre:**
   - Compara `institution_name` con nombres en la base de datos
   - Asigna `institution_id` automáticamente
   - Valida que la institución exista antes de importar

2. **Busca carrera por nombre:**
   - Compara `career_name` con nombres en la base de datos
   - Asigna `career_id` automáticamente
   - Muestra advertencia si no se encuentra

3. **Busca materia por nombre:**
   - Compara `subject_name` con nombres en la base de datos
   - Asigna `subject_id` automáticamente
   - Muestra advertencia si no se encuentra

4. **Busca curso por nombre:**
   - Compara `course_name` con títulos en la base de datos
   - Asigna `course_id` automáticamente
   - Muestra advertencia si no se encuentra

**Ventajas:**
- ✅ Más fácil de usar (no necesitas conocer los IDs)
- ✅ Menos errores (los nombres son más legibles)
- ✅ Validación automática antes de importar

## 📋 Documento de Identidad

### Características

- **Campo único:** `identity_document` es único e irrepetible en la base de datos
- **Tipo de documento:** `identity_document_type` permite categorizar (DNI, CEDULA, PASAPORTE, etc.)
- **Validación:**
  - Mínimo 4 caracteres
  - Sin espacios
  - Único en la base de datos

### Uso

El documento de identidad es **crítico** para:
- Importación masiva de usuarios
- Suspender/Reactivar usuarios masivamente
- Procesar pagos y actualizar estados
- Identificar usuarios además del email

## 🔐 Seguridad

### Edge Function
- ✅ Requiere autenticación (token de sesión)
- ✅ Verifica que el usuario sea `admin`
- ✅ Usa `service_role_key` solo en el servidor
- ✅ Valida todos los datos antes de crear usuarios
- ✅ Valida unicidad de `identity_document`

### Funciones RPC
- ✅ Usan `SECURITY DEFINER` para permisos elevados
- ✅ Validan datos antes de procesar
- ✅ Manejan errores de forma segura
- ✅ Validan constraint UNIQUE de `identity_document`

## 📊 Flujo de Creación

### Con Edge Function (Recomendado)

1. Usuario admin accede a la página
2. Selecciona usuarios a importar (manual, Excel o CSV)
3. **Sistema resuelve nombres a IDs automáticamente** ⭐ NUEVO
4. Frontend llama a Edge Function con token de sesión
5. Edge Function:
   - Verifica que el usuario sea admin
   - Para cada usuario:
     - Valida unicidad de `identity_document` (si se proporciona)
     - Crea en `auth.users` con `email_confirm: true`
     - Crea/actualiza en `public.users` con `identity_document` y `identity_document_type`
     - Asigna a institución
     - Asigna a carrera (si se proporciona)
     - Asigna a curso (si se proporciona)
6. Retorna resultados detallados

### Sin Edge Function (Fallback)

1. Usuario admin accede a la página
2. Selecciona usuarios a importar
3. **Sistema resuelve nombres a IDs automáticamente** ⭐ NUEVO
4. Frontend llama a función RPC `create_bulk_users`
5. Función RPC:
   - Crea solo en `public.users` (no en `auth.users`)
   - Asigna a institución, carrera y curso
   - Nota: El usuario necesitará hacer signup normal o ser creado mediante Admin API

## ⚠️ Limitaciones Actuales

1. **Sin Edge Function:**
   - Los usuarios se crean solo en `public.users`
   - No se crean en `auth.users`
   - Los usuarios necesitarán hacer signup normal

2. **Con Edge Function:**
   - Requiere desplegar la función en Supabase
   - Requiere configurar `SUPABASE_SERVICE_ROLE_KEY`

3. **Resolución de nombres:**
   - Los nombres deben coincidir exactamente (case-insensitive)
   - Si un nombre no se encuentra, se muestra advertencia pero no se bloquea la importación (excepto institución)

## 🔄 Mejoras Implementadas (Enero 2025)

### 1. Soporte Excel ⭐
- Importación desde archivos `.xlsx` y `.xls`
- Plantilla Excel con 2 hojas (datos e instrucciones)
- Parseo automático de columnas
- Validación de formato de archivo

### 2. Uso de Nombres en lugar de IDs ⭐
- `institution_name` en lugar de `institution_id`
- `career_name` en lugar de `career_id`
- `subject_name` en lugar de `subject_id`
- `course_name` en lugar de `course_id`
- Resolución automática de nombres a IDs

### 3. Documento de Identidad ⭐
- Campo `identity_document` (único e irrepetible)
- Campo `identity_document_type` (DNI, CEDULA, PASAPORTE, LICENCIA, OTRO)
- Validación de unicidad
- Integración con sistema de pagos y suspensión

### 4. Validación Mejorada ⭐
- Validación de documento de identidad (mínimo 4 caracteres, sin espacios)
- Validación de nombres antes de resolver a IDs
- Mensajes de error más descriptivos
- Advertencias cuando nombres no se encuentran

## 📝 Notas Importantes

- Los usuarios creados **no requieren confirmación de email** cuando se usa Edge Function
- Las contraseñas generadas automáticamente se retornan en los resultados
- Los usuarios existentes se actualizan y se les asignan nuevas relaciones
- La asignación a carrera y curso es opcional
- Todos los usuarios deben tener una institución asignada (por ID o nombre)
- El documento de identidad es único e irrepetible (crítico para operaciones masivas)
- Los nombres se resuelven automáticamente a IDs antes de importar

## 🐛 Troubleshooting

### Error: "No autorizado"
- Verificar que el usuario sea `admin`
- Verificar que el token de sesión sea válido

### Error: "Edge Function no disponible"
- El sistema usa fallback a función RPC
- Los usuarios se crearán solo en `public.users`
- Para crear en `auth.users`, desplegar Edge Function

### Error: "Faltan datos requeridos"
- Verificar que todos los campos requeridos estén presentes
- Verificar formato del CSV/Excel
- Verificar que `institution_name` o `institution_id` esté presente

### Error: "Institución no encontrada"
- Verificar que el nombre de la institución coincida exactamente con el registrado
- Verificar que la institución exista en la base de datos
- Usar `institution_id` directamente si conoces el ID

### Error: "Documento de identidad duplicado"
- El documento de identidad debe ser único
- Verificar que no exista otro usuario con el mismo documento
- Si es necesario, actualizar el documento existente

### Usuarios no aparecen en auth.users
- Verificar que Edge Function esté desplegada
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurada
- Revisar logs de Edge Function en Supabase Dashboard

### Nombres no se resuelven correctamente
- Verificar que los nombres coincidan exactamente (case-insensitive)
- Verificar que existan en la base de datos
- Usar IDs directamente si conoces los IDs

## 🔗 Integración con Otros Sistemas

### Sistema de Pagos y Suspensión
El campo `identity_document` es crítico para:
- Procesar pagos masivamente desde Excel
- Suspender/Reactivar usuarios masivamente
- Vincular pagos con usuarios

Ver: `SISTEMA_PAGOS_SUSPENSION_AUTOMATICA.md`

### Sistema de Perfil
Los usuarios pueden editar su `identity_document` y `identity_document_type` en:
- `/profile` - Página de perfil del usuario

## 📚 Referencias

- `sql_scripts/151_add_identity_document_verified.sql` - Agregar campo identity_document
- `sql_scripts/153_add_identity_document_type.sql` - Agregar campo identity_document_type
- `sql_scripts/154_create_payments_structure.sql` - Estructura de pagos
- `sql_scripts/155_process_payments_and_update_status.sql` - Procesar pagos masivamente
- `SISTEMA_PAGOS_SUSPENSION_AUTOMATICA.md` - Sistema de pagos y suspensión
