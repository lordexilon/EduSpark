# 🎉 Estado del Proyecto - Noviembre 2025

**Versión:** 3.6 - Correcciones Errores Sistema  
**Estado:** ✅ **FUNCIONAL Y OPERATIVO**  
**Última actualización:** Enero 2025

---

## 📊 Resumen Ejecutivo

EduSpark es una **plataforma educativa inteligente** con:
- ✅ **Flujo pedagógico completo** (Carreras → Cursos → Unidades → Sesiones)
- ✅ **Sistema de tracking** de progreso y participación
- ✅ **Sistema de evaluación** (quizzes, trivias, assessments)
- ✅ **UX moderna** (Breadcrumbs, Filtros, Indicadores)
- ✅ **Seguridad avanzada** (RLS, roles, políticas)

---

## 🗄️ Base de Datos (35 Tablas)

### Core:
- `users`, `roles`, `institutions`
  - ✅ Campo `identity_document` (único e irrepetible) ⭐ NUEVO
  - ✅ Campo `identity_document_type` (DNI, CEDULA, PASAPORTE, LICENCIA, OTRO) ⭐ NUEVO
- `careers`, `subjects`
- `courses`, `course_units`, `sessions`, `materials`

### Académico:
- `career_enrollments`, `course_enrollments`
- `subject_assignments`

### Tracking:
- `unit_progress` ⭐ NUEVO
- `session_progress` ⭐ NUEVO
- ✅ **Sistema de progreso consistente** entre estudiantes y docentes (Enero 2025) ⭐ NUEVO
- ✅ **Gamificación** con score y niveles para estudiantes ⭐ NUEVO
- ✅ **Vista de progreso detallado** para docentes por curso ⭐ NUEVO
- ✅ **Integración Comprehensiva**: Progreso Académico + Tutor Analytics (Enero 2025) ⭐ NUEVO
  - Informe unificado para docentes y estudiantes
  - Análisis de correlación entre progreso y uso del tutor
  - Insights automáticos y recomendaciones personalizadas
- ✅ **Reportes Administrativos por Roles** (Enero 2025) ⭐ NUEVO
  - Admin: Vista global con tokens/costos de todas las instituciones
  - Admin-campus/Coordinator: Vista institucional sin tokens/costos
  - Exportación a Excel y PDF
  - Filtros por fecha

### Evaluación:
- `assessments` ⭐ NUEVO
- `questions` ⭐ NUEVO
- `assessment_attempts` ⭐ NUEVO
- `question_responses` ⭐ NUEVO
- `course_grading_weights` ⭐ NUEVO - Ponderación de evaluaciones

### Tareas:
- `assignments`, `assignment_submissions`

### Virtual Tutor:
- `tutor_conversations`, `tutor_messages`
- `chunks`, `course_content_chunks`
- ✅ **Mejoras implementadas:** Vinculación completa con unidades, sesiones y materiales
- ✅ **Sistema de fuentes mejorado** con enlaces contextuales

### Biblioteca de Documentos: ⭐ NUEVO
- `processed_documents` - Biblioteca centralizada de documentos procesados
- `document_course_assignments` - Asignación múltiple de documentos a cursos
- `document_career_assignments` - Asignación de documentos a carreras ⭐ NUEVO
- `document_unit_assignments` - Asignación de documentos a unidades ⭐ NUEVO
- `document_session_assignments` - Asignación de documentos a sesiones ⭐ NUEVO
- ✅ **Acceso por roles:** Admin ve todos, admin-campus/coordinator ven de su institución
- ✅ **Soporte archivos grandes:** Hasta 850 MB (4350+ páginas)
- ✅ **Asignación múltiple:** Documentos pueden asignarse a múltiples cursos, carreras, unidades y sesiones

### Asignación de Materiales: ⭐ NUEVO
- `material_course_assignments` - Asignación múltiple de materiales a cursos
- `material_unit_assignments` - Asignación múltiple de materiales a unidades
- ✅ **Docentes pueden asignar:** Un material puede estar asignado a múltiples cursos y unidades
- ✅ **Interfaz mejorada:** Tabla ampliada con mejor visualización
- ✅ **Modal de asignación:** Selección múltiple de cursos con búsqueda
- ✅ **Corrección crítica:** Resuelto error de ambigüedad en políticas RLS (Enero 2025) ⭐ NUEVO
- ✅ **Visualización completa:** Materiales asignados a unidades se muestran correctamente en el curso (Enero 2025) ⭐ NUEVO

