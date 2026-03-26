# Especificación Técnica: Asistente de Gestión e Importación de Cursos

## 🎯 Objetivo General
Permitir a Administradores (global/campus) y Docentes importar de forma eficiente la estructura académica completa de una materia (Materia -> Unidades -> Sesiones). El sistema debe reducir drásticamente el tiempo de carga y eliminar la fricción técnica al mudar currículos desde otros sistemas u orígenes documentales.

## 🔄 Los Dos Flujos Principales

### 1. Importación Directa Mapeada (Flujo Determinista)
Carga masiva a través de un archivo estructurado. Diseñado para migraciones estándar o instituciones que ya usan plantillas Excel.

- **Frontend:**
  - Componente Drag & Drop para subir archivos (`.xlsx`, `.csv`).
  - Previsualización en tabla (Data Grid) antes de importar, permitiendo edición en línea (Ej: corregir un título o el orden de una unidad).
  - Validación en tiempo real (Ej: alerta si falta un nombre de sesión o unidad).
- **Backend:**
  - Uso de biblioteca en el navegador (ej: `xlsx` que ya está instalada en el proyecto) para parsear el archivo y transformarlo a JSON local (sin saturar Supabase).
  - Envío en formato "Bulk" (batch insert) mediante una función RPC o múltiples INSERTS iterativos.

### 2. Generación Asistida con IA (Flujo Inteligente "EduSpark AI")
Generación automática de la estructura académica partiendo de lenguaje natural o documentos no estructurados. Ideal para crear planes de estudio desde cero o estandarizar syllabus escritos en Word/PDF.

- **Frontend:**
  - Input dual: (A) Subir un documento base PDF/Word del programa analítico o (B) Escribir un prompt detallado (Ej: "Materia sobre Algoritmos avanzados de 2 meses, 3 unidades con 4 sesiones de 2 horas cada una").
  - Consola de generación en tiempo real (Spinners y mensajes de contexto).
  - Pantalla de "Revisión y Ajuste": El JSON devuelto se mapea visualmente. El docente aprueba, edita o rechaza la estructura sugerida antes de impactar en la base de datos.
- **Backend (Supabase Edge Function: `generate-course-syllabus`):**
  - Recibe el prompt contextualizado.
  - LLM Prompt Engineering: Instrucciones estrictas (System Prompt) para asegurar que el LLM del modelo (Gemini) devuelva estrictamente una estructura JSON válida que se adapte al esquema de la base de datos.
  - Inyección de Contexto RAG (opcional futuro): Que la IA analice las guías y estándares de la misma institución.

---

## 🏗️ Arquitectura de Base de Datos (Validación)

Para que ambos flujos inserten la información de forma correcta, deben apuntar al siguiente modelo de datos (A validar en la base actual):

1. **Tabla `courses` / `subjects`:** Punto de entrada.
2. **Tabla `course_units`:** Las divisiones macro de la materia.
   - Campos esperados: `course_id`, `title`, `description`, `order`.
3. **Tabla `sessions` (Clases):** El contenido micro a desarrollar.
   - Campos esperados: `unit_id` (o vinculadas al course_id con campo `unit_name`), `title`, `description`, `duration_minutes`.

## 🚀 Plan de Implementación (Fases)

**Fase 1: Preparación Interfaz y Flujo de Importación Directa**
1. Crear interfaz base del Asistente (`CourseImportWizard.tsx`).
2. Programar la lectura y parseo de Excel en el cliente.
3. Crear el servicio de inserción masiva (Batch Service).

**Fase 2: Motor Inteligente (IA)**
1. Desarrollar y desplegar la nueva Edge Function en Supabase (`generate-course-syllabus`).
2. Conectar el Frontend al puerto de IA y parsear respuestas JSON.

**Fase 3: Aislamiento (SCA Compliant)**
1. En ambos flujos, asegurar que bajo el capó las materias/cursos importados guarden irremediablemente el `institution_id` asociado al creador (Aislamiento Multi-Tenant estricto).
