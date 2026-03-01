# CONTEXTO ACTIVO

> **DOCUMENTO DINÁMICO**: Actualizar al inicio y fin de cada sesión.

**Última actualización:** 2026-03-01 12:12
**Fase Actual:** Consolidación de Rama & Landing Pages Institucionales

---

## 🚀 Consolidación Git & Landing Pages (2026-03-01)

### Acciones Realizadas
- **Rama creada**: `feature/multi-institution-landings` a partir de `feature/graph-rag-experiment`.
- **Workspace limpiado**: Todos los cambios pendientes (~860 tracked + ~305 untracked) fueron committeados y organizados.
- **Archivos de CEC eliminados**: `CEC_Landing_Static.html` y `PROPUESTA_COMERCIAL_CEC_2026.md` removidos (personalización de cliente, no pertenecen al core).
- **Bug fix**: Corregida clave duplicada `calendar_embed_url` en `LandingPageConfigPage.tsx`.
- **Push a GitHub**: Rama subida a `origin/feature/multi-institution-landings`.

### Landing Pages Institucionales (Feature Validado)
- **Enrutamiento**: `PublicRoutes.tsx` → `/:slug` resuelve `InstitutionLandingPage.tsx` dinámicamente.
- **Admin Config**: `LandingPageConfigPage.tsx` permite configurar logo, colores, hero, galería, estudiantes destacados, calendario y contacto por institución.
- **Aislamiento**: `useAuth.tsx` inyecta `institution_id` en contexto global; `useUserInstitution.ts` lo consume.
- **Servicios**: `institutionService.ts` y `landingConfigService.ts` soportan CRUD por slug e institution_id.

---

## 🧭 Refactorización UX del Sidebar (2026-03-01)

### Problema Resuelto
- Existían **2 sidebars duplicados** (`Sidebar.tsx` + `TeacherSidebar.tsx`) con ~200 líneas de `MenuItemComponent` copiado/pegado.
- El menú de `admin` tenía **17 items** en un solo grupo de Administración.
- `TeacherSidebar.tsx` tenía la configuración de menú hardcodeada inline.
- "Tareas" y "Calificaciones" estaban como items sueltos en teacher pero agrupados en student.

### Cambios Realizados
1. **Extraído `MenuItemComponent`** a `src/components/Common/Sidebar/MenuItemComponent.tsx` (componente compartido).
2. **Unificado `MenuConfig.ts`** como fuente única de verdad para TODOS los roles (student, teacher, admin, admin-campus, coordinator, supervisor).
3. **Reorganizado el menú Admin** de 1 grupo con 17 items → 4 sub-grupos temáticos:
   - Usuarios y Acceso (6 items)
   - Institución y Académico (5 items)
   - Reportes y Costos (5 items)
   - Control IA + Configuración (4 items)
4. **Agrupado "Tareas" y "Calificaciones"** dentro de "Evaluaciones" en el sidebar de teacher.
5. **Separador visual mejorado** con líneas gradiente para la sección de Administración.
6. **Iconos diferenciados**: `IconBuilding` para Institución, `IconBrain` para Tutor IA items, `IconGlobe` para Landing Page, etc.

### Archivos Modificados
- `src/components/Common/Sidebar/MenuItemComponent.tsx` (NUEVO)
- `src/components/Common/Sidebar/MenuConfig.ts` (REESCRITO)
- `src/components/Common/Sidebar.tsx` (REFACTORIZADO)
- `src/components/Common/TeacherSidebar.tsx` (REFACTORIZADO)

---

## 4. Rentabilidad & Cumplimiento (2026-02-16 Mañana)

### 4.1 Costos & Rendimiento
- **Prompt Caching**: Implementado en `ragService.ts` para contextos > 100k chars. Cache TTL de 1h. Reduce drásticamente costos en consultas repetitivas de RAG.
- **Vector Search**: Migración creada para índice HNSW (`20260216_optimize_vectors.sql`).

### 4.2 Dashboard de Control IA
- **Costos por Usuario**: Nueva tabla `AIUsageStatsTable` en panel administrativo.
- **Riesgo Académico**: Vista `StudentsRiskTable` para identificar alumnos con bajo progreso y alto consumo (ineficiencia).

### 4.3 Privacidad y Datos (Ley 7593)
- **Derecho al Olvido**: "Zona de Peligro" en `ProfilePage` permite a usuarios solicitar eliminación de cuenta.
- **Auditoría**: Sistema de logs (`auditService.ts`) integrado en acciones críticas.
- **Base de Datos**: Migración `20260216_privacy_compliance.sql` con campos de consentimiento y tabla `audit_logs`.