### Mensajería:
- `conversations`, `messages` ⭐ NUEVO
- ✅ **Exportación de mensajes** (CSV/JSON)
- ✅ **Interfaz mejorada** con agrupación inteligente
- ✅ **Real-time updates** implementado

### Deprecadas:
- `course_modules` ⚠️ No usar
- `course_materials` ⚠️ No usar

---

## 💻 Frontend

### Páginas de Estudiantes:
- ✅ `DashboardPage.tsx` - Dashboard personal
- ✅ `MyCoursesPage.tsx` - Mis cursos con progreso
- ✅ `CourseViewPage.tsx` - Vista de curso con tracking
- ✅ `SessionDetailPage.tsx` - Detalle de sesión
- ✅ `SessionsListPage.tsx` - Lista de sesiones con filtros
- ✅ `AssignmentsPage.tsx` - Tareas con filtros
- ✅ `FlashcardStudyPage.tsx` - Estudiar flashcards con Spaced Repetition ⭐ NUEVO
  - Soporte para opciones múltiples con feedback inmediato ⭐ NUEVO
- ✅ `StudentFlashcardsPage.tsx` - Vista de flashcards ⭐ NUEVO
- ⏳ `TakeQuizPage.tsx` - Tomar quizzes (Pendiente UI)

### Páginas de Docentes:
- ✅ `TeacherDashboardPage.tsx` - Dashboard docente
- ✅ `TeacherCoursesPage.tsx` - Mis cursos
- ✅ `CourseEditorPage.tsx` - Editor de curso
- ✅ `CourseModulesPage.tsx` - Gestión de unidades
- ✅ `ModuleEditorPage.tsx` - Editor de unidad
- ✅ `QuizBuilderPage.tsx` - Crear quizzes
- ✅ `QuizAnalyticsPage.tsx` - Analíticas y estadísticas
- ✅ `FlashcardBuilderPage.tsx` - Crear y gestionar flashcards ⭐ NUEVO
  - Soporte para opciones múltiples (tipo quiz) ⭐ NUEVO
  - Filtrado por unidad desde URL (`?unitId=...`) ⭐ NUEVO
- ✅ `TeacherFlashcardsPage.tsx` - Gestión de flashcards ⭐ NUEVO

### Páginas de Administración: ⭐ NUEVO
- ✅ `DocumentLibraryPage.tsx` - Biblioteca de documentos procesados
- ✅ Acceso para admin, admin-campus y coordinator
- ✅ Asignación de documentos a múltiples cursos, carreras, unidades y sesiones
- ✅ Tabla ampliada con scrollbar y mejor visualización

### Páginas de Docentes:
- ✅ `MaterialsManagementPage.tsx` - Gestión de materiales del profesor
- ✅ Asignación de materiales a múltiples cursos ⭐ NUEVO
- ✅ Tabla ampliada con mejor visualización ⭐ NUEVO
- ✅ Modal de asignación con selección múltiple ⭐ NUEVO

### Componentes:
- ✅ `Breadcrumbs.tsx` - Navegación
- ✅ `FilterBar.tsx` - Filtros avanzados
- ✅ `ProgressIndicator.tsx` - Indicadores
- ✅ `GamificationScore.tsx` - Score gamificado para estudiantes ⭐ NUEVO
- ✅ `StudentProgressDetail.tsx` - Progreso detallado para docentes ⭐ NUEVO
- ✅ `FlashcardCard.tsx` - Tarjeta de flashcard con animación 3D ⭐ NUEVO
  - Soporte para opciones múltiples con feedback visual ⭐ NUEVO
- ✅ `FlashcardEditor.tsx` - Editor de flashcards ⭐ NUEVO
  - Soporte para crear flashcards con opciones múltiples ⭐ NUEVO
- ✅ `Card.tsx`, `Button.tsx`, etc.

### Servicios:
- ✅ `teacherCourses.ts` - Servicios de cursos
- ✅ `academicService.ts` - Servicios académicos
- ✅ `progressService.ts` ⭐ NUEVO - Tracking
- ✅ `quizService.ts` ⭐ NUEVO - Quizzes
- ✅ `gradingService.ts` ⭐ NUEVO - Ponderación y cálculo de notas finales
- ✅ `assignments.ts` - Tareas
- ✅ `documentLibraryService.ts` ⭐ NUEVO - Biblioteca de documentos
- ✅ `teacherCourses.ts` - Servicios de materiales con asignación múltiple ⭐ ACTUALIZADO

