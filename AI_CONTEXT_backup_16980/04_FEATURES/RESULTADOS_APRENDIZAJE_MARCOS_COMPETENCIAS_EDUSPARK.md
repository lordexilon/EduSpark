# Resultados de aprendizaje (RA), marcos de competencias e interoperabilidad — EduSpark

**Versión:** 1.2  
**Fecha:** 2026-03-28  
**Estado:** Documento de decisión de producto / arquitectura (no sustituye el checklist de auditoría en `REPORTE_AUDIT_CONES_ANEAES_EDUSPARK_2026-03-26.md`). **§10:** decisiones Fase A en propuesta v1 (validación pendiente). **§11:** glosario Moodle.

---

## 1. Propósito y valor para el proyecto

Este documento fija **por qué** EduSpark debe evolucionar hacia un modelo explícito de **Resultados de Aprendizaje (RA)** y **marcos de competencias**, y **cómo** hacerlo por fases sin romper lo ya construido.

| Valor | Descripción |
|-------|-------------|
| **Normativo (Paraguay)** | Las mallas y programas en educación superior actualizados exigen **resultados observables y medibles**, no solo listas de materias. Una plataforma que **mapee** RA ↔ evidencias ↔ evaluaciones facilita el discurso con universidades y procesos CONES/ANEAES. |
| **Pedagógico** | Se distingue lo que el docente **pretende** (competencia / intención) de lo que el estudiante **demuestra** (resultado observable), alineado a buenas prácticas internacionales. |
| **Producto** | De “repositorio + notas” a **gestión por evidencias**: progreso por RA/competencia, no solo por tareas entregadas. |
| **Interoperabilidad** | Muchas instituciones ya trabajan marcos en **Moodle** (import CSV de competencias, vínculo actividad–RA). Diseñar EduSpark con **compatibilidad conceptual y, más adelante, de importación** reduce costo de onboarding y migración. |

---

## 2. Conceptos alineados (resumen operativo)

### 2.1 Competencia vs Resultado de Aprendizaje

- **Competencia** (marco amplio): perfil del egresado, ámbitos institucionales; puede ser difícil de medir directamente en una sola actividad.
- **Resultado de aprendizaje (RA)**: enunciado **observable y evaluable** (qué hace el estudiante, en qué contexto, con qué nivel).

*Referencia metodológica común:* taxonomía de **Bloom** (niveles cognitivos) y formulación tipo **verbo en infinitivo + contenido + contexto + finalidad** (p. ej. lineamientos Eckstein citados en formación docente). En producto, esto puede implementarse como **plantillas y ayudas en UI** sin forzar fórmula rígida en la v1.

### 2.2 Tipos de competencias (clasificación útil en diseño)

| Tipo | Uso en institución | Notas para EduSpark |
|------|-------------------|---------------------|
| **Profesionales** | Perfil del egresado / carrera | Vinculación a `careers` / malla. |
| **Disciplinares** | Asignaturas de apoyo | Vinculación a `subjects` / cursos. |
| **Transversales** | Valores, ética, trabajo en equipo | Pueden compartirse entre carreras; requieren modelo institucional claro. |

### 2.3 Lógica de Desbloqueo Híbrido (Regla de Oro de UX)

Para garantizar el respeto a la planificación académica y al modelo de competencias, el acceso a contenidos y evaluaciones sigue un modelo de **Doble Llave (Dual-Condition Unlocking)**. Una unidad o sesión solo se considera "Activa" cuando se cumplen **ambas** condiciones:

1.  **Condición Temporal:** La fecha actual es mayor o igual a la fecha de inicio programada (`release_date`).
2.  **Condición Pedagógica:** El estudiante ha aprobado los Resultados de Aprendizaje (RA) vinculados a las etapas previas.

**Estados de la Ruta de Aprendizaje (UX):**

| Escenario | Fecha | RA Previo | **Estado en la App** | **Acción / Mensaje** |
| :--- | :--- | :--- | :--- | :--- |
| **A** | ❌ No ha llegado | ❌ No aprobado | 🔒 **Bloqueado (Futuro)** | "Disponible el [Fecha]" |
| **B** | ✅ Llegó | ❌ No aprobado | ⚠️ **Bloqueado (Pendiente)** | "Completa la evaluación anterior para avanzar" |
| **C** | ❌ No ha llegado | ✅ Aprobado | ⏳ **Bloqueado (En espera)** | "¡Felicidades! Espera a la fecha de inicio" |
| **D** | ✅ Llegó | ✅ Aprobado | ✅ **Activo / Siguiente** | "¡Empezar ahora!" |