---

## 🤖 IA Cost Control & Logros (2026-02-14 Noche)

### 1. Sistema de Control de Costos IA ("Grifo de Tokens")
- **Database**: Creada tabla `ai_limits` y lógica RPC (`check_ai_request_eligibility`, `log_ai_usage`).
- **Backend**: Integrada verificación de límites en `aiService.ts`. Cada llamada a Gemini ahora valida presupuesto disponible.
- **AI Control Panel**: Nueva interfaz administrativa en `/admin/ai-usage` (o `/admin/ai-control`) para gestionar límites globales, institucionales y por usuario. Permite el "Hard Stop" del servicio.

### 2. Ciclo de Evaluación Semanal
- **Optimización de Costos**: Se desactivó el auto-rating instantáneo en el chat del tutor.
- **Tutor Weekly Analysis**: Implementado servicio que consolida interacciones y genera reportes los viernes (reducción proyectada de ~70% en tokens de análisis).
- **UI**: Nuevo componente `TutorWeeklyReport` integrado en el panel de contenido del curso.

### 3. Certificados Digitales
- **Generación Automática**: Implementado `certificateService.ts` usando `jsPDF`.
- **Emisión**: Botón dinámico en `CourseContentPanel` que se habilita solo al alcanzar el 100% de progreso.
- **Verification**: Sistema de códigos únicos almacenados en `digital_certificates` para validación.

### 4. Refactorización UI
- **Vanilla Tailwind**: Refactorizados `TutorWeeklyReport.tsx` y `CertificateButton.tsx` a vanilla Tailwind para asegurar compatibilidad y velocidad de carga, eliminando dependencias de componentes UI externos.

---

## 📊 Mejoras en Dashboard & Tutor (2026-02-16)
- **Tutor Virtual**: Corregido problema de "amnesia" por truncado de contexto. Se aumentó el límite de 600 a 5000 caracteres por fuente y se expandió el `maxContextLength` a 32,000 para soportar unidades académicas densas (especialmente en Medicina).
- **Terminología Educativa**: Unificación de términos. El Tutor IA ahora usa obligatoriamente "Unidades" y "Sesiones" en lugar de "Módulos", alineándose con el frontend.
- **Conectividad**: Mejorada la inicialización del tutor con carga real de títulos de cursos desde DB y botón de reintento manual en UI.
- **Admin UI**: Habilitada configuración de "Slugs" en gestión de instituciones para landing pages personalizadas.
- **Segmentación por Campus (2026-02-16)**: Implementado aislamiento de avisos y mensajería por `institution_id`. Core fix en `useAuth.tsx` para inyectar la institución en el contexto global, resolviendo errores de carga y acceso administrativo a landing pages multiorganización. Ver `docs/features/SEGMENTACION_CAMPU_LANDING_COMMS.md`.

---

## 🛡️ Seguridad & Aislamiento (2026-02-19 Tarde)
- **RLS Cleanup**: Ejecutada migración `20260219_final_rls_cleanup.sql` que elimina políticas antiguas y centraliza el aislamiento institucional en `careers`, `subjects`, `courses`, `assessments`, `flashcards` y `users`.
- **AI Quiz Generation**: Implementado sistema de generación automática de quizzes.
    - Code: Backend (Edge Function `generate-flashcards`), Frontend Service (`aiService.ts`), UI (`QuizBuilderPage.tsx`).
    - Estado: Código base completado, pendiente confirmar despliegue de Edge Function.

## 📝 PRÓXIMOS PASOS
1. **Merge a main**: Evaluar crear PR de `feature/multi-institution-landings` → `main` cuando se validen todos los cambios consolidados.
2. **Despliegue de Edge Function**: Confirmar si `generate-flashcards` ya fue desplegada a Supabase Cloud.
3. **Módulos Universidad Paraguay**: Retomar la vista de malla curricular (`CurriculumGrid.tsx`).
4. **Testing Landing Pages**: Verificar landing por slug en producción tras merge.

---

## Deuda Técnica
| ID | Fecha | Severidad | Descripción |
|----|-------|-----------|-------------|
| DB-01 | 2026-02-14 | Alta | Ejecutar migraciones SQL de límites y certificados. |
| RAG-02 | 2026-02-03 | **CRÍTICA** | Worker se cae con PDFs grandes (>100MB). |
| IA-01 | 2026-02-14 | Media | Feedback diferido: Los estudiantes no reciben feedback profundo instantáneo (por diseño de ahorro de costos). Evaluar si ciertos perfiles premium deben tenerlo diario. |