---

## 📈 Funcionalidades Implementadas

### ✅ Tracking de Participación
- Registro automático de acceso a unidades
- Botón "Entendido ✓" para auto-evaluación
- Cálculo de tiempo dedicado
- Progreso por curso calculado automáticamente

### ✅ Sistema de Quizzes (Implementado)
- 5 tipos de assessments
- 5 tipos de preguntas
- Múltiples intentos
- Calificación automática
- Feedback instantáneo

### ✅ Sistema de Ponderación de Evaluaciones ⭐ NUEVO
- Configuración personalizable por curso
- Ponderación de quizzes/trivias/tareas (30% por defecto)
- Ponderación de exámenes parciales (20% cada uno por defecto)
- Ponderación de examen final (30% por defecto)
- Cálculo automático de nota final
- Interfaz de configuración para docentes/coordinadores

### ✅ UX Mejorada
- Breadcrumbs en todas las páginas principales
- Filtros avanzados en listas
- Indicadores de progreso visuales
- Navegación intuitiva

### ✅ Sistema de Mensajería ⭐ NUEVO
- Conversaciones entre estudiantes y docentes
- Mensajería en tiempo real
- Exportación de mensajes (CSV/JSON)
- Interfaz mejorada con agrupación inteligente
- Headers de fecha contextuales
- Avatares y nombres de remitente

### ✅ Tutor AI Mejorado ⭐ NUEVO
- Vinculación completa con contenido del curso
- Acceso a unidades, sesiones y materiales
- Sistema de fuentes mejorado con enlaces
- Panel de contenido del curso
- Navegación contextual desde respuestas

### ✅ Sistema de Biblioteca de Documentos ⭐ NUEVO
- Biblioteca centralizada de documentos procesados (`processed_documents`)
- Asignación múltiple de documentos a cursos
- Acceso por roles: Admin (todos), admin-campus/coordinator (su institución)
- Interfaz en `/admin/documents` para gestión y asignación
- Soporte para archivos grandes: hasta 850 MB (4350+ páginas)
- Procesamiento optimizado con continuación automática
- ✅ **Migración desde Google Drive:** Funcionalidad para migrar documentos desde Drive a Supabase Storage desde `/admin/documents`
- ✅ **Vinculación automática:** Scripts para vincular documentos procesados desde Drive con materials, cursos e instituciones
- ✅ **Corrección de institution_id:** Scripts para asignar `institution_id` a cursos y documentos basándose en materials procesados

---

## 🔒 Seguridad

### Políticas RLS:
- **80+ políticas** activas
- Estudiantes: Solo su propio contenido
- Docentes: Solo sus cursos
- Admins: Acceso total

### Funciones Helper:
- `is_admin()`, `is_admin_or_teacher()`
- `is_admin_safe()`, `is_admin_campus_safe()`, `is_coordinator_safe()` ⭐ NUEVO
- `get_user_institution_id()` ⭐ NUEVO
- `student_is_enrolled_in_course()`
- Cálculo automático de puntuaciones

---

## 🚀 Scripts SQL Importantes

