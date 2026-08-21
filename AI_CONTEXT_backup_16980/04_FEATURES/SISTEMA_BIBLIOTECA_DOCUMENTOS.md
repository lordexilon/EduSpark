# 📚 Sistema de Biblioteca de Documentos

**Fecha de implementación:** Noviembre 2025  
**Estado:** ✅ **IMPLEMENTADO Y FUNCIONAL**

---

## 📋 Resumen

Sistema de biblioteca centralizada que permite gestionar documentos procesados y asignarlos a múltiples cursos. Los documentos procesados con RAG pueden ser reutilizados en diferentes cursos sin necesidad de reprocesarlos.

---

## 🗄️ Estructura de Base de Datos

### Tabla: `processed_documents`
Biblioteca centralizada de documentos procesados por institución.

```sql
CREATE TABLE processed_documents (
    id UUID PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    total_chunks INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'completed',
    processed_by UUID REFERENCES users(id),
    storage_path TEXT, -- Ruta en Supabase Storage
    original_source TEXT, -- google_drive, supabase, upload
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `document_course_assignments`
Relación many-to-many entre documentos y cursos.

```sql
CREATE TABLE document_course_assignments (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES processed_documents(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, course_id)
);
```

### Tabla: `document_career_assignments` ⭐ NUEVO
Relación many-to-many entre documentos y carreras.

```sql
CREATE TABLE document_career_assignments (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES processed_documents(id) ON DELETE CASCADE,
    career_id INTEGER REFERENCES careers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, career_id)
);
```

### Tabla: `document_unit_assignments` ⭐ NUEVO
Relación many-to-many entre documentos y unidades.

```sql
CREATE TABLE document_unit_assignments (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES processed_documents(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, unit_id)
);
```

### Tabla: `document_session_assignments` ⭐ NUEVO
Relación many-to-many entre documentos y sesiones.

```sql
CREATE TABLE document_session_assignments (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES processed_documents(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, session_id)
);
```

---

## 🔐 Permisos y Acceso

### Roles y Acceso:

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| **Admin** | Todos los documentos | Ve y gestiona documentos de todas las instituciones |
| **Admin-campus** | Documentos de su institución | Ve y gestiona documentos de su institución |
| **Coordinator** | Documentos de su institución | Ve y gestiona documentos de su institución |
| **Teacher** | Documentos asignados | Ve documentos asignados a sus cursos |

### Políticas RLS:

- **Admin:** Acceso completo sin necesidad de `institution_id`
- **Admin-campus/Coordinator:** Acceso a documentos de su institución (requiere `institution_id`)
- **Teacher:** Acceso a documentos asignados a sus cursos

---

## 🎨 Interfaz de Usuario

### Página: `/admin/documents`

**Ruta:** `src/pages/DocumentLibraryPage.tsx`

**Funcionalidades:**
- ✅ Lista de todos los documentos procesados
- ✅ Filtrado por institución (automático según rol)
- ✅ Vista de estado de procesamiento
- ✅ Asignación de documentos a múltiples cursos, carreras, unidades y sesiones ⭐ ACTUALIZADO
- ✅ Visualización segura de documentos
- ✅ Migración de documentos a Supabase Storage
- ✅ **Migración desde Google Drive:** Botón para migrar documentos desde Google Drive a Supabase Storage (solo admin)
- ✅ **Detección automática:** Detecta automáticamente si un documento tiene `sourceFileId` disponible para migración
- ✅ **Tabla ampliada:** Ancho mínimo de 1600px con mejor visualización ⭐ NUEVO
- ✅ **Cambio de institución:** Admin puede cambiar la institución de un documento ⭐ NUEVO

**Componentes relacionados:**
- `DocumentAssignmentModal.tsx` - Modal para asignar documentos a cursos, carreras, unidades y sesiones
- `SecureDocumentViewer.tsx` - Visor seguro de documentos

---

## 🔧 Servicios

### `documentLibraryService.ts`

**Funciones principales:**
- `getDocumentsByRole(role, institutionId)` - Obtener documentos según rol
- `getInstitutionDocuments(institutionId)` - Documentos de una institución
- `assignDocumentToCareers(documentId, careerIds[], notes?)` - Asignar a carreras ⭐ NUEVO
- `assignDocumentToCourses(documentId, courseIds[], notes?)` - Asignar a cursos
- `assignDocumentToUnits(documentId, unitIds[], notes?)` - Asignar a unidades ⭐ NUEVO
- `assignDocumentToSessions(documentId, sessionIds[], notes?)` - Asignar a sesiones ⭐ NUEVO
- `getDocumentCareers(documentId)` - Obtener carreras asignadas ⭐ NUEVO
- `getDocumentCourses(documentId)` - Obtener cursos asignados
- `getDocumentUnits(documentId)` - Obtener unidades asignadas ⭐ NUEVO
- `getDocumentSessions(documentId)` - Obtener sesiones asignadas ⭐ NUEVO
- `updateDocumentInstitution(documentId, institutionId)` - Cambiar institución ⭐ NUEVO
- `getAvailableCareers(institutionId?)` - Obtener carreras disponibles ⭐ NUEVO
- `getAvailableCourses(institutionId?)` - Obtener cursos disponibles
- `getAvailableUnits(courseId)` - Obtener unidades disponibles ⭐ NUEVO
- `getAvailableSessions(courseId)` - Obtener sesiones disponibles ⭐ NUEVO
- `assignDocumentToCareers(documentId, careerIds[], notes?)` - Asignar a carreras ⭐ NUEVO
- `assignDocumentToCourses(documentId, courseIds[], notes?)` - Asignar a cursos (actualizado para múltiples)
- `assignDocumentToUnits(documentId, unitIds[], notes?)` - Asignar a unidades ⭐ NUEVO
- `assignDocumentToSessions(documentId, sessionIds[], notes?)` - Asignar a sesiones ⭐ NUEVO
- `getDocumentCareers(documentId)` - Obtener carreras asignadas ⭐ NUEVO
- `getDocumentCourses(documentId)` - Cursos asignados a un documento
- `getDocumentUnits(documentId)` - Obtener unidades asignadas ⭐ NUEVO
- `getDocumentSessions(documentId)` - Obtener sesiones asignadas ⭐ NUEVO
- `getCourseDocuments(courseId)` - Documentos asignados a un curso
- `getAvailableCareers(institutionId?)` - Obtener carreras disponibles ⭐ NUEVO
- `getAvailableCourses(institutionId?)` - Obtener cursos disponibles
- `getAvailableUnits(courseId)` - Obtener unidades disponibles ⭐ NUEVO
- `getAvailableSessions(courseId)` - Obtener sesiones disponibles ⭐ NUEVO
- `updateDocumentInstitution(documentId, institutionId)` - Cambiar institución ⭐ NUEVO
- `getDocumentSourceFileId(documentId)` - Obtener sourceFileId de Google Drive para un documento
- `migrateDocumentFromDrive(documentId, sourceFileId, fileName, mimeType)` - Migrar documento desde Google Drive a Supabase Storage

---

## 📊 Procesamiento de Archivos Grandes

### Capacidad Actual:

- ✅ **Archivos hasta 468 MB** (2397 páginas) - Procesamiento completo
- ✅ **Archivos hasta 850 MB** (4350+ páginas) - Procesamiento completo
- ✅ **Timeout aumentado:** 540s (9 minutos) en Cloud Functions
- ✅ **Statement timeout:** 600s (10 minutos) en Supabase
- ✅ **Memoria:** 4GiB
- ✅ **CPU:** 2 vCPU
- ✅ **Continuación automática:** Si se acerca al timeout, guarda progreso y continúa

### Optimizaciones:

- Procesamiento en lotes de 20 chunks
- 60 páginas por chunk (optimizado para reducir costos)
- Liberación de memoria después de cada lote
- Retry automático en caso de timeout

---

## 🚀 Scripts SQL Relacionados

| Script | Descripción |
|--------|-------------|
| `143_create_material_course_assignments.sql` | Asignación múltiple de materiales a cursos ⭐ NUEVO |
| `142_fix_document_assignments_rls_and_functions.sql` | Fix RLS y funciones de asignación de documentos ⭐ NUEVO |
| `141_create_document_unit_session_assignments.sql` | Asignación de documentos a unidades y sesiones ⭐ NUEVO |
| `140_create_document_career_assignments.sql` | Asignación de documentos a carreras ⭐ NUEVO |
| `139_fix_courses_institution_and_link_documents.sql` | Vincular documentos procesados desde Drive con courses e institutions |
| `138_link_drive_processed_documents.sql` | Vincular documentos procesados desde Drive |
| `135_create_missing_processed_documents.sql` | Crear documentos faltantes en processed_documents |
| `133_assign_institution_to_migrated_documents.sql` | Asignar institution_id a documentos migrados |
| `131_verify_assignments_and_fix_function.sql` | Verificar asignaciones y corregir función get_document_file_url |
| `129_update_documents_with_material_files.sql` | Actualizar documentos con archivos de materials |
| `125_create_course_documents_bucket_policies.sql` | Políticas RLS para bucket course-documents |
| `124_find_original_files_for_documents.sql` | Buscar archivos originales para documentos |
| `123_final_fix_single_policy.sql` | Fix final políticas RLS documentos |
| `98_create_document_library.sql` | Crear tablas y estructura inicial |
| `105_enable_rls_simple.sql` | Políticas RLS básicas |
| `107_increase_statement_timeout.sql` | Aumentar timeout para archivos grandes |
| `108_enable_documents_access_admin_campus_coordinator.sql` | Acceso para admin-campus/coordinator |
| `112_fix_admin_access_no_institution.sql` | Admin sin institution_id puede ver todo |
| `115_fix_admin_user_direct.sql` | Fix directo para crear/actualizar usuario admin |

---

## 🔄 Flujo de Trabajo

1. **Procesamiento de archivo:**
   - Usuario sube archivo desde Google Drive
   - Cloud Function `processFileJob` procesa el archivo
   - Genera chunks y embeddings
   - Crea registro en `processed_documents`

2. **Asignación a cursos:**
   - Admin/admin-campus/coordinator accede a `/admin/documents`
   - Selecciona documento y asigna a uno o múltiples cursos
   - Se crea registro en `document_course_assignments`

3. **Uso en RAG:**
   - Los chunks del documento están disponibles para búsqueda
   - El tutor AI puede usar estos chunks cuando el documento está asignado al curso

---

## 📝 Notas Técnicas

### Funciones Helper RLS:

- `is_admin_safe()` - Verifica si el usuario es admin (seguro, evita recursión)
- `is_admin_campus_safe()` - Verifica si el usuario es admin-campus
- `is_coordinator_safe()` - Verifica si el usuario es coordinator
- `get_user_institution_id()` - Obtiene la institución del usuario

### Consideraciones:

- Admin no necesita `institution_id` para ver todos los documentos
- Admin-campus y coordinator requieren `institution_id` asignado en `user_institutions`
- Las políticas RLS usan `SECURITY DEFINER` para evitar recursión

---

## ✅ Estado de Implementación

- [x] Tablas de base de datos creadas
- [x] Políticas RLS implementadas
- [x] Interfaz de usuario (`/admin/documents`)
- [x] Servicio de biblioteca de documentos
- [x] Asignación múltiple a cursos
- [x] Soporte para archivos grandes (hasta 850 MB)
- [x] Acceso por roles (admin, admin-campus, coordinator)
- [x] Migración a Supabase Storage
- [x] Migración desde Google Drive a Supabase Storage desde `/admin/documents`
- [x] Detección automática de `sourceFileId` para documentos procesados desde Drive
- [x] Vinculación automática de documentos procesados desde Drive con materials, cursos e instituciones
- [x] Corrección de `institution_id` en cursos y documentos basándose en materials procesados

---

**Última actualización:** Enero 2025

## 🔄 Migración desde Google Drive

### Funcionalidad Implementada

El sistema ahora permite migrar documentos procesados desde Google Drive a Supabase Storage directamente desde la interfaz `/admin/documents`.

**Características:**
- ✅ Detección automática de `sourceFileId` en chunks y materials
- ✅ Botón de migración visible solo para admin y solo cuando hay `sourceFileId` disponible
- ✅ Migración automática usando Edge Function `migrate-drive-to-bucket`
- ✅ Actualización automática de `file_url` y `storage_path` en `processed_documents`
- ✅ Soporte para refrescar tokens de Google Drive automáticamente

**Flujo:**
1. El sistema detecta automáticamente si un documento tiene `sourceFileId` disponible
2. Si el documento no tiene `storage_path` pero tiene `sourceFileId`, se muestra el botón de migración
3. Al hacer clic, se llama a la Edge Function `migrate-drive-to-bucket`
4. La función descarga el archivo de Google Drive y lo sube a Supabase Storage
5. Se actualiza el registro en `processed_documents` con la nueva ruta

### Scripts de Vinculación

Los scripts `138_link_drive_processed_documents.sql` y `139_fix_courses_institution_and_link_documents.sql` permiten:
- Vincular documentos procesados desde Drive con materials existentes
- Asignar `institution_id` a cursos basándose en teachers
- Crear documentos en `processed_documents` para materials procesados desde Drive
- Vincular chunks con documentos usando `material_id` o `sourceFileId`
- Crear asignaciones de cursos automáticamente

---

## 📚 Asignación de Materiales a Múltiples Cursos ⭐ NUEVO

### Funcionalidad Implementada

Los docentes ahora pueden asignar un material a múltiples cursos de forma simultánea, permitiendo reutilizar materiales en diferentes cursos sin duplicarlos.

### Estructura de Base de Datos

#### Tabla: `material_course_assignments`

```sql
CREATE TABLE material_course_assignments (
  id UUID PRIMARY KEY,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(material_id, course_id)
);
```

**Funciones RPC:**
- `get_material_courses(material_id)` - Obtiene todos los cursos asignados a un material
- `assign_material_to_courses(material_id, course_ids[], assigned_by, notes)` - Asigna material a múltiples cursos
- `unassign_material_from_course(material_id, course_id)` - Desasigna material de un curso

### Interfaz de Usuario

#### Página: `/teacher/materials`

**Ruta:** `src/pages/MaterialsManagementPage.tsx`

**Funcionalidades:**
- ✅ Botón "Asignar" en cada material para abrir modal de asignación
- ✅ Visualización de cursos asignados como badges en la columna "Cursos Asignados"
- ✅ Tabla ampliada (2400px mínimo) con mejor visualización
- ✅ Contenedor sin límites de ancho para aprovechar toda la pantalla

**Componentes relacionados:**
- `MaterialCourseAssignmentModal.tsx` - Modal para asignar materiales a múltiples cursos
  - Búsqueda de cursos
  - Selección múltiple con checkboxes
  - Visualización de cursos ya asignados
  - Desasignación individual

### Servicios

#### `teacherCourses.ts` - Material Service

**Funciones agregadas:**
- `getMaterialCourses(materialId)` - Obtiene cursos asignados a un material
- `assignMaterialToCourses(materialId, courseIds[], notes?)` - Asigna a múltiples cursos
- `unassignMaterialFromCourse(materialId, courseId)` - Desasigna de un curso

### Scripts SQL

| Script | Descripción | Estado |
|--------|-------------|--------|
| `143_create_material_course_assignments.sql` | Crear tabla y funciones de asignación | ✅ Ejecutado |

### Permisos RLS

- **Admin:** Acceso completo a todas las asignaciones
- **Admin-campus/Coordinator:** Acceso a asignaciones de cursos de su institución
- **Teacher:** Puede gestionar asignaciones de sus propios cursos
- **Student:** Puede leer asignaciones de cursos en los que está inscrito

### Flujo de Uso

1. El docente accede a `/teacher/materials`
2. Hace clic en "Asignar" en el material deseado
3. Se abre el modal con todos sus cursos disponibles
4. Selecciona uno o más cursos (checkboxes)
5. Confirma la asignación
6. Los cursos asignados aparecen como badges en la tabla
7. Puede desasignar cursos individualmente desde el modal

### Mejoras de UI Implementadas

- ✅ Tabla ampliada a 2400px mínimo
- ✅ Columnas con anchos mínimos optimizados
- ✅ Contenedor sin límites de ancho (`w-full`)
- ✅ Padding y márgenes optimizados para mejor uso del espacio
- ✅ Altura de tabla ajustada para mostrar más filas

