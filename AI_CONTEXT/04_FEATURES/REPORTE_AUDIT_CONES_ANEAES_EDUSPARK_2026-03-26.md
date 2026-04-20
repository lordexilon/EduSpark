# Audit CONES/ANEAES EduSpark (tropicalizacion) - 2026-03-26

## Alcance
Evaluar el sistema EduSpark (web + mobile) contra el marco CONES/ANEAES de “tropicalizacion” descrito en el documento de referencia que mapeo estructura tipo Moodle a nuestro modelo real (jerarquia academica, secciones del aula virtual, configuraciones criticas Paraguay, y evidencia/seguimiento pedagogico).

## Criterios operativos de cumplimiento (segun plan)
- **Cumple**: existe evidencia concreta en UI/servicios y persistencia en BD para secciones, tracking de finalizacion, evidencias de evaluacion, y trazabilidad por periodo.
- **Parcial**: existe el componente pero no se integra en el flujo de curso o falta un gating requerido (por ejemplo por completion vs solo fechas).
- **No cumple**: componente requerido ausente (por ejemplo `gn` real, timezone America/Asuncion, offline-first real).
- **Pendiente**: no se pudo verificar con evidencia directa en el repo durante esta auditoria.

## Checklist por dimension

| Dimension | Resultado | Evidencia clave (rutas) |
|---|---|---|
| A) Jerarquia academica (Facultad/Departamento -> Carrera -> Año -> Semestre -> Catedra) | **Parcial** | `supabase/migrations/20260216_academic_schema.sql` (careers/subjects con `semester`/`year`), `src/pages/Admin/SubjectsPage.tsx` (render year/semester), `src/components/Academic/CurriculumGrid.tsx` (agrupa por año/semestre), `src/pages/Teacher/CreateCoursePage.tsx` (campo `academic_period`) |
| B) Secciones Moodle (Informacion general, Comunicacion, Unidades, Evaluacion) | **Parcial** | `src/pages/Student/CourseViewPage.tsx` (header + descripcion, objetivos unidad, sesiones, evaluaciones por quizzes/examen), `src/pages/Common/AnnouncementsPage.tsx` + `src/services/announcementService.ts` (avisos con `scope=course`), `src/pages/Common/ForumsPage.tsx` (foro), `src/pages/Common/MessagingPage.tsx` + `src/services/messagingService.ts` (conversaciones con `course_id` opcional), `src/pages/Student/AssignmentsPage.tsx` + `src/pages/Student/GradesPage.tsx` (tareas/grades) |
| C) Configuraciones criticas Paraguay | **Parcial** | `src/services/googleCalendarService.ts` y `src/components/Features/SessionEditorModal.tsx` (default `America/Lima`), `src/pages/Student/CourseViewPage.tsx` (gating por `available_from/available_until` y fechas de curso), `src/pages/Student/StudentDashboardPage.tsx` (videollamadas via `session.google_meet_link`) |
| D) Mobile: offline-first y i18n `es` + `gn` | **No cumple** | `eduspark_mobile/lib/screens/webview_screen.dart` (mobile via WebView cargando frontend), `eduspark_mobile/lib/services/data_service.dart` (consultas live a Supabase, sin cache local), `eduspark_mobile/lib/main.dart` (no configura localizaciones) |

## Matriz de mapeo doc -> modulos reales (evidencia)

### A) Jerarquia academica
| Nodo del doc | Entidad/modulo EduSpark | Evidencia | Estado |
|---|---|---|---|
| Facultad/Departamento | **No existe como entidad explicita** | No se hallaron tablas/handlers con `facultad/departamento` | **No cumple** |
| Carrera | `careers` | `supabase/migrations/20260216_academic_schema.sql` (tabla `careers`), `src/pages/Admin/CareersPage.tsx` (gestiona carreras; evidencia indirecta por flujo), `src/services/academicService.ts` (interface `Career`) | **Cumple (parcial por ausencia facultad)** |
| Año | `subjects.year` | `supabase/migrations/20260216_academic_schema.sql` (columna `year`), `src/pages/Admin/SubjectsPage.tsx` (render “Año”) | **Cumple** |
| Semestre | `subjects.semester` | `supabase/migrations/20260216_academic_schema.sql` (columna `semester`), `src/pages/Admin/SubjectsPage.tsx` (render “Semestre”) | **Cumple** |
| Catedra (materia/curso) | `subjects` y `courses` | `src/pages/Admin/SubjectsPage.tsx` (materias), `src/pages/Teacher/CreateCoursePage.tsx` (campo `academic_period` + `subject_id`) | **Cumple (a nivel “materia/curso”)** |