| # | Script | Descripción | Estado |
|---|--------|-------------|--------|
| 153 | `get_course_materials_including_units.sql` | Incluir materiales asignados a unidades en vista de curso | ✅ Creado ⭐ NUEVO |
| 139 | `fix_courses_institution_and_link_documents.sql` | Vincular documentos procesados desde Drive con courses e institutions | ✅ Ejecutado ⭐ NUEVO |
| 138 | `link_drive_processed_documents.sql` | Vincular documentos procesados desde Drive | ✅ Ejecutado ⭐ NUEVO |
| 137 | `diagnose_why_only_2_documents_visible.sql` | Diagnóstico visibilidad documentos admin | ✅ Ejecutado ⭐ NUEVO |
| 135 | `create_missing_processed_documents.sql` | Crear documentos faltantes en processed_documents | ✅ Ejecutado ⭐ NUEVO |
| 133 | `assign_institution_to_migrated_documents.sql` | Asignar institution_id a documentos migrados | ✅ Ejecutado ⭐ NUEVO |
| 132 | `diagnose_admin_document_visibility.sql` | Diagnóstico visibilidad documentos admin | ✅ Ejecutado ⭐ NUEVO |
| 131 | `verify_assignments_and_fix_function.sql` | Verificar asignaciones y corregir función | ✅ Ejecutado ⭐ NUEVO |
| 130 | `diagnose_document_file_search.sql` | Diagnóstico búsqueda archivos documentos | ✅ Ejecutado ⭐ NUEVO |
| 129 | `update_documents_with_material_files.sql` | Actualizar documentos con archivos de materials | ✅ Ejecutado ⭐ NUEVO |
| 128 | `deep_search_document_files.sql` | Búsqueda profunda archivos documentos | ✅ Ejecutado ⭐ NUEVO |
| 125 | `create_course_documents_bucket_policies.sql` | Políticas RLS para bucket course-documents | ✅ Ejecutado ⭐ NUEVO |
| 155 | `process_payments_and_update_status.sql` | Procesar pagos y actualizar estado de usuarios | ✅ Ejecutado ⭐ NUEVO |
| 154 | `create_payments_structure.sql` | Estructura de pagos, suscripciones y pagos | ✅ Ejecutado ⭐ NUEVO |
| 153 | `add_identity_document_type.sql` | Agregar tipo de documento de identidad | ✅ Ejecutado ⭐ NUEVO |
| 152 | `fix_users_update_rls_policy.sql` | Corregir política RLS de actualización de usuarios | ✅ Ejecutado ⭐ NUEVO |
| 151 | `add_identity_document_verified.sql` | Agregar campo identity_document a users | ✅ Ejecutado ⭐ NUEVO |
| 150 | `grant_permissions_reset_functions.sql` | Otorgar permisos a funciones de reset | ✅ Ejecutado ⭐ NUEVO |
| 149 | `update_reset_student_progress_with_tutor_ai.sql` | Actualizar reset con eliminación de datos del tutor IA | ✅ Ejecutado ⭐ NUEVO |
| 143 | `create_material_course_assignments.sql` | Asignación múltiple de materiales a cursos | ✅ Ejecutado ⭐ NUEVO |
| 142 | `fix_document_assignments_rls_and_functions.sql` | Fix RLS y funciones de asignación | ✅ Ejecutado ⭐ NUEVO |
| 141 | `create_document_unit_session_assignments.sql` | Asignación documentos a unidades/sesiones | ✅ Ejecutado ⭐ NUEVO |
| 140 | `create_document_career_assignments.sql` | Asignación documentos a carreras | ✅ Ejecutado ⭐ NUEVO |
| 124 | `find_original_files_for_documents.sql` | Buscar archivos originales para documentos | ✅ Ejecutado ⭐ NUEVO |
| 123 | `final_fix_single_policy.sql` | Fix final políticas RLS documentos | ✅ Ejecutado ⭐ NUEVO |
| 115 | `fix_admin_user_direct.sql` | Fix usuario admin para acceso a documentos | ✅ Ejecutado ⭐ NUEVO |
| 114 | `deep_diagnose_admin_rls.sql` | Diagnóstico profundo RLS admin | ✅ Ejecutado ⭐ NUEVO |
| 113 | `verify_and_fix_admin_rls.sql` | Verificar y corregir RLS admin | ✅ Ejecutado ⭐ NUEVO |
| 112 | `fix_admin_access_no_institution.sql` | Admin sin institution_id puede ver todos | ✅ Ejecutado ⭐ NUEVO |
| 111 | `quick_fix_user_access.sql` | Fix rápido acceso usuario | ✅ Ejecutado ⭐ NUEVO |
| 110 | `fix_user_documents_access.sql` | Fix acceso documentos por usuario | ✅ Ejecutado ⭐ NUEVO |
| 109 | `diagnose_documents_access.sql` | Diagnóstico acceso documentos | ✅ Ejecutado ⭐ NUEVO |
| 108 | `enable_documents_access_admin_campus_coordinator.sql` | Acceso documentos para admin-campus/coordinator | ✅ Ejecutado ⭐ NUEVO |
| 107 | `increase_statement_timeout.sql` | Aumentar timeout para archivos grandes (600s) | ✅ Ejecutado ⭐ NUEVO |
| 105 | `enable_rls_simple.sql` | RLS simplificado para documentos | ✅ Ejecutado |
| 98 | `create_document_library.sql` | Sistema de biblioteca de documentos | ✅ Ejecutado |
| 97 | `enable_realtime_messaging.sql` | Realtime para mensajería | ✅ Ejecutado |
| 96 | `create_messaging_system.sql` | Sistema de mensajería | ✅ Ejecutado |
| 94 | `course_grading_weights.sql` | Ponderación de evaluaciones | ✅ Ejecutado |
| 87 | `create_unit_session_progress.sql` | Tracking | ✅ Ejecutado |
| 88 | `create_quizzes_assessments.sql` | Quizzes | ✅ Ejecutado |
| 82 | `add_student_content_rls.sql` | RLS | ✅ Ejecutado |
| 81 | `migracion_SIMPLE.sql` | Migración | ✅ Ejecutado |

