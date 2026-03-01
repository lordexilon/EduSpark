# 📚 AI_CONTEXT - Documentación Principal

**Última actualización:** Enero 2025  
**Estado del Proyecto:** ✅ Sistema Funcional con Evaluación, Mensajería, Tutor AI Mejorado y Sistema de Instituciones Multi-tenant

---

## 🎯 Presentaciones

- **`PRESENTACION_SIMPLE_EDUSPARK.md`** - 🎓 Presentación simple: ¿Qué es EduSpark y qué lo diferencia? ⭐ NUEVO - FÁCIL DE ENTENDER
- **`PRESENTACION_EJECUTIVA_ENERO_2025.md`** - 📊 Presentación ejecutiva completa del proyecto (técnica)

---

## 🎯 Documentos Esenciales (Root)

### 📊 Schema y Estructura
- **`schema_actual.md`** - Schema completo de base de datos (35 tablas) ⭐ ACTUALIZADO
- **`REORGANIZACION_FLUJO_PEDAGOGICO.md`** - Estructura pedagógica
- **`flujos_criticos.md`** - Flujos críticos del sistema

### 🏛️ Sistema de Instituciones y Roles ⭐ NUEVO
- **`RESUMEN_SISTEMA_INSTITUCIONES.md`** - Resumen ejecutivo del sistema de instituciones ⭐ NUEVO
- **`SISTEMA_ROLES_INSTITUCIONES.md`** - Sistema completo de roles basado en instituciones ⭐ ACTUALIZADO
- **`PERMISOS_ADMIN_CAMPUS.md`** - Permisos y acceso del rol admin-campus ⭐ ACTUALIZADO
- **`REQUISITO_INSTITUCIONES_USUARIOS.md`** - Requisito: todos los usuarios deben tener institución ⭐ ACTUALIZADO
- **`COMO_IDENTIFICA_INSTITUCION_USUARIO.md`** - Cómo identifica el sistema la institución de un usuario ⭐ NUEVO

### 📈 Estado del Sistema
- **`ESTADO_PROYECTO_NOVIEMBRE_2025.md`** - Estado general del proyecto ⭐ ACTUALIZADO
- **`ESTADO_INTEGRACION_COMPLETA.md`** - Estado de integración
- **`MIGRACION_COMPLETADA_EXITOSAMENTE.md`** - Migración course_modules → course_units
- **`RESUMEN_SISTEMA_EVALUACION.md`** - 📊 Sistema completo de evaluación ⭐ ACTUALIZADO

### 🎓 Implementaciones
- **`IMPLEMENTACION_BREADCRUMBS.md`** - Sistema de navegación
- **`SISTEMA_ANALYTICS_TUTOR_IA.md`** - 📊 Sistema completo de analytics y evaluación de participación ⭐ ACTUALIZADO
- **`METODOLOGIA_EVALUACION_PARTICIPACION.md`** - 📐 Metodología detallada de evaluación y validación ⭐ NUEVO
- **`MEJORAS_ANALYTICS_COORDINADORES.md`** - 🚀 Mejoras recientes: Analytics para coordinadores y administradores ⭐ NUEVO
- **`ANALISIS_FLASHCARDS_INTERACTIVAS.md`** - 🎴 Análisis y recomendación: Flashcards interactivas con imágenes ⭐ NUEVO
- **`PLAN_IMPLEMENTACION_FLASHCARDS.md`** - 📋 Plan técnico detallado de implementación de flashcards ⭐ NUEVO
- **`FLUJO_EVALUACION_MEJORADO.md`** - 📊 **NUEVO** - Flujo de evaluación para estudiantes
- **`PLAN_IMPLEMENTACION_QUIZZES.md`** - 📊 **NUEVO** - Plan completo de quizzes
- **`MEJORAS_SISTEMA_MENSAJERIA_TUTOR.md`** - 💬🤖 **NUEVO** - Sistema de mensajería y tutor AI mejorados
- **`CORRECCIONES_ERRORES_SISTEMA_ENERO_2025.md`** - 🔧 **NUEVO** - Correcciones críticas de errores del sistema (RPC, TTS, RLS, Tracking, Vinculación Chunks - ✅ SQL ejecutado)
- **`CORRECCION_SUPERVISOR_TUTOR_AI_ACCESO_CURSOS.md`** - 🎓 **NUEVO** - Corrección de acceso de supervisor al Tutor AI y asignación automática de institución a cursos ⭐ NUEVO
- **`CORRECCION_ERRORES_EMBEDDINGS_RAG_WORKER.md`** - 🔄 **NUEVO** - Corrección de errores de embeddings con retry logic y exponential backoff ⭐ NUEVO

---

## 📁 Subfolders

### `/analisis/`
Analizas y comparaciones:
- `DIFERENCIA_MODULOS_UNIDADES.md` - Comparativa
- `RESUMEN_MIGRACION.md` - Resumen migración

### `/historico/`
Documentos históricos archivados

### `/verificaciones/`
Verificaciones de integridad y consistencia

### `/planes/`
Planes de desarrollo y mejoras