Notas relevantes:
- La “malla” se organiza por `year` y `semester` tanto en BD (`subjects.year/semester`) como en UI (`CurriculumGrid`).
- Falta el nivel superior “Facultad/Departamento” como entidad administrable y rastreable en el modelo.

### B) Aula virtual (secciones tipo Moodle)

| Seccion Moodle | Evidencia EduSpark | Evidencia | Estado |
|---|---|---|---|
| Informacion general (header + programa/silabo + cronograma + bio docente) | Header con titulo/descripcion + datos `subject/career`; cronograma/gating existe por fechas pero no hay un bloque “cronograma” como tal | Header: `src/pages/Student/CourseViewPage.tsx` (seccion “Informacion Academica” muestra `subject.name`/`career.name`) ; Gating por fechas: `src/pages/Student/CourseViewPage.tsx` (`isUnitAvailable/isSessionAvailable/isQuizAvailable`) | **Parcial** (sin bio/cronograma explicitos; el “silabo/programa” esta como material/categoria, no como bloque dedicado) |
| Comunicacion (Avisos, Foros/Consultas, Videoconferencia + Mensajeria) | Avisos (scope por `course/career/role/all`); foros y mensajeria existen globalmente y se puede asociar a curso (pero no necesariamente embebido en el view de curso) | Avisos: `src/pages/Common/AnnouncementsPage.tsx` + `src/services/announcementService.ts` (campo `scope` con `target_course_id` y filtro por inscripcion) ; Mensajeria: `src/pages/Common/MessagingPage.tsx` + `src/services/messagingService.ts` (conversaciones con `course_id` opcional) ; Videollamadas: `src/pages/Student/StudentDashboardPage.tsx` (crea eventos cuando `session.google_meet_link` existe) | **Parcial** (no anclado UI-foro/avisos/msgs dentro del `CourseViewPage`) |
| Unidades de aprendizaje (objetivos + recursos + sesiones) | Se muestra `unit.learning_objectives`, lista de sesiones, y bloque “Evaluaciones (Quizzes)” dentro de cada unidad | `src/pages/Student/CourseViewPage.tsx` (render “Objetivos de Aprendizaje” y “Evaluaciones (Quizzes)”; listado de sesiones dentro de cada unidad) | **Cumple** |
| Evaluacion (tareas/quiz/examen + evidencias) | Quizzes/examen dentro del `CourseViewPage` (tab “modules” y “exercises”); tareas en `AssignmentsPage`; calificaciones en `GradesPage` | `src/pages/Student/CourseViewPage.tsx` (panel “Evaluaciones (Quizzes)” y “Examen Final del Curso” en tab `exercises`); Tareas: `src/pages/Student/AssignmentsPage.tsx`; Calificaciones: `src/pages/Student/GradesPage.tsx` | **Cumple (sin rubricas explicitas)** |

Gaps concretos en secciones:
- “Silabo/Programa” (como bloque explicito de “Informacion general”) no aparece como seccion dedicada; el silabo se modela como una categoria de materiales (p.ej. `syllabus`), pero no se valida como bloque separado en el UI del curso.
- Comunicacion existe, pero la evidencia disponible indica que esta navegada como tab/pagina general (no embebida en el `CourseViewPage`).
- “Rubrica/criterios” no se modelan como campo estructurado (se observa modelo por `points` y descripciones en quizzes/assignments, no rubricas en pagina de creacion).