*Nota: El contenido de estudio (lecturas, videos) puede permitirse el acceso bajo la condición temporal para fomentar la preparación, pero la **evaluación** queda estrictamente sujeta a la doble llave.*

---

## 3. Trazabilidad con el estado actual del código (2026-03-28)

Lo siguiente **ya existe** y sirve de base; el modelo de RA debe **extender**, no duplicar sin criterio.

| Capacidad actual | Evidencia en repo | Relación con RA futuro |
|-------------------|-------------------|-------------------------|
| Objetivos por unidad | `course_units.learning_objectives`, UI en `src/pages/Student/CourseViewPage.tsx` | Candidato a coexistir con RA: objetivos = micro; RA = medibles a nivel programa/unidad según decisión. |
| Plan de evaluación visible | Mismos assessments en tarjeta de información general | Los **assessments** son el punto natural para **evidenciar** un RA (aprobación / umbral). |
| Progreso y gating | `course_enrollments.completion_percentage`, reglas en `CourseViewPage.tsx` | Progreso por RA puede **derivarse** de reglas sobre intentos aprobados vinculados a RA. |
| Materiales y categorías | `materials.category` / metadata (sílabo, rúbrica) | Evidencias documentales; RA puede enlazarse a materiales o solo a evaluaciones. |
| Jerarquía académica | `careers`, `subjects`, `courses` | Anclaje de marcos a carrera / materia / curso. |

**Fase B (2026-03-28):** existen `learning_outcomes` y `assessment_learning_outcomes` (migración `20260328_learning_outcomes_fase_b.sql`), UI docente y progreso RA en vista estudiante/dashboard. **Brecha restante:** `competency_framework` institucional y Fase C (CSV Moodle / import mallas).

---

## 4. Secciones de producto donde “aterriza” un curso modelo o import

Definir estas secciones reduce discusión infinita en onboarding docente e institucional.

| Sección EduSpark | Contenido esperado | Import / plantilla |
|------------------|---------------------|-------------------|
| Curso | Título, código, fechas, descripción | Metadatos del curso fuente |
| Unidades | Orden, títulos, objetivos | Secciones Moodle → unidades |
| Sesiones | Cronograma fino | Temas por semana / clase |
| Materiales | PDF, video, enlaces, futuro SCORM/H5P/LTI | Recursos |
| Evaluaciones | Quizzes, exámenes, tareas | Actividades calificables |
| Información general (tarjeta) | Sílabo, rúbricas, cronograma, objetivos, plan evaluación | Resumen + categorías de material |
| Comunicación | Avisos, foros, mensajes | Opcional o manual en v1 |

Este mapa es el contrato para **“importar curso modelo”** sin confundir **contenido** con **marco de competencias** (último puede ser CSV o UI admin separada).

---

## 5. Hoja de ruta por fases (recomendada)

### Fase A — Investigación y diseño (obligatoria antes de tablas masivas)

- Cerrar glosario: competencia, RA, evidencia, umbral de logro.
- Decidir granularidad mínima del RA (por curso vs por unidad vs institucional).
- Revisar flujo Moodle: **Importar marcos de competencias** (CSV UTF-8) solo como **referencia de interoperabilidad**, no como compromiso de paridad inmediata.
- **Entregable:** diagrama entidad-relación + decisión de qué se importa en v1.

### Fase B — MVP en EduSpark

- Entidad (o tabla) de **RA** con código, texto, nivel Bloom opcional.
- Tabla de **vínculo** `assessment` ↔ `learning_outcome` (o equivalente).
- **Migración Supabase (Fase B):** `supabase/migrations/20260328_learning_outcomes_fase_b.sql` — aplicar en proyecto antes de usar la UI docente de RA.
- Cálculo derivado: RA “**evidenciado**” cuando el estudiante cumple regla (p. ej. aprobado en assessment vinculado).
- UI docente: asignar RA a evaluaciones; UI estudiante: vista de progreso por RA (mínima).

### Fase C — Interoperabilidad con Moodle

- Import CSV de marcos (mapeo de IDs externos).
- Opcional: export compatible para no encerrar datos en EduSpark.
- Coordinación con roadmap **OVA** (SCORM / H5P / LTI) en `AI_CONTEXT/04_FEATURES/` cuando exista documento específico.

---

## 6. Riesgos si no se documenta o se implementa “a ciegas”

- Campos duplicados (`learning_objectives`, “competencias”, “RA”) sin reglas → refactor costoso.
- Progreso “por competencia” inconsistente con `completion_percentage` actual.
- Expectativa de **paridad Moodle** sin presupuesto de integración → frustración institucional.

Mitigación: este documento + fases A → B → C + actualización de `active_context.md` al cerrar decisiones.