### `/mejoras/`
Propuestas de mejoras futuras

---

## 🎯 Sistema Completo Implementado

### ✅ Tracking de Progreso:
- `unit_progress` - Progreso por unidad
- `session_progress` - Progreso por sesión
- Botón "Entendido ✓" en unidades
- Cálculo automático de completitud

### ✅ Sistema de Quizzes:
- `assessments` - Evaluaciones
- `questions` - Preguntas
- `assessment_attempts` - Intentos
- `question_responses` - Respuestas
- Calificación automática

### ✅ Sistema de Ponderación de Evaluaciones ⭐ NUEVO:
- `course_grading_weights` - Configuración de ponderación por curso
- Ponderación configurable: Quizzes (30%), Exámenes Parciales (20% cada uno), Final (30%)
- Cálculo automático de notas finales
- Interfaz de configuración para docentes/coordinadores

### ✅ UX Implementadas:
- Breadcrumbs de navegación
- Filtros avanzados
- Indicadores de progreso

### ✅ Sistema de Procesamiento de Archivos y Costos ⭐ NUEVO:
- `SISTEMA_PROCESAMIENTO_ARCHIVOS_COSTOS.md` - Sistema completo de procesamiento de archivos grandes (900 MB+), control de costos y dashboard de administración
- `IMPLEMENTACION_ARCHIVOS_GRANDES_900MB.md` - 📄 Implementación completa: Soporte para archivos de 900MB mediante división automática ⭐ NUEVO
- `OPTIMIZACIONES_COSTOS_BUSQUEDAS.md` - Optimizaciones de costos y búsquedas RAG ⭐ ACTUALIZADO
- `ESTRUCTURA_COSTOS_ACTUALIZADA.md` - Estructura detallada de costos del sistema RAG ⭐ NUEVO
- `SOLUCION_PROBLEMA_BUSQUEDA_DEDEKIND.md` - Solución para búsqueda con ruido OCR ⭐ ACTUALIZADO
- Procesamiento optimizado por lotes (20 chunks)
- Auto-continuación para archivos que toman más de 1 hora
- Cálculo y tracking de costos reales
- Dashboard de administración para monitoreo de gastos
- Visualización en tiempo real con barra de progreso y temporizador
- **Limpieza OCR mejorada** (elimina ruido preservando contenido válido)
- **Extracción de contenido relevante** (busca palabras clave en chunks)

### ✅ Migración Google Drive a Supabase Storage ⭐ NUEVO:
- `CORRECCIONES_MIGRACION_GOOGLE_DRIVE_NOVIEMBRE_2025.md` - Correcciones críticas en migración de archivos desde Google Drive ⭐ NUEVO
- Manejo de errores 401/403/413 en Edge Function
- Verificación previa de tamaño de archivo
- Fallback automático a Google Drive para archivos grandes (>50MB)
- Reutilización de carpetas existentes al reconectar
- Actualización de scopes OAuth de Google Drive

### ✅ Sistema de Compartir Materiales con Permisos de Solo Lectura ⭐ NUEVO:
- `IMPLEMENTACION_COMPLETA_PERMISOS_SOLO_LECTURA.md` - 📄 Documentación completa de implementación integrada con visualización de materiales ⭐ NUEVO
- `IMPLEMENTACION_PERMISOS_SOLO_LECTURA_GOOGLE_DRIVE.md` - Documentación técnica inicial de permisos de solo lectura
- `GUIA_PERMISOS_GOOGLE_DRIVE_SOLO_LECTURA.md` - Guía completa de configuración manual y programática
- Compartir documentos de Google Drive con restricciones de solo lectura
- Guardado automático de enlaces de vista previa en metadata
- Integración automática con visualización de materiales en cursos (`/courses/:id`)
- Indicadores visuales para materiales compartidos con restricciones
- Aplicación automática de restricciones (sin descarga, sin impresión, sin copia)
- Visualización en secciones: Material de la Unidad, Material del Curso, Material de la Sesión

### ✅ Despliegue y Operaciones Cloud Functions v2 ⭐ NUEVO:
- `GUIA_DESPLIEGUE_CLOUD_FUNCTIONS_V2.md` - 📘 Guía completa de despliegue de Cloud Functions v2 en Cloud Run ⭐ NUEVO
- `SOLUCION_REVISIONES_FALLIDAS_ANALYZEFILE.md` - Solución para revisiones fallidas en Cloud Run ⭐ NUEVO
- `EVALUACION_DESPLIEGUE_CLOUD_RUN.md` - Evaluación completa del estado de despliegue ⭐ NUEVO
- Mejores prácticas para despliegue con Firebase CLI
- Troubleshooting de problemas comunes
- Comandos de referencia para monitoreo y verificación

---

### ⚠️ Funcionalidades Desactivadas

- **Personalización por Estilos de Aprendizaje** (Desactivado: Enero 2026)
  - La funcionalidad de personalización de respuestas del tutor basada en estilos de aprendizaje del estudiante (visual, auditivo, kinestésico, lectoescritor) ha sido **desactivada**
  - El tutor ya **no menciona** "estudiante visual" o "tu estilo visual" en las respuestas
  - Las respuestas son directas y claras, adaptadas al contenido del curso y contexto
  - Ver detalles en: `04_FEATURES/ANALISIS_TUTOR_IA_DOCENTES.md`