### C) Configuraciones criticas (Paraguay)

| Requerimiento | Evidencia | Estado |
|---|---|---|
| Zona horaria America/Asuncion | Default `America/Lima` en `src/services/googleCalendarService.ts` (y tambien en `src/services/videoCallService.ts`), y fallback en `src/components/Features/SessionEditorModal.tsx`: `Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'` | **No cumple (gap tecnico)** |
| Idioma i18n `es` + `gn` | En web no se hallo libreria i18n (no matches para `i18next/react-i18next/next-i18next/locales/gn`). Strings en UI aparecen hardcodeadas (ej: textos como “Tablero de Avisos”, etc). En mobile no hay configuracion de localizaciones (`MaterialApp` sin delegados/soporte). | **No cumple** |
| Videoconferencia (Google Meet) | Meet se genera via Google Calendar y se guarda en sesion; se visualiza en dashboard cuando `session.google_meet_link` existe | **Cumple** |
| Acceso condicional por completion | En `CourseViewPage`, gating usa `available_from/available_until` y fallback a fechas del curso; no usa `completion_percentage` como condicion para desbloquear | **No cumple** |

### D) Mobile (offline-first y i18n)

| Requerimiento | Evidencia | Estado |
|---|---|---|
| Offline-first real (cache local + sincronizacion diferida) | El mobile usa `webview_flutter` y carga el frontend remoto (`/mobile`), sin evidencia de cache local de contenido: `eduspark_mobile/lib/screens/webview_screen.dart`. Consultas de datos live a Supabase en `eduspark_mobile/lib/services/data_service.dart` sin capa de cache/local store. | **No cumple** |
| i18n `es` + `gn` | `eduspark_mobile/lib/main.dart` no configura localizaciones ni delegados. Textos en screens hardcodeados en espanol (ej. login y dashboard). | **No cumple** |

## Hallazgos y riesgos de auditoria (ANEAPES/CONES - enfoque practico)
1. **Riesgo alto: timezone incorrecta (America/Lima vs Asuncion)**  
   - Evidencia: `src/services/googleCalendarService.ts`, `src/components/Features/SessionEditorModal.tsx`, `src/services/videoCallService.ts`.  
   - Impacto: desfase en cronograma, ventanas de disponibilidad, y evidencia temporal para trazabilidad.

2. **Riesgo alto: acceso condicional por completion no implementado**  
   - Evidencia: gating por `available_from/available_until` en `src/pages/Student/CourseViewPage.tsx`.  
   - Impacto: no hay control pedagógico por progresion/evidencia previa; contradice el modelo “validacion documental + seguimiento” que se espera.

3. **Riesgo alto: falta i18n `gn` (Guarani) real**  
   - Evidencia: no hay libreria i18n detectable en web (`src`), y mobile sin localizaciones; no se ve estrategia de traduccion/recursos para `gn`.  
   - Impacto: incumplimiento de requerimiento de lenguas para la dimension cultural/identitaria.

4. **Riesgo medio: comunicacion no embebida/ancorada en vista de curso**  
   - Evidencia: `Announcements/Forums/Messaging` existen, pero no se hallan referencias desde `CourseViewPage` a esas secciones.  
   - Impacto: auditoria puede considerar que la seccion “Aula virtual” no refleja el flujo documental completo.

5. **Riesgo medio: “Facultad/Departamento” no existe como entidad**  
   - Evidencia: ausencia de entidad y de tablas/modelos en BD para ese nivel.  
   - Impacto: trazabilidad jerarquica puede verse incompleta respecto al modelo propuesto.

6. **Riesgo medio: “Sílabo/Programa” no aparece como bloque explicito en informacion general**  
   - Evidencia: `syllabus` se maneja como categoria/material; no como seccion propia dentro del bloque de informacion general.  
   - Impacto: la guia didactica puede no estar “documentalmente” visible en el punto de entrada.