---

## 🎯 Próximos Pasos Inmediatos

### 1. Sistema de Ponderación ⭐ COMPLETADO
- ✅ Tabla `course_grading_weights` creada
- ✅ Servicio `gradingService.ts` implementado
- ✅ Página de configuración `CourseGradingWeightsPage.tsx` creada
- ✅ Página de calificaciones actualizada con notas finales
- ✅ Cálculo automático de notas finales implementado

### 2. Verificar Funcionamiento
- Probar botón "Entendido ✓"
- Verificar tracking en base de datos
- Crear primer quiz manualmente

### 3. Implementar UI de Quizzes
- Crear `QuizBuilderPage.tsx`
- Crear `TakeQuizPage.tsx`
- Crear componentes de preguntas

---

## 📊 Estadísticas

**Líneas de código:** ~26,000  
**Componentes React:** 35+  
**Servicios:** 9  
**Scripts SQL:** 144+  
**Documentación:** 50+ archivos MD

---

## 🎓 Modelo Educativo

```
Carrera (careers)
 └─ Materia (subjects)
     └─ Curso (courses)
         └─ Unidad (course_units)
             ├─ Contenido HTML/Markdown
             ├─ Objetivos de Aprendizaje
             ├─ Materiales (materials)
             ├─ Sesiones (sessions)
             │  ├─ Actividades
             │  └─ Quiz de Comprensión
             └─ Evaluación Final
```

---

## ✅ Checklist de Implementación

### Core:
- [x] Autenticación y roles
- [x] Gestión de cursos
- [x] Gestión de unidades
- [x] Gestión de sesiones
- [x] Gestión de materiales

### Tracking:
- [x] Progreso por unidad
- [x] Progreso por sesión
- [x] Cálculo automático de completitud
- [x] Botón "Entendido"

### Evaluación:
- [x] Tablas de quizzes
- [x] Servicio de quizzes
- [x] UI de creación
- [x] UI de toma
- [x] UI de resultados
- [x] Sistema de ponderación ⭐ NUEVO
- [x] Cálculo de notas finales ⭐ NUEVO
- [x] Configuración de ponderaciones ⭐ NUEVO

### UX:
- [x] Breadcrumbs
- [x] Filtros avanzados
- [x] Indicadores de progreso

---

## 🔧 Correcciones Críticas Recientes
 
### Noviembre 2025 - Corrección de Ambigüedad en Asignación de Unidades ⭐ NUEVO

**Problema:** Error "column reference 'unit_id' is ambiguous" al asignar materiales a unidades.

**Solución:** Recreación de políticas RLS y función RPC `assign_material_to_units` utilizando alias explícitos y únicos para evitar conflictos de nombres de columnas.

**Impacto:**
- ✅ Asignación de materiales a unidades funciona correctamente.
- ✅ Políticas RLS más robustas y claras.

**Documentación:** Ver `04_FEATURES/CORRECCION_RLS_MATERIAL_UNIT_ASSIGNMENTS.md`

**Script:** `sql_scripts/147_fix_ambiguous_unit_id_v2.sql`

---

### Noviembre 2025 - Mejora UX en Migración Drive (Error 401) ⭐ NUEVO

**Problema:** Usuarios no sabían qué hacer ante un error de autenticación (401) al migrar archivos.

**Solución:** Implementación de detección de error y redirección automática al perfil para reconectar Google Drive.

**Impacto:**
- ✅ Flujo de recuperación de errores intuitivo.
- ✅ Guía clara al usuario para resolver problemas de permisos.

**Documentación:** Ver `04_FEATURES/CORRECCIONES_MIGRACION_GOOGLE_DRIVE_NOVIEMBRE_2025.md`

---

