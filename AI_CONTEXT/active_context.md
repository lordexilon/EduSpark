# CONTEXTO ACTIVO

> **DOCUMENTO DINÁMICO**: Actualizar al inicio y fin de cada sesión.

**Última actualización:** 2026-02-16 11:30
**Fase Actual:** Rentabilidad (Costos IA) & Cumplimiento Legal (Ley 7593/2025)

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
1. **Despliegue de Edge Function**: Confirmar si `generate-flashcards` ya fue desplegada a Supabase Cloud.
2. **Módulos Universidad Paraguay**: Retomar la vista de malla curricular (`CurriculumGrid.tsx`).

---

## Deuda Técnica
| ID | Fecha | Severidad | Descripción |
|----|-------|-----------|-------------|
| DB-01 | 2026-02-14 | Alta | Ejecutar migraciones SQL de límites y certificados. |
| RAG-02 | 2026-02-03 | **CRÍTICA** | Worker se cae con PDFs grandes (>100MB). |
| IA-01 | 2026-02-14 | Media | Feedback diferido: Los estudiantes no reciben feedback profundo instantáneo (por diseño de ahorro de costos). Evaluar si ciertos perfiles premium deben tenerlo diario. |