7. **Riesgo medio: offline-first no implementado en mobile**  
   - Evidencia: mobile via WebView + datos live a Supabase (`eduspark_mobile/lib/screens/webview_screen.dart`, `eduspark_mobile/lib/services/data_service.dart`).  
   - Impacto: dimension de resiliencia/conectividad (esperada por el marco tropicalizado) no se cumple.

## Recomendaciones priorizadas (cambios minimos primero)
1. **(Prioridad 1) Centralizar timezone de Paraguay (`America/Asuncion`)**  
   - Accion: eliminar defaults `America/Lima` en `src/services/googleCalendarService.ts` y `src/services/videoCallService.ts`, y garantizar que `SessionEditorModal.tsx` use el default correcto.  
   - Beneficio: corrige trazabilidad temporal y sincroniza disponibilidad/calendario.

2. **(Prioridad 2) Implementar gating por completion (no solo fechas)**  
   - Accion: extender condiciones en `CourseViewPage.tsx` para que `isUnitAvailable/isSessionAvailable/isQuizAvailable` puedan evaluar `enrollment.completion_percentage` o evidencias especificas (`unit_progress/session_progress/assessment_attempts`).  
   - Beneficio: alinea seguimiento pedagogico + validez documental por progresion.

3. **(Prioridad 3) i18n `gn` real (web + mobile)**  
   - Accion web: introducir framework (ej. `i18next`) + diccionarios `es`/`gn` y mover strings hardcodeadas a recursos.  
   - Accion mobile: configurar localizaciones en `MaterialApp` + sistema de recursos para `gn` y validar formato de contenido.  
   - Beneficio: elimina gap critico de lenguas.

4. **(Prioridad 4) Embebido/ancaje de Comunicacion dentro del flujo del `CourseViewPage`**  
   - Accion: integrar accesos a avisos/foros/mensajes asociados al `course_id` dentro del aula virtual (tab o seccion).  
   - Beneficio: auditoria ve el “formato tipo Moodle” en el punto de aprendizaje.

5. **(Prioridad 5) Modelar “Facultad/Departamento” en jerarquia (opcional pero recomendado)**  
   - Accion: agregar entidad y relacionar con `careers` (ej. `faculties`/`departments` -> `careers`).  
   - Beneficio: mejora trazabilidad jerarquica.

6. **(Prioridad 6) Refactor de “Guia didactica” como bloque visible en informacion general**  
   - Accion: en `CourseViewPage` agregar seccion “Informacion general” con “Guia/Programa” (material `syllabus` + objetivos de unidad + criterios de evaluacion).  
   - Beneficio: hace visible la evidencia documental en el punto requerido.

7. **(Prioridad 7) Offline-first real en mobile (si se requiere formalmente para auditoria)**  
   - Accion: reemplazar/fortalecer WebView por cache local (Hive/SQLite) o predescarga de recursos (materiales/silabo/videos) con sincronizacion; definir estrategia de conflicto y estado de sincron.  
   - Beneficio: cumple dimension de conectividad y continuidad.

## Evidencia de implementacion (secciones/documentacion verificadas durante la auditoria)
- Jerarquia academica: `supabase/migrations/20260216_academic_schema.sql`, `src/pages/Admin/SubjectsPage.tsx`, `src/components/Academic/CurriculumGrid.tsx`, `src/pages/Teacher/CreateCoursePage.tsx`.
- Secciones del curso (UI): `src/pages/Student/CourseViewPage.tsx` (header/objetivos/sesiones/evaluaciones).
- Comunicacion: `src/pages/Common/AnnouncementsPage.tsx`, `src/services/announcementService.ts`, `src/pages/Common/MessagingPage.tsx`, `src/services/messagingService.ts` (conversaciones con `course_id` opcional).
- Evaluacion: `src/pages/Student/AssignmentsPage.tsx`, `src/pages/Student/GradesPage.tsx`.
- Completion: `src/services/progressService.ts` (persistencia `course_enrollments.completion_percentage`, umbral completado >= 100) y `src/services/videoProgressService.ts` (umbral video >= 90%).
- Gating por fechas: `src/pages/Student/CourseViewPage.tsx`.
- Videoconferencia: `src/pages/Student/StudentDashboardPage.tsx`, `src/components/Features/SessionEditorModal.tsx`, `src/services/googleCalendarService.ts`, `src/services/videoCallService.ts`.
- Mobile offline/i18n: `eduspark_mobile/lib/screens/webview_screen.dart`, `eduspark_mobile/lib/services/data_service.dart`, `eduspark_mobile/lib/main.dart`.