### Enero 2025 - Corrección de Ambigüedad en RLS ⭐ NUEVO

**Problema:** Error "column reference 'course_id' is ambiguous" al asignar materiales a cursos.

**Solución:** Implementación de funciones auxiliares (`is_course_teacher`, `has_institution_access_to_course`) que simplifican las políticas RLS y eliminan ambigüedad.

**Impacto:**
- ✅ Asignación de materiales funciona correctamente
- ✅ Políticas RLS más simples y mantenibles
- ✅ Mejor rendimiento (funciones STABLE optimizables)
- ✅ Código más limpio y reutilizable

**Documentación:** Ver `04_FEATURES/CORRECCION_RLS_MATERIAL_COURSE_ASSIGNMENTS.md`

**Script:** `sql_scripts/147_fix_material_course_assignments_ambiguous.sql`

---

### Enero 2025 - Visualización de Materiales Asignados ⭐ NUEVO

**Problema:** Los materiales asignados mediante `material_course_assignments` no se visualizaban en las páginas de cursos.

**Solución:** Función SQL `get_course_materials_including_assigned()` que combina materiales directos con asignados usando UNION.

**Impacto:**
- ✅ Materiales asignados ahora se visualizan en páginas de cursos
- ✅ Estudiantes y profesores pueden ver todos los materiales disponibles
- ✅ Función con fallback para compatibilidad
- ✅ Evita duplicados automáticamente

**Documentación:** Ver `04_FEATURES/VISUALIZACION_MATERIALES_EN_CURSOS.md`

**Script:** `sql_scripts/148_get_course_materials_including_assigned.sql`

---

### Enero 2025 - Correcciones y Mejoras en Reportes Administrativos ⭐ NUEVO

**Problemas corregidos:**
1. **Error `ReferenceError: courseIds is not defined`** en `adminReportsService.ts`
   - Variable declarada fuera de scope
   - Solución: Declaración al inicio del scope para disponibilidad global

2. **Error `Cannot coerce the result to a single JSON object`** en `comprehensiveReportService.ts`
   - Uso de `.single()` cuando no hay datos en `student_tutor_performance`
   - Solución: Cambio a `.maybeSingle()` con manejo seguro de valores por defecto

**Nuevas funcionalidades:**
1. **Exportación Excel/PDF para reportes administrativos**
   - Componente `ExportAdminReportButton.tsx` creado
   - Excel: 3 hojas (Resumen Global, Instituciones, Cursos)
   - PDF: Formato landscape con tablas profesionales
   - Incluye filtros de fecha en nombre de archivo

2. **Navegación mejorada en sidebar**
   - Enlaces directos a `/admin/comprehensive-reports` y `/admin/documents`
   - Eliminado enlace duplicado de sección "Tutor IA"

**Impacto:**
- ✅ Errores de runtime eliminados
- ✅ Exportación profesional de reportes
- ✅ Navegación más intuitiva para administradores
- ✅ Código más robusto y mantenible

**Documentación:** Ver `04_FEATURES/CORRECCIONES_REPORTES_ADMINISTRATIVOS_ENERO_2025.md`

**Archivos modificados:**
- `src/services/adminReportsService.ts`
- `src/services/comprehensiveReportService.ts`
- `src/components/ExportAdminReportButton.tsx` (nuevo)
- `src/pages/AdminComprehensiveReportsPage.tsx`
- `src/components/TeacherSidebar.tsx`

---

### Noviembre 2025 - Correcciones Migración Google Drive a Supabase Storage ⭐ NUEVO

**Problemas corregidos:**

1. **Error 401 (Unauthorized) en Edge Function `migrate-drive-to-bucket`**
   - Token de autenticación no se validaba correctamente
   - Solución: Verificación explícita de sesión y refresco automático de token
   - Headers explícitos con `Authorization` y `apikey`

2. **Error 403 (Insufficient Authentication Scopes)**
   - Tokens solo tenían scope `drive.file` (permisos limitados)
   - Solución: Actualización de scopes OAuth a `drive` completo
   - Usuarios existentes deben reconectar Google Drive

3. **Error 413 (File Size Exceeded)**
   - Archivos >50MB no pueden subirse a Supabase Storage
   - Solución: Verificación previa de tamaño, fallback automático a Google Drive
   - No se descarga archivo si excede el límite

