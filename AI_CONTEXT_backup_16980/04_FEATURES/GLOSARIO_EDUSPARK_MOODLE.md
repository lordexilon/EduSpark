# Glosario de equivalencias EduSpark ↔ Moodle (español)

**Versión:** 1.2  
**Fecha:** 2026-04-15 (verificación rutas import)  
**Propósito:** Alinear el **lenguaje de usuario** e **onboarding** con lo que las instituciones suelen conocer en **Moodle**, sin obligar a renombrar entidades internas del código. Moodle no impone un único vocabulario en todos los sitios; esta tabla es una **guía pragmática** para migración, capacitación y presentaciones.

---

## Estado actual: importación de cursos Moodle

**No hay en EduSpark (repo web actual) un importador de cursos Moodle** que lea backup `.mbz`, `imsmanifest.xml` ni que cree automáticamente **unidades** (`course_units`) ni **sesiones** desde las **secciones / módulos de actividad** de Moodle.

- Hoy el contenido se **crea o edita en EduSpark** (flujo docente: cursos, unidades, sesiones, materiales, evaluaciones en Supabase).
- Lo documentado en `RESULTADOS_APRENDIZAJE_MARCOS_COMPETENCIAS_EDUSPARK.md` (Fase C, CSV de marcos de competencias, etc.) es **roadmap / interoperabilidad futura**, no una pantalla existente.
- La tabla de equivalencias de este glosario sirve para **comunicación y diseño** del futuro importador (mapeo sección Moodle → unidad EduSpark, actividad → assessment, etc.).

**Dónde buscar código cuando exista import:** probablemente un servicio tipo `moodleImportService`, job o función Edge, y tablas de trazabilidad (`external_moodle_id`, etc.); *aún no aplicable.*

### Verificación 2026-04-15: ruta y paridad con Moodle

| Tema | EduSpark hoy | Paridad tipo Moodle (backup `.mbz` / IMS) |
|------|----------------|-------------------------------------------|
| **Ruta web** | `GET /teacher/courses/import` → `CourseImportWizardPage` (`src/routes/TeacherRoutes.tsx`) | No aplica (no es Moodle) |
| **Import estructura curso** | Modos **IA** (texto/programa) y **Excel** (`.xlsx`: hojas Unidades/Sesiones o modo compacto); persiste en `courses` / `course_units` / `sessions` vía servicios en `teacherCourses` | **No** lee `.mbz`, `imsmanifest.xml` ni secciones/actividades Moodle |
| **Export “curso completo”** | Solo **descarga de plantilla Excel** desde el asistente (`Plantilla_Curso_EduSpark_AI.xlsx`); no hay export paquetizado de curso+recursos | Distinto de **Copia de seguridad de curso** o **Exportar IMS** en Moodle |
| **Usuarios / CSV** | Ruta aparte: `/admin/bulk-import` (`BulkUserImportPage`) | Alcance en `IMPORTACION_INSTITUCIONAL_MOODLE_EDUSPARK_EVALUACION.md` |

**Conclusión:** la estructura **pedagógica** importable (unidades → sesiones) es **similar en concepto** a secciones/temas de Moodle, pero el **formato técnico no es Moodle**; es plantilla propia + IA. Un importador Moodle real sería **nuevo desarrollo** (parser + mapeo de actividades/recursos).

---

**Referencias útiles:** formato de curso por secciones/temas en Moodle; actividades vs recursos; marcos de competencias / resultados (plugins y carga CSV según configuración del campus).

---

## 1. Término ambiguo: «módulo»

En **Moodle**, “módulo” suele usarse en dos sentidos:

1. **Técnico:** tipo de plugin (módulo de actividad: `mod_forum`, `mod_quiz`, etc.).
2. **Coloquial:** a veces llaman “módulo” a una **unidad temática**, a una **sección** o incluso a una **actividad**.

**Recomendación para EduSpark:** en textos de usuario, **evitar “módulo” solo**; preferir **unidad**, **sección del curso**, **actividad** o **recurso** según corresponda. Si se usa “módulo”, añadir contexto: *“módulo de actividad (quiz, foro…)”*.

---

## 2. Equivalencias principales (usuario / institución)

| Concepto en **EduSpark** (producto) | Equivalente habitual en **Moodle** | Notas |
|-------------------------------------|-------------------------------------|--------|
| **Carrera** | Categoría de cursos / contexto institucional (no siempre un solo campo) | En Moodle a menudo se refleja con **categorías** anidadas o metadatos; en EduSpark existe `careers`. |
| **Materia / asignatura** (`subjects`) | Contexto de materia vía categoría o nombre de curso | Depende de cómo la institución nombró cursos en Moodle. |
| **Curso** (`courses`) | **Curso** | Misma idea: contenedor del periodo / cohorte. |
| **Unidad** (`course_units`) | **Sección** del curso (formato temas o semanal) o **bloque temático** | En Moodle las secciones agrupan actividades; en EduSpark la **unidad** ordena contenido y objetivos. No es 1:1 mecánico pero **sí** equivalente pedagógico para onboarding. |
| **Sesión** (`sessions`) | Encuentro / clase / semana lógica (según diseño) | Moodle no tiene siempre “sesión” como entidad; suele ser **semana** o **tema**. Explicar: *“sesión = unidad de trabajo dentro de la unidad temática”*. |
| **Material** (archivo, video, enlace, PDF…) | **Recurso** (File, URL, Page, etc.) | Recursos no calificables por defecto. |
| **Evaluación / cuestionario / examen / tarea** (`assessments`) | **Actividades** calificables: Quiz, Assignment, etc. | En Moodle son **course modules** de tipo actividad. |
| **Foro** | `mod_forum` | Actividad participativa. |
| **Avisos** | Anuncios / News forum | Depende de la práctica del campus. |
| **Mensajería** | Mensajería interna de Moodle | Flujos distintos; equivalencia funcional. |
| **Resultado de aprendizaje (RA)** | **Learning outcomes** / marco de competencias del curso o sitio | En Moodle puede integrarse con plugins y **importación CSV** de marcos; mapeo futuro en Fase C del roadmap EduSpark. |

---

## 3. Nombres técnicos en el repositorio (referencia desarrollo)

No es necesario que coincidan con las etiquetas de Moodle; importadores futuros harán **mapping**.

| Entidad / tabla (orientativo) | Rol |
|-------------------------------|-----|
| `courses` | Curso |
| `course_units` | Unidad |
| `sessions` | Sesión |
| `materials` | Materiales |
| `assessments` | Evaluaciones |

---

## 4. Uso en presentación o capacitación

- **Una slide:** “En EduSpark organizamos el curso en **unidades** y **sesiones**; en Moodle suele verse por **secciones** y **actividades/recursos** — es el mismo curso, distinta vista.”
- **Frase corta:** “**Unidad EduSpark** ≈ **sección temática** Moodle; **evaluación** ≈ **actividad calificable**.”

---

## 5. Mantenimiento

Actualizar esta tabla cuando:

- se defina un **importador** desde backup Moodle (`.mbz`) o CSV;
- la institución piloto use nombres propios (“módulo”, “bloque”, “capítulo”).

---

*Documento vivo. Vinculado desde `RESULTADOS_APRENDIZAJE_MARCOS_COMPETENCIAS_EDUSPARK.md` §11.*