---

## 📊 Estadísticas del Proyecto

**Tablas:** 38 (28 originales + 4 de quizzes + 1 de ponderación + 2 de tracking + 2 de mensajería + 1 de costos)  
**Políticas RLS:** 80+  
**Funciones:** 132+  
**Triggers:** 10  
**Cloud Functions:** 7 (analyzeFile, createFileProcessingJob, processFileJob, cancelFileProcessingJob, changeUserPassword, confirmUserEmail, rag-worker) - Todas desplegadas en Cloud Run mediante Firebase Functions v2  

---

## 🚀 Scripts SQL Importantes

| Script | Descripción |
|--------|-------------|
| `148_get_course_materials_including_assigned.sql` | ✅ Función para obtener materiales incluyendo asignados ⭐ NUEVO |
| `147_fix_material_course_assignments_ambiguous.sql` | ✅ Corrección crítica: Ambigüedad en RLS de asignaciones ⭐ NUEVO |
| `145_add_unit_session_to_chunks.sql` | ✅ Vinculación de chunks con unidades y sesiones ⭐ EJECUTADO |
| `144_fix_to_tsvector_regconfig.sql` | ✅ Corrección función RPC: to_tsvector(text, text) does not exist ⭐ NUEVO |
| `143_fix_tutor_rls_policies.sql` | ✅ Políticas RLS para tutor_interactions y student_tutor_performance ⭐ NUEVO |
| `implement_institution_based_roles.sql` | ✅ Sistema de roles basado en instituciones ⭐ NUEVO |
| `fix_enrollments_rls_for_institutions.sql` | ✅ Políticas RLS para enrollments por institución ⭐ NUEVO |
| `fix_users_rls_policies.sql` | ✅ Corrección de políticas RLS de usuarios ⭐ NUEVO |
| `ensure_users_have_institution.sql` | ✅ Verificación de usuarios con institución ⭐ NUEVO |
| `ensure_admin_campus_rls_complete.sql` | ✅ Verificación completa de políticas admin-campus ⭐ NUEVO |
| `verify_and_fix_institution_relationships.sql` | ✅ Verificación de relaciones con instituciones ⭐ NUEVO |
| `crear_tabla_processing_costs.sql` | ✅ Tabla de costos de procesamiento |
| `97_enable_realtime_messaging.sql` | ✅ Realtime para mensajería |
| `96_create_messaging_system.sql` | ✅ Sistema de mensajería |
| `94_course_grading_weights.sql` | ✅ Ponderación de evaluaciones |
| `87_create_unit_session_progress.sql` | ✅ Tracking de progreso |
| `88_create_quizzes_assessments.sql` | ✅ Quizzes y trivias |
| `82_add_student_content_rls.sql` | ✅ RLS para estudiantes |
| `81_migracion_SIMPLE.sql` | ✅ Migración de módulos |

---

## 📝 Guías Rápidas

**Ver:** `INSTRUCCIONES_SISTEMA_TRACKING.md`  
**Leer:** `RESUMEN_SISTEMA_EVALUACION.md`  
**Plan:** `PLAN_IMPLEMENTACION_QUIZZES.md`
**Procesamiento:** `SISTEMA_PROCESAMIENTO_ARCHIVOS_COSTOS.md`
**Archivos Grandes:** `IMPLEMENTACION_ARCHIVOS_GRANDES_900MB.md` ⭐ NUEVO
**Costos:** `ESTRUCTURA_COSTOS_ACTUALIZADA.md`
**Optimizaciones:** `OPTIMIZACIONES_COSTOS_BUSQUEDAS.md`
**Instituciones:** `SISTEMA_ROLES_INSTITUCIONES.md` ⭐ NUEVO
**Admin-Campus:** `PERMISOS_ADMIN_CAMPUS.md` ⭐ NUEVO
**Identificación:** `COMO_IDENTIFICA_INSTITUCION_USUARIO.md` ⭐ NUEVO
**Corrección RLS:** `CORRECCION_RLS_MATERIAL_COURSE_ASSIGNMENTS.md` ⭐ NUEVO
**Visualización Materiales:** `VISUALIZACION_MATERIALES_EN_CURSOS.md` ⭐ NUEVO
**Resumen Correcciones:** `RESUMEN_CORRECCIONES_MATERIALES_ENERO_2025.md` ⭐ NUEVO
**Correcciones Errores Sistema:** `CORRECCIONES_ERRORES_SISTEMA_ENERO_2025.md` ⭐ NUEVO
**Despliegue Cloud Functions:** `GUIA_DESPLIEGUE_CLOUD_FUNCTIONS_V2.md` ⭐ NUEVO
**Permisos Solo Lectura Google Drive:** `IMPLEMENTACION_COMPLETA_PERMISOS_SOLO_LECTURA.md` ⭐ NUEVO

---

**🎉 Proyecto en estado avanzado - Listo para producción**