4. **Carpetas duplicadas al reconectar Google Drive**
   - Se creaba nueva carpeta al reconectar
   - Solución: Búsqueda de carpeta existente antes de crear nueva
   - Reutilización de carpeta original con todo su contenido

5. **Error de importación `IconClipboardCheck`**
   - Icono usado pero no importado en `SessionDetailPage.tsx`
   - Solución: Agregada importación faltante

**Nuevas funcionalidades:**

1. **Manejo inteligente de archivos grandes**
   - Archivos ≤50MB → Supabase Storage
   - Archivos >50MB → Google Drive directamente
   - Campo `source` indica origen del archivo

2. **Reutilización de carpetas de Google Drive**
   - Búsqueda automática de carpeta existente
   - Verificación de carpeta en BD vs Drive
   - No se pierde acceso a contenido previo

**Impacto:**
- ✅ Autenticación robusta en Edge Functions
- ✅ Permisos completos de Google Drive para nuevos usuarios
- ✅ Manejo eficiente de archivos grandes sin errores
- ✅ Mejor experiencia al reconectar Google Drive
- ✅ Sin errores de importación de iconos

**Documentación:** Ver `04_FEATURES/CORRECCIONES_MIGRACION_GOOGLE_DRIVE_NOVIEMBRE_2025.md`

**Archivos modificados:**
- `src/services/documentLibraryService.ts`
- `src/services/googleOAuthService.ts`
- `src/services/googleDriveService.ts`
- `src/lib/supabase.ts`
- `src/pages/SessionDetailPage.tsx`
- `src/vite-env.d.ts` (nuevo)
- `tsconfig.json`
- `supabase/functions/migrate-drive-to-bucket/index.ts`

---

## 📝 Documentación

**Ver:** `AI_CONTEXT/` para documentación completa  
**Guías:** `AI_CONTEXT/README.md`  
**Estado:** Este documento

---

## 🔧 Correcciones Recientes (Enero 2025) ⭐ NUEVO

### Errores Críticos Corregidos:
- ✅ **Función RPC:** Corregido error `to_tsvector(text, text) does not exist` con fallback automático
- ✅ **TTS Portugués:** Reemplazadas voces Journey por Neural2 (disponibles en Google Cloud)
- ✅ **Configuración Pedagógica:** Manejo correcto de casos sin datos usando `.maybeSingle()`
- ✅ **Políticas RLS:** Creadas políticas para `tutor_interactions` y `student_tutor_performance`
- ✅ **Tracking:** Manejo silencioso de errores que no interrumpe el flujo del usuario
- ✅ **Asignación Unidades:** Corregido error crítico `unit_id ambiguous` y timeouts en asignación de materiales ⭐ NUEVO
  - Reemplazo de `ON CONFLICT` por verificación manual
  - Optimización de `get_material_units` con `SECURITY DEFINER` y CASTs explícitos
- ✅ **Vinculación Chunks:** Agregadas columnas `unit_id` y `session_id` a `course_content_chunks` para mejor precisión del RAG ⭐ EJECUTADO
  - Script SQL `145_add_unit_session_to_chunks.sql` ejecutado
  - Índices creados para mejorar rendimiento de búsquedas
  - Chunks procesados ahora incluyen vinculación con unidades y sesiones
- ✅ **Visualización Materiales:** Solucionado problema de duplicidad de materiales en cursos y soporte para enlaces de Google Drive sin URL pública ⭐ NUEVO
  - Script SQL actualizado para evitar duplicados en listas generales
  - UI mejorada con etiquetas claras ("Material de la unidad" vs "Material del curso")
  - Fallback automático para abrir archivos de Drive usando `sourceFileId`

**Documentación:** Ver `04_FEATURES/CORRECCIONES_ERRORES_SISTEMA_ENERO_2025.md`, `04_FEATURES/CORRECCION_AMBIGUEDAD_UNIT_ID_ASSIGNMENTS.md` y `04_FEATURES/VISUALIZACION_MATERIALES_EN_CURSOS.md`

---

### Enero 2025 - Mejora del Sistema de Reset de Progreso ⭐ NUEVO

**Mejoras implementadas:**
- ✅ **Reset completo de registros:** El reset de progreso ahora elimina también todos los registros del Tutor AI
- ✅ **Eliminación de Tutor AI:** Incluye `tutor_messages`, `tutor_interactions`, `tutor_conversations`, `student_tutor_performance`
- ✅ **Interfaz mejorada:** Muestra nombre completo y correo del estudiante en lugar del ID
- ✅ **Validación de permisos:** Verificación de roles (admin, coordinator, admin-campus, teacher) antes de resetear
- ✅ **Ruta corregida:** Agregada ruta `/teacher/reset-progress` en el router principal

