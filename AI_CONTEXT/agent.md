# Agent Constitution: AI Assistant for EduSpark RAG MVP

## Core Mission
Tu misión principal es desarrollar e integrar un Asistente de IA Interactivo (basado en RAG) dentro de la plataforma EduSpark. Debes seguir estrictamente el alcance definido para el Producto Mínimo Viable (MVP), enfocándote en construir una base funcional y escalable.

---

## Technical Stack & Architecture
- **Frontend**: React
- **Orquestación**: n8n
- **Base de Datos Vectorial**: Supabase (PostgreSQL con la extensión `pgvector`)
- **Modelo de IA**: Google Gemini API (`embedContent` para embeddings, `generateContent` para respuestas)

**Flujo Arquitectónico (RAG):**
1.  **Pregunta (Frontend)**: El usuario envía una pregunta desde el componente de chat en React a un webhook de n8n.
2.  **Orquestación (n8n)**: n8n recibe la pregunta.
3.  **Vectorización (n8n -> Gemini)**: n8n llama a la API de Gemini para convertir la pregunta en un vector (embedding).
4.  **Búsqueda (n8n -> Supabase)**: n8n usa este vector para buscar fragmentos de texto relevantes en la base de datos de Supabase.
5.  **Construcción de Prompt (n8n)**: n8n construye un prompt enriquecido que contiene el contexto (los fragmentos recuperados) y la pregunta original del usuario.
6.  **Generación de Respuesta (n8n -> Gemini)**: n8n envía el prompt final a la API de Gemini para generar una respuesta coherente y contextualizada.
7.  **Respuesta (n8n -> Frontend)**: n8n devuelve la respuesta generada al frontend para mostrarla al usuario.

---

## Key Responsibilities (In-Scope)

### Backend (Base de Datos Vectorial)
- **Configuración**: Utilizar una instancia de PostgreSQL en Supabase con la extensión `pgvector`.
- **Esquema de Datos**: Crear una tabla para `course_content_chunks` con `id`, `content`, `embedding` y `course_id`.
- **Función de Búsqueda**: Crear una Edge Function en Supabase para la búsqueda de similitud de cosenos.

### Orquestación (n8n)
- **Workflow 1 (Ingesta de Contenido)**: Un workflow manual que lee un documento, lo divide en fragmentos, genera embeddings con Gemini y los guarda en Supabase.
- **Workflow 2 (Consulta del Alumno)**: Un workflow activado por webhook que implementa el flujo RAG en tiempo real.

### Frontend (React)
- **Nuevo Componente `AsistenteIA.tsx`**: Un componente de chat con historial de sesión, campo de entrada y manejo de estados de carga/error.
- **Servicio de Integración (`ragService.ts`)**: Lógica para llamar al webhook del workflow de consulta de n8n, reemplazando cualquier simulación existente.

---

## Boundaries (Out-of-Scope)
No debes implementar, sugerir ni trabajar en las siguientes áreas para este MVP:
- **Autenticación de Backend Completa**: Continuar usando el sistema de autenticación simulado.
- **Reemplazo del "Generador de Rutas de Aprendizaje"**: Este debe permanecer simulado.
- **Interfaz de Administración para Carga de Cursos**: La ingesta de contenido será manual.
- **Historial de Chat Persistente**: El chat se reinicia al recargar la página.
- **Streaming de Respuestas**: Las respuestas se mostrarán completas, no palabra por palabra.

---

## Plan de Implementación (Alto Nivel)
Sigue estas fases en orden:
1.  **Fase 1**: Configuración del Backend en Supabase.
2.  **Fase 2**: Desarrollo de los Workflows en n8n.
3.  **Fase 3**: Desarrollo del Frontend en React.
4.  **Fase 4**: Integración y Pruebas End-to-End.

---

## Requisitos Previos
Asume que las siguientes herramientas y accesos están disponibles:
- Cuenta de Google Cloud con API de Gemini habilitada.
- Instancia de n8n accesible públicamente.
- Cuenta de Supabase.