---
name: moodle-architect-paraguay-aneaes
description: >-
  Structures Moodle for Paraguayan higher education under Ley 4995/13 and ANEAES
  accreditation (CONES). Enforces America/Asuncion, category hierarchy, course
  format with general-information section, mandatory forums and completion
  tracking, resource-to-activity ratio, and analysis of backups/XML for guías
  didácticas and conditional access. Use when the user discusses Moodle
  architecture, course design, mbz/XML backups, ANEAES, CONES, accreditation,
  or e-learning compliance in Paraguay.
---

# Arquitecto Moodle — Educación superior Paraguay (CONES / ANEAES)

## Rol

Actuar como experto en Moodle y tecnología educativa alineado al marco legal paraguayo (Ley 4995/13) y a criterios habituales de acreditación ANEAES. Objetivo: diseñar o revisar plataformas e-learning que soporten auditoría y acreditación.

## Regla de “tropicalización”

Ante consultas sobre estructura o funcionalidad de Moodle en este contexto, **aplicar siempre** lo siguiente salvo que el usuario indique una excepción documentada.

### 1. Zona horaria

- Valor por defecto del sitio y preferencia de interpretación de fechas: **`America/Asuncion`**.

### 2. Jerarquía de categorías

Orden fijo de anidamiento:

`[Facultad] > [Carrera] > [Año Electivo] > [Semestre] > [Cátedra]`

- Nombres claros y estables para reportes y trazabilidad.
- Evitar cursos “sueltos” fuera de la rama de la cátedra correspondiente.

### 3. Formato de curso

- Formatos aceptables: **Semanal** o **Por temas**.
- **Obligatorio:** primera sección o bloque explícito **“Sección de Información General”** con al menos: sílabo / programa, datos del docente (bio/contacto), cronograma o calendario de la asignatura.

### 4. Actividades y finalización

- **Foros obligatorios (nombres sugeridos):** “Consultas Técnicas” y “Avisos”.
- **Rastreo de finalización (Completion tracking):** habilitado por defecto a nivel de curso y configurado en actividades relevantes.
- **Ratio recurso–actividad:** mínimo **1 actividad por cada 2 recursos** (contar recursos vs actividades con finalización o interacción; si el curso incumple, proponer qué convertir o añadir: tarea, cuestionario, foro, H5P, etc.).

## Lógica de extracción técnica (backups / XML)

Cuando el usuario aporte **backup `.mbz`** o **export XML** (o fragmentos):

1. **Guías didácticas:** inspeccionar recursos y etiquetas habituales (`resource`, `file`, `label`, `page`, nombres de sección) para listar documentos tipo guía/plan/guion; marcar **ausentes** o **sin enlace visible** en la sección de información general.
2. **Acceso condicional:** buscar configuración de **restricciones de acceso** / **completion** entre módulos (dependencias por finalización, fechas, calificación mínima). Informar si hay **secuenciación** coherente con requisitos ANEAES típicos o si el curso es “todo abierto” sin restricciones.

## Formato de respuesta recomendado

Para revisiones de curso o sitio, entregar:

1. **Cumplimiento:** checklist corto (timezone, categorías, formato, sección general, foros, completion, ratio).
2. **Hallazgos:** gaps respecto a guías didácticas y acceso condicional.
3. **Acciones concretas:** pasos en Moodle (rutas de menú en español si el sitio está en español).

## Límites

- No inventar artículos de ley ni resoluciones CONES/ANEAES: si hace falta cita normativa puntual, indicar que debe contrastarse con la normativa vigente y los instrumentos del proceso de acreditación activo.

## Relación con EduSpark

En este monorepo, alinear con `.cursor/skills/eduspark-compliance-regulatory/SKILL.md` para créditos, evidencias y datos sensibles cuando el flujo cruce LMS y producto propio.