**Scripts SQL:**
- `149_update_reset_student_progress_with_tutor_ai.sql` - Actualización de función con eliminación de Tutor AI
- `150_grant_permissions_reset_functions.sql` - Permisos de ejecución

**Archivos modificados:**
- `src/pages/ResetStudentProgressPage.tsx` - Interfaz con nombre y correo del estudiante
- `src/services/academicService.ts` - JOIN con tabla users para obtener datos del estudiante
- `src/App.tsx` - Ruta agregada para reset de progreso

**Documentación:** Ver `04_FEATURES/MEJORA_RESET_PROGRESO_TUTOR_AI.md`

---

### Enero 2025 - Campo identity_document en Tabla Users ⭐ NUEVO

**Implementación completada:**
- ✅ **Campo agregado:** `identity_document VARCHAR(50) UNIQUE` en tabla `users`
- ✅ **Constraint UNIQUE:** `users_identity_document_unique` garantiza documentos únicos e irrepetibles
- ✅ **Índices creados:** 2 índices para búsquedas rápidas (único automático + parcial)
- ✅ **Uso crítico:** Campo esencial para importación masiva y suspender/activar usuarios

**Script SQL ejecutado:**
- `151_add_identity_document_verified.sql` - Agregado campo con verificación completa

**Funcionalidades que utilizan identity_document:**
- `BulkUserImportPage.tsx` - Importación masiva de usuarios
- `BulkSuspendReactivatePage.tsx` - Suspender/reactivar usuarios masivamente
- `create_user_with_assignments()` - Función SQL para crear usuarios
- `bulk_suspend_reactivate_users()` - Función SQL para operaciones masivas

**Características:**
- Campo opcional (NULL permitido) para usuarios existentes
- Constraint UNIQUE previene duplicados cuando el valor no es NULL
- Búsquedas rápidas mediante índices optimizados
- Identificación única de usuarios además del email

**Documentación:** Ver `04_FEATURES/VERIFICACION_CAMPO_IDENTITY_DOCUMENT.md`

---

## Sistema de Pagos con Suspensión/Reactivación Automática ⭐ NUEVO

**Implementado:** Enero 2025

**Resumen:**
Sistema completo para gestionar pagos de mensualidades de estudiantes vinculado con suspensión/reactivación automática. Permite importar pagos desde archivos Excel o CSV y actualiza automáticamente el estado de los usuarios según su situación de pago.

**Funcionalidades:**
- ✅ Importación de pagos desde Excel (.xlsx, .xls) y CSV
- ✅ Procesamiento automático: Si pagó → activo, si no pagó → suspendido
- ✅ Registro automático de pagos en base de datos
- ✅ Actualización automática de suscripciones y fechas de próximo pago
- ✅ Dashboard de gestión de pagos con resumen y filtros
- ✅ Visualización de información de pagos en suspender/reactivar

**Archivos implementados:**
- `sql_scripts/154_create_payments_structure.sql` - Estructura de pagos (planes, suscripciones, pagos)
- `sql_scripts/155_process_payments_and_update_status.sql` - Función para procesar pagos y actualizar estados
- `src/pages/BulkSuspendReactivatePage.tsx` - Mejorado con soporte Excel y modo de procesamiento de pagos
- `src/pages/StudentPaymentManagementPage.tsx` - Nueva página de gestión de pagos
- `src/services/paymentService.ts` - Servicio completo para gestión de pagos
- `src/services/bulkSuspendReactivateService.ts` - Mejorado con parseo Excel y procesamiento de pagos

**Formato Excel requerido:**
- Columnas: `identity_document` (requerido), `paid` (requerido), `payment_date` (opcional), `amount` (opcional)
- Valores para `paid`: `true/false`, `si/no`, `pagado/no pagado`, `1/0`

**Lógica automática:**
- Si `paid = true/si/pagado` → Usuario se reactiva/continúa activo, se registra pago
- Si `paid = false/no/no pagado` → Usuario se suspende

**Documentación:** Ver `04_FEATURES/SISTEMA_PAGOS_SUSPENSION_AUTOMATICA.md`

---

**🎊 ¡Sistema funcional y listo para producción!**