---

## 7. Vínculos con otros documentos

| Documento | Relación |
|-----------|----------|
| `AI_CONTEXT/04_FEATURES/REPORTE_AUDIT_CONES_ANEAES_EDUSPARK_2026-03-26.md` | Auditoría de cumplimiento por dimensiones; este archivo **profundiza** la dimensión pedagógica-evidencia. |
| `AI_CONTEXT/active_context.md` | Estado WIP y referencias a implementaciones recientes (vista curso, idioma, comunicación). |
| `AI_CONTEXT/04_FEATURES/IMPORTACION_INSTITUCIONAL_MOODLE_EDUSPARK_EVALUACION.md` | Evaluación de importación **usuarios, roles, carreras, cursos, matrículas** (Moodle/CSV); orden sugerido y gap de roles contextuales. |

---

## 8. Próximos pasos sugeridos (producto)

1. Validar con 1–2 instituciones piloto: ¿usan Moodle para marcos? ¿CSV actualizado con qué frecuencia?
2. Spike técnico: una tabla `learning_outcomes` + `assessment_learning_outcome` en Supabase (diseño, no obligatorio merge inmediato).
3. ~~Añadir a backlog explícito: “Progreso por RA” en dashboard estudiante~~ — **2026-03-28:** `StudentLearningOutcomesSummary` en `StudentDashboardPage` + `learningOutcomeService.getCoursesRaSummary`.

## 9. Sprint presentación (1 semana) — Fase A + guion

Para preparar una presentación sin bloquear implementación: checklist diario, slides sugeridos y qué demo mostrar del producto actual.

**Ver:** `AI_CONTEXT/04_FEATURES/SPRINT_PRESENTACION_RA_FASE_A_2026.md`

---

## 10. Decisiones Fase A — propuesta v1 del equipo (borrador)

**Estado:** `propuesta` → sustituir por `validada` cuando institución o product owner confirme (fecha en tabla).

Orden de trabajo acordado: **(1)** cerrar/validar esta tabla → **(2)** demo y slides → **(3)** presentación → **(4)** refinamiento UX y alcance incremental (`useUiLang`, etc.). *Fase B (BD + UI RA) ya entregada; no bloquea (1)–(3).*

| Pregunta (Fase A) | Propuesta v1 | Notas |
|-------------------|--------------|--------|
| Alcance del RA en primera implementación | **Curso + unidad.** RA declarables a nivel **curso** (resultados del syllabus) y, cuando aplique, a nivel **unidad** (desglose operativo). | Evita saltar directo solo a “carrera” sin modelo en BD; la carrera sigue anclada vía `subject`/`career` ya existentes. |
| Relación con `learning_objectives` | **Conviven.** Objetivos por unidad = metas de enseñanza locales; **RA** = enunciados **medibles** que se documentan y vinculan a evaluaciones. No reemplazar objetivos en v1. | Reduce conflicto con la UI y datos ya cargados en `course_units.learning_objectives`. |
| Evidencia mínima para considerar un RA logrado | **Primario:** assessment **publicado** vinculado al RA y **aprobado** según reglas del instrumento (`passing_score`, intentos). **Secundario (fases posteriores):** combinación con entregas o rúbricas. | Alineado a `assessments` y `assessment_attempts` actuales. |
| Marco institucional (¿carrera o solo curso?) | **v1 por curso** (y materia); **v2** plantilla por **carrera** (`careers`) reutilizable al crear curso. | Pragmático para pilotos; evita exigir malla institucional completa el día uno. |
| Interoperabilidad Moodle (CSV de marcos) | **Sí como objetivo de Fase C**, después de **Fase B** (RA + vínculos en EduSpark). Prioridad CSV si el piloto ya usa Moodle para competencias. | No bloquea la presentación; se declara en roadmap. |

**Registro de validación**

| Quién valida | Fecha | Cambios respecto a v1 |
|--------------|-------|------------------------|
| Product Owner | 2026-04-11 | Validación de alcance (Curso/Unidad), coexistencia con objetivos y lógica de desbloqueo híbrido (Fecha + RA). |
|--------------|-------|------------------------|

---

## 11. Glosario EduSpark ↔ Moodle

Para onboarding institucional y presentaciones: equivalencias de términos (curso, unidad, sesión, materiales, evaluaciones) y nota sobre el uso ambiguo de **“módulo”** en Moodle.

**Ver:** `AI_CONTEXT/04_FEATURES/GLOSARIO_EDUSPARK_MOODLE.md`

---

*Documento vivo: actualizar fecha y versión al aprobar decisiones de Fase A o al implementar Fase B/C.*