## Estado de este reporte
- Checklist completado y gaps documentados con evidencia de rutas.
- Queda como **pendiente** cualquier validacion adicional de WCAG (accesibilidad) y de la presencia de “rubricas” como modelo formal estructurado (no se observan campos dedicados en las evidencias revisadas).

## Actualizacion implementacion (2026-03-28)
- **Timezone Paraguay:** constante `DEFAULT_TIMEZONE_PARAGUAY` en `src/constants/regional.ts`; reemplazo de defaults `America/Lima` en `src/services/googleCalendarService.ts`, `src/services/videoCallService.ts` y fallback en `src/components/Features/SessionEditorModal.tsx`.
- **Gating por completion (ademas de fechas):** `src/pages/Student/CourseViewPage.tsx` — progresion secuencial de unidades; sesiones previas en la misma unidad; quizzes ligados solo a unidad requieren sesiones de la unidad completadas; examen final (`is_final_exam`) requiere `completion_percentage` >= 75% (constante `MIN_COMPLETION_PERCENT_FOR_FINAL_EXAM`).

## Actualizacion implementacion (2026-03-28 — comunicacion anclada al curso)
- **Vista curso:** bloque «Información general y comunicación» en `src/pages/Student/CourseViewPage.tsx` — cronograma (`start_date`/`end_date` con `America/Asuncion`), materiales categoría sílabo/programa (`syllabus`, `sílabo`, `silabo`, `programa` en `category` o metadata), enlaces a avisos/foros/mensajes con prefijo `/teacher` si el rol es docente/admin-like.
- **Filtro por curso:** query `?courseId=<id>` en `src/pages/Common/AnnouncementsPage.tsx` (avisos por curso + globales), `src/pages/Common/ForumsPage.tsx` (temas con `course_id`), `src/pages/Common/MessagingPage.tsx` (conversaciones con `course_id`; preselección de curso al abrir chat nuevo). Banners con enlace para quitar el filtro.

## Actualizacion implementacion (2026-03-28 — objetivos y criterios en tarjeta)
- **Objetivos:** `course_units.learning_objectives` agrupados por unidad (orden `number` / `order_index`) en la misma tarjeta.
- **Evaluación:** listado de assessments publicados del curso (incluye `assignment` y `project` además de quiz/trivia/exam), con puntos, porcentaje mínimo y descripción breve; alcance por unidad, curso o examen final. Independiente del gating de acceso (documental).
- **Rúbricas:** materiales con categoría/metadata que contenga rúbrica/criterios/evaluación en la misma tarjeta.
- **Guaraní (opcional):** `src/constants/courseViewCardLabels.ts` + `localStorage` clave `eduspark-ui-lang` = `gn` (no sustituye i18n global).

## Actualizacion implementacion (2026-03-28 — selector ES/GN en barra superior)
- `src/hooks/useUiLang.ts`, `src/components/Common/UiLangToggle.tsx`, integrado en `src/components/Common/Header.tsx` (vista estudiante y docente vía `Layout` / `TeacherLayout`).
- `CourseViewPage` reacciona al cambio sin recargar la página.

## Documento relacionado (2026-03-28 — RA y marcos de competencias)
- Linea de producto **Resultados de aprendizaje**, marcos tipo Moodle (CSV), fases A/B/C y trazabilidad con codigo actual: `AI_CONTEXT/04_FEATURES/RESULTADOS_APRENDIZAJE_MARCOS_COMPETENCIAS_EDUSPARK.md`. No duplica el checklist anterior; amplia la dimension evidencia / diseno curricular.

